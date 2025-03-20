import { defineEventHandler, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the query parameter from the request
        const query = getQuery(event)
        const body = await readBody(event).catch(() => { })

        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl || 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Making request to ${apiBaseUrl}/query with query:`, query.query)
        }

        // Make the request to the actual API - use empty object as body
        const response = await $fetch(`${apiBaseUrl}/query`, {
            method: 'POST',
            query: query, // Pass through all query parameters
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: {}, // Empty JSON object instead of empty string
            timeout: 30000, // Increased timeout to 60 seconds for complex queries
            retry: 2, // Add retry capability
        })

        if (process.dev) {
            console.log(`[Financial API Proxy] Received response from API`)
        }

        return response
    } catch (error: any) {
        // Log the error in development
        if (process.dev) {
            console.error(`[Financial API Proxy] Error:`, error.message || error)
        }

        // Create a more structured error response
        return {
            statusCode: error.status || 500,
            statusMessage: 'Error fetching data from financial service',
            message: error.message || 'An unexpected error occurred',
            error: true,
            // Include a special flag for timeout errors to help the UI handle them better
            isTimeout: error.message && error.message.includes('timeout'),
            // Return a mock data structure that the frontend can recognize as an error
            messages: [
                {
                    type: 'error',
                    content: `API Error: ${error.message || 'An unexpected error occurred'}`
                }
            ]
        }
    }
}) 