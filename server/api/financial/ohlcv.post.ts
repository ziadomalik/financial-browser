import { defineEventHandler, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the query parameter from the request
        const query = getQuery(event)
        const body = await readBody(event).catch(() => ({}))

        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl

        // Add timestamp to ensure fresh data
        const timestamp = body.timestamp || query.timestamp || Date.now()
        const forceRefresh = body.forceRefresh || query.forceRefresh || true

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Making request to ${apiBaseUrl}/ohlcv with params:`, {
                ...query,
                timestamp,
                forceRefresh
            })
        }

        try {
            // Make the request to the actual API
            const response = await $fetch(`${apiBaseUrl}/ohlcv`, {
                method: 'POST',
                query: {
                    ...query,
                    timestamp, // Add timestamp to avoid caching
                    forceRefresh // Force backend to refresh data
                },
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'x-request-timestamp': `${timestamp}`,
                    'x-force-refresh': `${forceRefresh}`
                },
                body: {
                    ...body,
                    timestamp,
                    forceRefresh
                },
                timeout: 15000,
            })

            if (process.dev) {
                console.log(`[Financial API Proxy] Received response from API`)
            }

            // Add timestamp to response for debugging
            return {
                ...(typeof response === 'object' ? response : { data: response }),
                _timestamp: timestamp,
                _forceRefresh: forceRefresh
            }
        } catch (error: any) {
            // Enhanced error handling, particularly for 422 errors
            if (error.status === 422) {
                console.error(`[Financial API Proxy] 422 Unprocessable Entity Error:`, error.message || error)
                console.error(`[Financial API Proxy] This usually means the API rejected the query format or content.`)

                // Create a more descriptive error response with potential solutions
                return {
                    statusCode: 422,
                    statusMessage: 'Error fetching historical price data',
                    message: `The financial data service rejected the historical price data request. This could be due to:
1. The API service may be experiencing issues
2. The query format may be invalid
3. The API may be temporarily unavailable`,
                    error: true,
                    isTimeout: false,
                    apiDetails: {
                        endpoint: `${apiBaseUrl}/ohlcv`,
                        query: query.query,
                        timestamp
                    },
                    messages: [
                        {
                            type: 'error',
                            content: `The API service is currently unable to process this historical price data request. Please try a different query or try again later.`
                        }
                    ],
                    _timestamp: timestamp
                }
            }

            // Log the error in development
            if (process.dev) {
                console.error(`[Financial API Proxy] Error:`, error.message || error)
            }

            // Provide a more user-friendly error
            return {
                statusCode: error.status || 500,
                statusMessage: 'Error fetching data from financial service',
                message: error.message || 'An unexpected error occurred',
                error: true,
                _timestamp: timestamp, // Include timestamp in error response too
                messages: [
                    {
                        type: 'error',
                        content: `API Error: ${error.message || 'An unexpected error occurred while fetching historical price data'}`
                    }
                ]
            }
        }
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
            error: true,
            _timestamp: Date.now(), // Include timestamp in error response too
            messages: [
                {
                    type: 'error',
                    content: `API Error: ${error.message || 'An unexpected error occurred while fetching historical price data'}`
                }
            ]
        }
    }
}) 