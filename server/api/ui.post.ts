import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getSimplifiedAdaptiveCardSchema } from '../utils';

export default defineEventHandler(async (event) => {
    //  Query: Text & Raw Data: Tool call results.
    const { query, rawData } = await readBody(event) as { query?: string, rawData: object }
    
    if (!rawData) {
        return {
            error: 'No raw data provided'
        }
    }

    const schema = await getSimplifiedAdaptiveCardSchema()
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
})