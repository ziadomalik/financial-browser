import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import FirecrawlApp from '@mendable/firecrawl-js'

const FirecrawlQuerySchema = z.object({
  prompt: z.string().describe('The prompt for the bot to crawl the sites'),
  relevantSites: z.array(z.string()).describe('The sites the bot will crawl'),
})

// Replace your current result schemas with a more comprehensive one
const FirecrawlResultSchema = z.object({
  // Core article data
  title: z.string().optional().describe('Title or headline of the content'),
  content: z.string().describe('Main textual content or summary'),
  sourceUrl: z.string().url().describe('Source URL of the content'),
  
  // Publication details
  source: z.string().optional().describe('Publication or website name'),
  author: z.string().optional().describe('Author of the content'),
  publicationDate: z.string().optional().describe('When the content was published'),
  
  // Additional metadata
  headline: z.string().optional().describe('Alternative headline'),
  summary: z.string().optional().describe('Brief summary of the content')
})

const createCrawlQueriesPrompt = `
  The user is querying a browser that can crawl the web for financial information and news.
  Your task is to generate a structured object following the FirecrawlQuerySchema:
  
  1. Create a clear, specific 'prompt' string that will guide the web crawler
  2. Provide an array of 'relevantSites' (URLs) that are most likely to contain valuable financial information related to the query
  
  The process works like this:
  1. The user types in a financial query or information need
  2. You analyze this query and determine the best crawl strategy
  3. The system will use your output to crawl these sites and return data from various sources
  4. The crawled data should include both directly relevant information and contextually useful related content
  5. All results should support the user's inferred financial research goals
  
  Focus on financial news sites, company investor relations pages, market data sources, and other authoritative financial information sources.
`

const createCrawlQueries = async (query: string) => {
  const { object } = await generateObject({
    model: openai('gpt-4-turbo'),
    schema: z.object({ queries: z.array(FirecrawlQuerySchema).describe('10 queries to crawl the web') }),
    prompt: createCrawlQueriesPrompt + '\n Here is the user query: ' + query,
  });

  console.log(object)

  return object
}

export default defineEventHandler(async (event) => {
  const { firecrawlApiKey } = useRuntimeConfig()
  const queryValue = getQuery(event)
  const { query } = queryValue
  
  // Enable SSE headers
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')
  
  // Initialize Firecrawl client
  const firecrawl = new FirecrawlApp({
    apiKey: firecrawlApiKey
  })

  // Create a writable to send SSE events
  const { writable, readable } = new TransformStream()
  const writer = writable.getWriter()
  event.node.res.writeHead(200)
  
  // Process in the background and stream results
  streamSSE(event, async () => {
    try {
      // Get crawl queries
      const { queries } = await createCrawlQueries(String(query))
      
      // Send initial queries to the client
      await writer.write(`data: ${JSON.stringify({ event: 'queries', data: queries })}\n\n`)
      
      // Process each query in parallel
      const extractionPromises = queries.map(async (q, index) => {
        try {
          // Send status update
          await writer.write(`data: ${JSON.stringify({ 
            event: 'status', 
            data: { index, status: 'processing', prompt: q.prompt } 
          })}\n\n`)
          
          // Extract data using Firecrawl with the Zod schema converted to JSON Schema
          const result = await firecrawl.extract(
            q.relevantSites, 
            { 
              prompt: q.prompt,
              schema: z.object({ findings: z.array(z.object({ title: z.string(), teaser: z.string().describe('Extremely short, couple word teaser'), details: z.string().describe('A longer description of the finding') })) })
            }
          )
          
          // Send result
          await writer.write(`data: ${JSON.stringify({ 
            event: 'result', 
            data: { index, prompt: q.prompt, result } 
          })}\n\n`)
          
          return result
        } catch (error: any) {
          // Send error
          await writer.write(`data: ${JSON.stringify({ 
            event: 'error', 
            data: { index, prompt: q.prompt, error: error.message } 
          })}\n\n`)
          
          return null
        }
      })
      
      // Wait for all extractions to complete
      const results = await Promise.all(extractionPromises)
      
      // Send completion event
      await writer.write(`data: ${JSON.stringify({ event: 'complete', data: results })}\n\n`)
      
      // Close the stream
      await writer.close()
    } catch (error: any) {
      // Send error and close
      await writer.write(`data: ${JSON.stringify({ event: 'error', data: error.message })}\n\n`)
      await writer.close()
    }
  })
  
  return readable
})

// Helper function to stream SSE
function streamSSE(event: any, callback: any) {
  const { res } = event.node
  
  callback().catch((error: any) => {
    console.error('SSE error:', error)
    res.end()
  })
  
  // Handle client disconnect
  res.on('close', () => {
    res.end()
  })
}
