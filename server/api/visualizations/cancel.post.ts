import { defineEventHandler, readBody } from 'h3'
import { visualizationQueue } from '../../socket/queryPlanner'

/**
 * API endpoint to cancel all pending visualization jobs for a specific user
 */
export default defineEventHandler(async (event) => {
    try {
        // Read request body to get user ID
        const { userId } = await readBody(event)

        if (!userId) {
            return {
                statusCode: 400,
                body: { error: 'Missing required userId parameter' }
            }
        }

        console.log(`[Visualization Cancel] Cancelling visualization jobs for user ${userId}`)

        // Get all waiting jobs
        const waitingJobs = await visualizationQueue.getWaiting(0, 100)
        const activeJobs = await visualizationQueue.getActive()
        const allJobs = [...waitingJobs, ...activeJobs]

        let cancelCount = 0

        // Find and remove jobs for this user
        for (const job of allJobs) {
            try {
                // If job data contains this user ID
                if (job.data && job.data.userId === userId) {
                    await job.remove()
                    cancelCount++
                }
            } catch (err) {
                console.error(`[Visualization Cancel] Error removing job ${job.id}:`, err)
            }
        }

        console.log(`[Visualization Cancel] Successfully cancelled ${cancelCount} jobs for user ${userId}`)

        // Publish a notification that jobs were cancelled
        const connection = await visualizationQueue.client
        await connection.publish('visualization-cancelled', JSON.stringify({
            userId,
            cancelCount,
            timestamp: Date.now()
        }))

        return {
            statusCode: 200,
            body: {
                message: `Successfully cancelled ${cancelCount} visualization jobs`,
                cancelCount
            }
        }
    } catch (error) {
        console.error('[Visualization Cancel] Error:', error)
        return {
            statusCode: 500,
            body: {
                error: 'Failed to cancel jobs',
                message: error instanceof Error ? error.message : String(error)
            }
        }
    }
}) 