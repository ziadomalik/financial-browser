import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
    try {
        // Get the path to the schema file
        const schemaPath = path.resolve(process.cwd(), 'public/schemas/adaptive-card.json')

        // Read the schema file
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8')

        // Parse and return the schema
        return JSON.parse(schemaContent)
    } catch (error) {
        console.error('Error serving adaptive card schema:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to serve adaptive card schema'
        })
    }
}) 