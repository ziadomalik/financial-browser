import { z } from 'zod'
import { generateObject, tool } from 'ai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import FirecrawlApp from '@mendable/firecrawl-js'
import { visualizationQueue, connection } from '../socket/queryPlanner'
import { defineEventHandler, getQuery } from 'h3'

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

        const response = await $fetch(`${apiBaseUrl}/searchwithcriteria?query=${encodeURIComponent(queryString)}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: {},
            timeout: 30000,
        })

        console.log(`(filterCompaniesByCriteria) Done`)

        return response
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

        const response = await $fetch(`${apiBaseUrl}/summary`, {
            method: 'POST',
            query: { query },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: {},
            timeout: 30000,
        })

        console.log(`(getCompanyStockSummary) Done`)

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


        const response = await $fetch(`${apiBaseUrl}/companydatasearch?query=${queryString}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json'
            },
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

        const response = await $fetch(`${apiBaseUrl}/ohlcv`, {
            method: 'POST',
            query: {
                query,
                first,
                last
            },
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json',
            },
            body: {},
            timeout: 30000,
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

        const { apiBaseUrl } = useRuntimeConfig()
        const { firecrawlApiKey } = useRuntimeConfig()

        // Initialize Firecrawl client
        const firecrawl = new FirecrawlApp({
            apiKey: firecrawlApiKey
        })

        try {
            // Get crawl queries
            const { queries } = await createCrawlQueries(query)

            // Process the first query for immediate results
            if (queries.length > 0) {
                const q = queries[0]

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
            } else {
                console.log(`(getCurrentNews) No queries generated`)
                return { findings: [] }
            }
        } catch (error) {
            console.error(`(getCurrentNews) Error:`, error)
            return {
                findings: [{
                    title: "Error retrieving news",
                    teaser: "Error occurred",
                    details: `Failed to retrieve news: ${error instanceof Error ? error.message : String(error)}`
                }]
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

    // Determine if this is a search query from the search bar
    const isSearchQuery = context?.currentAction?.includes('User searched for:') || false;

    if (isSearchQuery) {
        console.log('[ProcessFinancialQuery] Processing as search query with immediate results');
    }

    try {
        // Prepare system prompt based on context (if provided)
        let systemPrompt = `
            You are a helpful assistant that can filter companies by certain criteria and retrieve basic stock information.
            You take the user queries and also enhance them to use more specific and accurate language.
            Return your findings to the user in an easy to understand format.

            You are able to run only the most relevant tool call per query. Only one!
        `

        // Add context information if provided (for query planner use case)
        if (context?.recentActions?.length || context?.currentAction) {
            systemPrompt += `
            User recent actions: ${context.recentActions?.join(', ') || 'None'}
            Current action: ${context.currentAction || 'None'}
            
            Based on these interactions, determine what information might be most relevant to the user (what does he want to know) and what tools you should call.
            
            For each tool you want to call, provide to most appropriate query fitting the tools input schema.
            `
        }

        // Extract user ID from context if available
        const userId = context?.currentAction ? context.currentAction.split(':')[0] : 'anonymous';

        // Create initial "loading" notification
        if (isSearchQuery) {
            try {
                // Simple loading notification
                const loadingData = {
                    userId,
                    visualizationData: {
                        userId,
                        query,
                        text: `Processing search for "${query}"`,
                        toolResults: [],
                        adaptiveCards: [],
                        timestamp: Date.now(),
                        isPartialVisualization: true,
                        isSearchQuery: true
                    },
                    timestamp: Date.now()
                };

                // Publish loading state - no complex Redis storage
                await connection.publish('partial-visualization-update', JSON.stringify(loadingData));
                console.log('[ProcessFinancialQuery] Notified clients of search start');
            } catch (err) {
                console.error('[ProcessFinancialQuery] Error publishing loading state:', err);
            }
        }

        // Generate text with tool calls
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
            maxSteps: 1
        });

        // Process each step immediately for visualization
        for (const step of steps) {
            if (step.toolResults && step.toolResults.length > 0) {
                try {
                    // Publish this tool result immediately
                    const toolResult = step.toolResults[0];
                    const toolName = toolResult.toolName || 'unknown';

                    // Simple data object with minimal processing
                    const resultData = {
                        userId,
                        visualizationData: {
                            userId,
                            query,
                            text: `Results from ${toolName}`,
                            toolResults: [toolResult],
                            adaptiveCards: [],
                            timestamp: Date.now(),
                            isPartialVisualization: true,
                            toolName
                        },
                        timestamp: Date.now()
                    };

                    // Publish this immediately - no Redis or job tracking
                    await connection.publish('partial-visualization-update', JSON.stringify(resultData));
                    console.log(`[ProcessFinancialQuery] Published ${toolName} result`);
                } catch (err) {
                    console.error('[ProcessFinancialQuery] Error publishing tool result:', err);
                }
            }
        }

        // Extract all tool results for the final response
        const toolResults = steps.flatMap(step => step.toolResults || []);

        // Immediately publish the complete result
        try {
            // Complete notification - with "done" flag
            const completeData = {
                userId,
                visualizationData: {
                    userId,
                    query,
                    text,
                    toolResults,
                    adaptiveCards: [],
                    timestamp: Date.now(),
                    isComplete: true
                },
                timestamp: Date.now(),
                query,
                searchComplete: true // Flag to reset loading states
            };

            // Publish complete result with "reset loading" flag
            await connection.publish('visualization-complete', JSON.stringify(completeData));
            console.log('[ProcessFinancialQuery] Published completion notification');

            // Also send a visualization update to ensure UI refreshes
            await connection.publish('visualization-updates', JSON.stringify({
                userId,
                timestamp: Date.now(),
                searchComplete: true
            }));

        } catch (err) {
            console.error('[ProcessFinancialQuery] Error publishing complete result:', err);
        }

        // Return the complete result data
        return {
            text,
            toolResults,
            searchComplete: true
        }
    } catch (error) {
        console.error('[ProcessFinancialQuery] Error generating response:', error)

        // Even on error, publish a completion to reset the UI state
        try {
            await connection.publish('visualization-complete', JSON.stringify({
                userId: context?.currentAction ? context.currentAction.split(':')[0] : 'anonymous',
                error: true,
                timestamp: Date.now(),
                searchComplete: true
            }));
        } catch (err) {
            console.error('[ProcessFinancialQuery] Error publishing error state:', err);
        }

        return {
            error: true,
            message: 'Failed to process your request',
            details: error instanceof Error ? error.message : String(error),
            searchComplete: true
        }
    }
}

export default defineEventHandler(async (event) => {
    const { query } = getQuery(event)
    console.log('[Six] Query: ', query)

    // Use the centralized function for the API endpoint
    return await processFinancialQuery(query as string)
})
