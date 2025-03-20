export default defineEventHandler(async (event) => {
    //  Query: Text & Raw Data: Tool call results.
    const { query, rawData } = await readBody(event) as { query?: string, rawData: object }
    
    if (!rawData) {
        return {
            error: 'No raw data provided'
        }
    }

    const schema = await $fetch('http://adaptivecards.io/schemas/adaptive-card.json')
    return schema
})