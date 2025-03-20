import { z } from 'zod'
import { tool } from 'ai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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
        const { apiBaseUrl } = useRuntimeConfig().public

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

        const { apiBaseUrl } = useRuntimeConfig().public

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
                getCompanyStockSummary
            },
            toolChoice: 'required',
            system: systemPrompt,
            prompt: query,
            maxSteps: 1,
        })

        return {
            text,
            toolResults: steps.flatMap(step => step.toolResults || []),
        }
    } catch (error) {
        console.error('[ProcessFinancialQuery] Error generating response:', error)
        return {
            error: 'Failed to process your request',
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
