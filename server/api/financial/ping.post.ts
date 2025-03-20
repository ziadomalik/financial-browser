import { defineEventHandler } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl || 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Checking connectivity with ${apiBaseUrl}/query?query=ping`)
        }

        // Make the request to the actual API
        const response = await $fetch(`${apiBaseUrl}/query`, {
            method: 'POST',
            query: { query: 'ping' },
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: {}, // Empty JSON object
            timeout: 10000, // Increased timeout for connectivity check
            retry: 1, // Add one retry for robustness
        })

        if (process.dev) {
            console.log(`[Financial API Proxy] Connectivity check succeeded`)
        }

        return response
    } catch (error: any) {
        // Log the error in development
        if (process.dev) {
            console.error(`[Financial API Proxy] Connectivity check failed:`, error.message || error)
        }

        // Return a more structured error response that mimics the API response structure
        return {
            statusCode: error.status || 500,
            statusMessage: 'API connectivity check failed',
            message: error.message || 'Could not connect to the financial service',
            error: true,
            // Return a mock message structure that the frontend can recognize
            messages: [
                {
                    type: 'error',
                    content: 'Financial API connectivity check failed'
                }
            ]
        }
    }
}) 