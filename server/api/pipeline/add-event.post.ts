import { addUserEvent } from '../../socket/queryPlanner';
import { z } from 'zod';

// Define the event schema
const EventSchema = z.object({
    userId: z.string(),
    eventType: z.enum(['click', 'zoom', 'voice', 'hover', 'navigation']),
    eventData: z.any()
});

export default defineEventHandler(async (event) => {
    try {
        // Read the request body
        const body = await readBody(event);

        // Log the received request for debugging
        console.log('[API] Received event add request:', JSON.stringify(body, null, 2));

        // Validate the request data
        const validatedData = EventSchema.parse(body);

        // Add the event to the pipeline
        const jobId = await addUserEvent(validatedData.userId, {
            eventType: validatedData.eventType,
            eventData: validatedData.eventData
        });

        console.log(`[API] Event added to pipeline successfully with job ID: ${jobId}`);

        // Return success response
        return {
            success: true,
            message: 'Event added to pipeline',
            jobId
        };
    } catch (error) {
        console.error('[API] Error adding event to pipeline:', error);

        // Return error response
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: true
        };
    }
}); 