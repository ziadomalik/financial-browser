import { defineEventHandler } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl || 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'

        // Add timestamp and forceRefresh parameters
        const timestamp = Date.now()
        const forceRefresh = true
        const model = 'gpt-4' // Add model parameter

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Checking connectivity with ${apiBaseUrl}/query`)
            console.log(`  Query: ping`)
            console.log(`  Timestamp: ${timestamp}`)
            console.log(`  Force refresh: ${forceRefresh}`)
            console.log(`  Model: ${model}`)
            console.log(`  Headers: accept: application/json, content-type: application/json, x-request-timestamp: ${timestamp}, x-force-refresh: ${forceRefresh}`)
            console.log(`  Body: ${JSON.stringify({ query: 'ping', timestamp, forceRefresh, model })}`)
        }

        // Make the request to the actual API
        const response = await $fetch(`${apiBaseUrl}/query`, {
            method: 'POST',
            query: {
                query: 'ping',
                timestamp,
                forceRefresh,
                model
            },
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'x-request-timestamp': `${timestamp}`,
                'x-force-refresh': `${forceRefresh}`
            },
            body: {
                query: 'ping',
                timestamp,
                forceRefresh,
                model
            },
            timeout: 10000, // Increased timeout for connectivity check
            retry: 1, // Add one retry for robustness
        })

        if (process.dev) {
            console.log(`[Financial API Proxy] Connectivity check succeeded`)

            // Type assert response as Record<string, any> to fix linter errors
            const typedResponse = response as Record<string, any>
            console.log(`  Response type: ${typeof response}`)
            console.log(`  Response keys: ${typeof response === 'object' && response ? Object.keys(typedResponse).join(', ') : 'N/A'}`)
            console.log(`  Has messages: ${!!(typedResponse.messages && Array.isArray(typedResponse.messages))}`)
            console.log(`  Message count: ${typedResponse.messages?.length || 0}`)

            // Log request details that succeeded
            console.log(`[Financial API Proxy] Successful ping request details:`)
            console.log(`  Request method: POST`)
            console.log(`  Request URL: ${apiBaseUrl}/query?query=ping&timestamp=${timestamp}&forceRefresh=${forceRefresh}&model=${model}`)
            console.log(`  Request headers: accept: application/json, content-type: application/json, x-request-timestamp: ${timestamp}, x-force-refresh: ${forceRefresh}`)
            console.log(`  Request body: ${JSON.stringify({ query: 'ping', timestamp, forceRefresh, model })}`)
        }

        return {
            ...(typeof response === 'object' ? response : { data: response }),
            _timestamp: timestamp,
            _forceRefresh: forceRefresh
        }
    } catch (error: any) {
        // Log the error in development
        if (process.dev) {
            console.error(`[Financial API Proxy] Connectivity check failed:`, error.message || error)
            console.error(`[Financial API Proxy] Error details:`, {
                status: error.status,
                message: error.message,
                data: error.data,
                response: error.response
            })
        }

        // Return a more structured error response that mimics the API response structure
        return {
            statusCode: error.status || 500,
            statusMessage: 'API connectivity check failed',
            message: error.message || 'Could not connect to the financial service',
            error: true,
            isTimeout: error.message && error.message.includes('timeout'),
            _timestamp: Date.now(),
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