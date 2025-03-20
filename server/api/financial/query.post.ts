import { defineEventHandler, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    try {
        // Get the query parameter from the request
        const query = getQuery(event)
        const body = await readBody(event).catch(() => ({}))

        // Get the API base URL from runtime config
        const config = useRuntimeConfig()
        const apiBaseUrl = config.public.apiBaseUrl || 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'

        // Extract parameters from the body or query
        const queryText = body.query || query.query
        const timestamp = body.timestamp || query.timestamp || Date.now()
        const forceRefresh = body.forceRefresh || query.forceRefresh || true
        // Add a model parameter, which is commonly required for AI APIs
        const model = body.model || query.model || 'gpt-4'

        // Log the request details in development
        if (process.dev) {
            console.log(`[Financial API Proxy] Making request to ${apiBaseUrl}/query with:`)
            console.log(`  Query: ${queryText}`)
            console.log(`  Timestamp: ${timestamp}`)
            console.log(`  Force refresh: ${forceRefresh}`)
            console.log(`  Model: ${model}`)
            console.log(`  Headers: accept: application/json, content-type: application/json, x-request-timestamp: ${timestamp}, x-force-refresh: ${forceRefresh}`)
            console.log(`  Body: ${JSON.stringify({ query: queryText, timestamp, forceRefresh, model })}`)
        }

        try {
            // Make the request to the actual API
            const response = await $fetch(`${apiBaseUrl}/query`, {
                method: 'POST',
                query: {
                    query: queryText,
                    timestamp: timestamp,
                    forceRefresh: forceRefresh,
                    model: model
                },
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'x-request-timestamp': `${timestamp}`,
                    'x-force-refresh': `${forceRefresh}`
                },
                body: {
                    query: queryText,
                    timestamp: timestamp,
                    forceRefresh: forceRefresh,
                    model: model
                },
                timeout: 30000, // Increased timeout to 30 seconds for complex queries
                retry: 2, // Add retry capability
            })

            if (process.dev) {
                console.log(`[Financial API Proxy] Received response from API:`)
                console.log(`  Response type: ${typeof response}`)
                // Type assert response as Record<string, any> to fix linter errors
                const typedResponse = response as Record<string, any>
                console.log(`  Response keys: ${typeof response === 'object' && response ? Object.keys(typedResponse).join(', ') : 'N/A'}`)
                console.log(`  Status code/message: ${typedResponse.statusCode || 'none'}/${typedResponse.statusMessage || 'none'}`)
                console.log(`  Has messages: ${!!(typedResponse.messages && Array.isArray(typedResponse.messages))}`)
                console.log(`  Message count: ${typedResponse.messages?.length || 0}`)
                if (typedResponse.error) {
                    console.log(`  Error: ${typedResponse.error}`)
                    console.log(`  Error message: ${typedResponse.message || 'No message'}`)
                }
            }

            // Add the timestamp to the response to help with debugging
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

                // Attempt to extract error details more completely
                interface ErrorDetails {
                    status: any;
                    message: any;
                    data: any;
                    validationErrors?: any[];
                    responseValidationErrors?: any[];
                }

                let errorDetails: ErrorDetails = {
                    status: error.status,
                    message: error.message,
                    data: error.data
                }

                // Try to extract the array of validation errors
                if (error.data?.detail && Array.isArray(error.data.detail)) {
                    console.error(`[Financial API Proxy] Validation errors:`, JSON.stringify(error.data.detail, null, 2))
                    errorDetails.validationErrors = error.data.detail
                }

                // Also try to extract from response._data if available
                if (error.response?._data?.detail && Array.isArray(error.response._data.detail)) {
                    console.error(`[Financial API Proxy] Response validation errors:`, JSON.stringify(error.response._data.detail, null, 2))
                    errorDetails.responseValidationErrors = error.response._data.detail
                }

                // Log full error details
                console.error(`[Financial API Proxy] Error details:`, errorDetails)
                console.error(`[Financial API Proxy] Request body:`, { query: queryText, timestamp, forceRefresh })

                // Create a more descriptive error response with potential solutions
                return {
                    statusCode: 422,
                    statusMessage: 'Error fetching data from financial service',
                    message: `The financial data service rejected the request. This could be due to:
1. The API service may be experiencing issues
2. The query format may be invalid
3. The API may be temporarily unavailable`,
                    error: true,
                    isTimeout: false,
                    apiDetails: {
                        endpoint: `${apiBaseUrl}/query`,
                        query: queryText,
                        timestamp,
                        errorDetail: error.data?.detail || error.response?._data?.detail || 'No detailed error information available'
                    },
                    messages: [
                        {
                            type: 'error',
                            content: `The API service is currently unable to process this request. Please try a different query or try again later.`
                        }
                    ]
                }
            }

            // Log the error in development
            if (process.dev) {
                console.error(`[Financial API Proxy] Error:`, error.message || error)
                console.error(`[Financial API Proxy] Error details:`, {
                    status: error.status,
                    message: error.message,
                    data: error.data,
                    response: error.response
                })
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