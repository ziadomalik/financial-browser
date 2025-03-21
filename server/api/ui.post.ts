import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getSimplifiedAdaptiveCardSchema } from '../utils';

export default defineEventHandler(async (event) => {
    try {
        // Extended payload with flags for incremental visualization
        const { userQuery, toolCallJsonResult, isPartial, stepNumber, isNew, replaceExisting } =
            await readBody(event) as {
                userQuery?: string,
                toolCallJsonResult: object,
                isPartial?: boolean,
                stepNumber?: number,
                isNew?: boolean,
                replaceExisting?: boolean
            };

        // For a new search with no results yet, return an empty array
        if (isNew && (!toolCallJsonResult || (Array.isArray(toolCallJsonResult) && toolCallJsonResult.length === 0))) {
            console.log('[UI API] New search started, returning empty cards');
            return [];
        }

        if (!toolCallJsonResult) {
            return {
                error: true,
                message: 'No raw data provided'
            }
        }

        const schema = await getSimplifiedAdaptiveCardSchema()

        // Generate a basic default schema if the schema couldn't be loaded
        if (!schema) {
            console.error('Could not load schema, using fallback');
            return [
                {
                    type: "AdaptiveCard",
                    version: "1.0",
                    body: [
                        {
                            type: "TextBlock",
                            text: `Results for: ${userQuery || 'Unknown userQuery'}`,
                            weight: "bolder",
                            size: "medium"
                        },
                        {
                            type: "TextBlock",
                            text: "Could not generate adaptive card. Please try again later.",
                            wrap: true
                        },
                        {
                            type: "TextBlock",
                            text: JSON.stringify(toolCallJsonResult, null, 2),
                            wrap: true,
                            isSubtle: true
                        }
                    ]
                }
            ];
        }

        // Customize the prompt based on whether this is a partial or complete result
        let promptText = '';

        if (isPartial) {
            promptText = `
                Based on the user query and this PARTIAL result (tool call #${stepNumber || 1}), 
                generate ONE adaptive card to show the specific information from this individual tool call.
                
                Mark this card with a special badge or indicator that shows it's a partial result.
                The card should have a distinctive header indicating which tool was called.
                
                This card will be added to any existing cards, so focus only on this specific piece of information.
                
                User query: ${userQuery}
                Partial Tool Result #${stepNumber || 1}: ${JSON.stringify(toolCallJsonResult)}
                
                The adaptive card should be succinct, read-only and simple. 
                It should clearly indicate it's showing partial results from a specific tool call.
            `;
        } else if (replaceExisting) {
            promptText = `
                Based on the user query and the COMPLETE tool call results,
                generate adaptive cards to replace any partial results shown earlier.
                
                These cards should be comprehensive and show all the key information from the combined tool calls.
                
                User query: ${userQuery}
                Complete Results: ${JSON.stringify(toolCallJsonResult)}
                
                The adaptive cards should be succinct, read-only and simple.
                They should clearly summarize all the information available from the different tools.
            `;
        } else {
            promptText = `
                Based on the user query and the raw data, 
                generate some adaptive cards to show in a dynamic dashboard.

                User query: ${userQuery}
                Raw Data: ${JSON.stringify(toolCallJsonResult)}

                The adaptive cards should be succinct, read-only and simple.
            `;
        }

        console.log(`[UI API] Generating ${isPartial ? 'partial' : 'complete'} visualization${isNew ? ' (new search)' : ''}${replaceExisting ? ' (replacing existing)' : ''}`);

        const response = await streamObject({
            model: openai('gpt-4o'),
            output: 'array',
            schema,
            prompt: promptText
        })

        return response.toTextStreamResponse()

    } catch (error) {
        console.error('Error in UI API:', error);
        return {
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
        }
    }
})