import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getSimplifiedAdaptiveCardSchema } from '../utils';

export default defineEventHandler(async (event) => {
    try {
        //  Query: Text & Raw Data: Tool call results.
        const { query, rawData } = await readBody(event) as { query?: string, rawData: object }

        if (!rawData) {
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
                            text: `Results for: ${query || 'Unknown query'}`,
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
                            text: JSON.stringify(rawData, null, 2),
                            wrap: true,
                            isSubtle: true
                        }
                    ]
                }
            ];
        }

        const response = await streamObject({
            model: openai('gpt-4o'),
            output: 'array',
            schema,
            prompt: `
            Based on the user query and the raw data, 
            generate some adaptive cards to show in a dynamic dashbord.

            User Query: ${query}
            Raw Data: ${JSON.stringify(rawData)}

            The adaptive cards should be succinct, read-only and simple.`
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