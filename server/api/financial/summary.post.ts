import { defineEventHandler, getQuery } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the query parameter from the request
        const query = getQuery(event)

        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Making request to ${apiBaseUrl}/summary with query:`, query.query)
        }

        // Make the request to the actual API
        const response = await $fetch(`${apiBaseUrl}/summary`, {
            method: 'POST',
            query: query,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: {}, // Empty JSON object
            timeout: 15000,
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

        // Provide a more user-friendly error
        return {
            statusCode: error.status || 500,
            statusMessage: 'Error fetching data from financial service',
            message: error.message || 'An unexpected error occurred',
        }
    }
}) 