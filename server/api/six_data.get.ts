import { z } from 'zod'
import { generateObject, tool } from 'ai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import FirecrawlApp from '@mendable/firecrawl-js'

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

const FirecrawlQuerySchema = z.object({
    prompt: z.string().describe('The prompt for the bot to crawl the sites'),
    relevantSites: z.array(z.string()).describe('The sites the bot will crawl'),
})

const createCrawlQueries = async (query: string) => {
    const { object } = await generateObject({
        model: openai('gpt-4-turbo'),
        schema: z.object({ queries: z.array(FirecrawlQuerySchema).describe('10 queries to crawl the web') }),
        prompt: createCrawlQueriesPrompt + '\n Here is the user query: ' + query,
    });

    console.log(object)

    return object
}

export const filterCompaniesByCriteria = tool({
    description: `Get a list of companies filtered by certain criteria.`,
    parameters: z.object({
        query: z.array(z.object({
            criteria: z.string().describe('The criteria to filter the companies by'),
            value: z.string().describe('The value of the criteria')
        })).describe(`
        Search with criteria. Query is a string with a dict schema like: '{"criteria": "logical value"}'.
        For example: '{"ebitda": "is positive", "employees": "more than 10000"}'.
        The query record can have multiple criteria. 
        `)
    }),
    async execute({ query }) {
        const { apiBaseUrl } = useRuntimeConfig()

        const queryString = JSON.stringify(
            query.reduce((acc: Record<string, string>, q) => {
                acc[q.criteria] = q.value;
                return acc;
            }, {})
        );

        try {

            // Add headers for authentication
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            const response = await $fetch(`${apiBaseUrl}/searchwithcriteria?query=${encodeURIComponent(queryString)}`, {
                method: 'POST',
                headers,
                body: {},
                timeout: 30000,
            })

            console.log(`(filterCompaniesByCriteria) Done`)

            return response

        } catch (error) {
            console.error(`(filterCompaniesByCriteria) Error:`, error)

            // Create a friendly error response 
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Failed to filter companies by criteria',
            }
        }
    }
})

export const getCompanyStockSummary = tool({
    description: `This tools retrieves basic, rudimentry information about a company's stock.`,
    parameters: z.object({
        query: z.string().describe('The name of the company to search')
    }),
    async execute({ query }) {
        console.log(`(getCompanyStockSummary) Making Request`)

        const { apiBaseUrl } = useRuntimeConfig()

        // Add headers for authentication
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const response = await $fetch(`https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io/summary?query=${encodeURIComponent(query)}`, {
            method: 'POST',
            headers,
            body: {},
            timeout: 30000,
        })

        console.log(`(getCompanyStockSummary) Done`)
        console.log('Response:', response)
        console.log('API Base URL:', apiBaseUrl)

        return response
    }
})

export const getCompanyData = tool({
    description: `
    This tool is useful when you need information about one or more companies, such as employee numbers, 
    market or financial information, ratios, fundamentals, etc. 
    `,
    parameters: z.object({
        query: z.array(z.object({
            companyName: z.string().describe('The name of the company to search'),
            informationToRetrieve: z.array(z.string()).describe('Short string saying the information to retrieve about the company'),
            year: z.number().describe('The year of the information to retrieve')
        }))
    }),
    async execute({ query }) {
        console.log(`(getCompanyData) Making Request`)

        const { apiBaseUrl } = useRuntimeConfig()
        // Convert the query array into a JSON string format
        // Format: {"company1": "information to retrieve|yyyyQq"; "company2": "information to retrieve|yyyy"}
        const queryObj: Record<string, string> = {}

        for (const item of query) {
            const yearStr = item.year.toString()
            const infoWithYear = `${item.informationToRetrieve.join(', ')}|${yearStr}`
            queryObj[item.companyName] = infoWithYear
        }

        const queryString = encodeURIComponent(JSON.stringify(queryObj).replace(/,/g, ';'))

        console.log(`(getCompanyData) Query String: ${queryString}`)

        // Add headers for authentication
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        };

        const response = await $fetch(`${apiBaseUrl}/companydatasearch?query=${queryString}`, {
            method: 'POST',
            headers,
            body: {},
            timeout: 32000,
        })

        console.log(`(getCompanyData) Done`)

        return response
    }
})

export const getHistoricalStockPrice = tool({
    description: `This tool is useful when you need information about a company's stock price history.`,
    parameters: z.object({
        query: z.string().describe('The name of the company to search'),
        first: z.string().optional().describe('The first date of the stock price history to retrieve in dd.mm.yyyy format.'),
        last: z.string().optional().describe('The last date of the stock price history to retrieve in dd.mm.yyyy format.'),
    }),
    async execute({ query, first, last }) {
        console.log(`(getHistoricalStockPrice) Making Request`)

        const { apiBaseUrl } = useRuntimeConfig()

        // Add headers for authentication
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-type': 'application/json',
        };

        const response = await $fetch(`${apiBaseUrl}/ohlcv`, {
            method: 'POST',
            query: {
                query,
                first,
                last
            },
            headers,
            body: {},
            timeout: 15000,
        })

        console.log(`(getHistoricalStockPrice) Done`)

        return response
    }
})

export const getCurrentNews = tool({
    description: `This tool is useful when you need information about the latest news about a company.`,
    parameters: z.object({
        query: z.string().describe('A search query to retrieve the latest news about a company')
    }),
    async execute({ query }) {
        console.log(`(getCurrentNews) Making Request`)

        const { firecrawlApiKey } = useRuntimeConfig()

        try {
            // Initialize Firecrawl client
            const firecrawl = new FirecrawlApp({
                apiKey: firecrawlApiKey
            })

            // Get crawl queries
            const { queries } = await createCrawlQueries(query)

            // Process the first query for immediate results
            if (queries.length > 0) {
                const q = queries[0]

                try {
                    // Extract data using Firecrawl with the Zod schema
                    const result = await firecrawl.extract(
                        q.relevantSites,
                        {
                            prompt: q.prompt,
                            schema: z.object({
                                findings: z.array(z.object({
                                    title: z.string(),
                                    teaser: z.string().describe('Extremely short, couple word teaser'),
                                    details: z.string().describe('A longer description of the finding')
                                }))
                            })
                        }
                    )

                    console.log(`(getCurrentNews) Done`)
                    return result
                } catch (extractError) {
                    console.error(`(getCurrentNews) Extraction Error:`, extractError)

                    // Return generic error
                    return {
                        error: true,
                        message: `Failed to extract news: ${extractError.message}`,
                        findings: []
                    }
                }
            } else {
                console.log(`(getCurrentNews) No queries generated`)
                return { findings: [] }
            }
        } catch (error) {
            console.error(`(getCurrentNews) Error:`, error)

            return {
                error: true,
                message: `Failed to retrieve news: ${error instanceof Error ? error.message : 'Unknown error'}`,
                findings: []
            }
        }
    }
})

// Centralized function for processing financial queries via AI
export async function processFinancialQuery(query: string, context?: {
    recentActions?: string[],
    currentAction?: string
}) {
    console.log('[ProcessFinancialQuery] Query: ', query)
    console.log('[ProcessFinancialQuery] Context: ', context)

    try {
        // Prepare system prompt based on context (if provided)
        let systemPrompt = `
            You are a helpful assistant that can filter companies by certain criteria and retrieve basic stock information.
            You take the user queries and also enhance them to use more specific and accurate language.
            Return your findings to the user in an easy to understand format.
            DO NOT COMBINE THE TOOLS AT ALL, YOU DECIDE ON A TOOL, YOU'RE DONE.
        `

        // Add context information if provided (for query planner use case)
        if (context?.recentActions?.length || context?.currentAction) {
            systemPrompt += `
            User recent actions: ${context.recentActions?.join(', ') || 'None'}
            Current action: ${context.currentAction || 'None'}
            
            Based on these interactions, determine if you should:
            1. Search for companies by criteria
            2. Get company stock summary information
            
            Choose the most appropriate query based on the user's actions.
            `
        }

        const { text, steps } = await generateText({
            model: openai('gpt-4o-mini'),
            tools: {
                filterCompaniesByCriteria,
                getCompanyStockSummary,
                getHistoricalStockPrice,
                getCompanyData,
                getCurrentNews
            },
            toolChoice: 'required',
            system: systemPrompt,
            prompt: query as string,
            maxSteps: 1,
        })

        // Extract tool results
        const toolResults = steps.flatMap(step => step.toolResults || [])

        return {
            text,
            toolResults,
        }

    } catch (error) {
        console.error('[ProcessFinancialQuery] Error generating response:', error)

        return {
            error: true,
            message: 'Failed to process your request',
            details: error instanceof Error ? error.message : String(error)
        }
    }
}

export default defineEventHandler(async (event) => {
    const { query } = getQuery(event)
    console.log('[Six] Query: ', query)

    // Use the centralized function for the API endpoint
    return await processFinancialQuery(query as string)
})
