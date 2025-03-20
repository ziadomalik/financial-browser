import { Server, Socket } from 'socket.io';
import { useRuntimeConfig } from '#imports';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
// Import the centralized query processor function
import { processFinancialQuery } from '../api/six-data.get';

// In-memory event queue
interface UserEvent {
    userId: string;
    eventType: string;
    eventData: any;
    timestamp: number;
    processed: boolean;
    description?: string;
}

// In-memory storage (replace with a more robust solution in production)
const eventQueues: Record<string, UserEvent[]> = {};
const activeConnections: Record<string, string> = {}; // userId -> socketId mapping

// Event types schema
const EventSchema = z.object({
    eventType: z.enum(['click', 'zoom', 'voice', 'hover', 'navigation']),
    eventData: z.any(),
});

// Process events in parallel with a worker queue
const processEventQueue = async (userId: string) => {
    // Skip if no events to process or already processing
    if (!eventQueues[userId] || eventQueues[userId].length === 0) return;

    // Take up to 5 unprocessed events
    const eventsToProcess = eventQueues[userId]
        .filter(e => !e.processed)
        .slice(0, 5);

    if (eventsToProcess.length === 0) return;

    // Mark events as being processed
    eventsToProcess.forEach(event => {
        event.processed = true;
    });

    // Process each event in parallel
    await Promise.all(eventsToProcess.map(processEvent));
};

// Process a single event
const processEvent = async (event: UserEvent): Promise<void> => {
    try {
        // Convert event to human-readable description
        const description = await generateEventDescription(event);
        event.description = description;

        // Add to query planning queue if appropriate
        if (shouldPlanQuery(event)) {
            await planQuery(event);
        }
    } catch (error) {
        console.error(`Error processing event: ${error}`);
        event.processed = false; // Mark for retry
    }
};

// Generate a human-readable description of an event
const generateEventDescription = async (event: UserEvent): Promise<string> => {
    try {
        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: `
        Convert this user interaction event into a short human-readable description:
        Event type: ${event.eventType}
        Event data: ${JSON.stringify(event.eventData)}
        
        Format: Return ONLY a brief, 1-line description of what the user did.
      `,
            maxTokens: 50,
        });

        return text.trim();
    } catch (error) {
        console.error('Error generating event description:', error);
        return `User ${event.eventType} event at ${new Date(event.timestamp).toISOString()}`;
    }
};

// Determine if this event should trigger a query plan
const shouldPlanQuery = (event: UserEvent): boolean => {
    // Logic to determine if this event should trigger query planning
    // For now, only let search events and certain clicks trigger queries
    return ['click'].includes(event.eventType) &&
        event.description !== undefined;
};

// Plan and execute a query based on user events
const planQuery = async (event: UserEvent): Promise<void> => {
    try {
        // Get the socket ID for this user
        const socketId = activeConnections[event.userId];
        if (!socketId) return;

        // Get a list of recent event descriptions for context
        const recentEvents = eventQueues[event.userId]
            .filter(e => e.description)
            .slice(-5)
            .map(e => e.description || ''); // Ensure no undefined values

        // Use the centralized function to process the query with context
        const result = await processFinancialQuery(
            // The prompt is derived from the event description
            `What financial data should I retrieve based on the user's current interaction: "${event.description}"?`,
            // Pass context about recent actions and current action
            {
                recentActions: recentEvents,
                currentAction: event.description
            }
        );

        // Send the planned query results back to the client
        io.to(socketId).emit('query-result', {
            event: event.description,
            result: result.text,
            toolResults: result.toolResults || [],
        });
    } catch (error) {
        console.error(`Error planning query: ${error}`);
    }
};

// Interval to process event queues (every 2 seconds)
setInterval(() => {
    Object.keys(eventQueues).forEach(userId => {
        processEventQueue(userId);
    });
}, 2000);

// Socket.io setup
let io: Server;

export default function (nuxtSocketIo: any) {
    // Initialize Socket.io server
    io = nuxtSocketIo.io;

    // Socket.io connection handler
    io.on('connection', (socket: Socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Authenticate connection
        socket.on('authenticate', async (data: { userId: string, token: string }) => {
            try {
                // Verify user authentication (using Supabase or your auth system)
                // This is a simplified example - implement proper auth validation!
                const isAuthenticated = true; // Replace with actual auth check

                if (isAuthenticated) {
                    // Store connection
                    const { userId } = data;
                    activeConnections[userId] = socket.id;

                    // Initialize event queue if needed
                    if (!eventQueues[userId]) {
                        eventQueues[userId] = [];
                    }

                    // Join user-specific room
                    socket.join(`user:${userId}`);
                    socket.emit('authenticated', { success: true });

                    console.log(`User ${userId} authenticated`);
                } else {
                    socket.emit('authenticated', {
                        success: false,
                        error: 'Authentication failed'
                    });
                    socket.disconnect(true);
                }
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('authenticated', {
                    success: false,
                    error: 'Authentication error'
                });
                socket.disconnect(true);
            }
        });

        // Handle user events
        socket.on('user-event', async (data: {
            userId: string,
            eventType: string,
            eventData: any
        }) => {
            try {
                // Validate event data
                const { userId, eventType, eventData } = data;

                // Validate socket is authenticated for this user
                if (activeConnections[userId] !== socket.id) {
                    return socket.emit('event-error', {
                        error: 'Unauthorized event'
                    });
                }

                // Validate event type
                const validationResult = EventSchema.safeParse({ eventType, eventData });
                if (!validationResult.success) {
                    return socket.emit('event-error', {
                        error: 'Invalid event data',
                        details: validationResult.error
                    });
                }

                // Add event to queue
                const userEvent: UserEvent = {
                    userId,
                    eventType,
                    eventData,
                    timestamp: Date.now(),
                    processed: false
                };

                eventQueues[userId].push(userEvent);

                // Keep only last 50 events
                if (eventQueues[userId].length > 50) {
                    eventQueues[userId] = eventQueues[userId].slice(-50);
                }

                // Acknowledge receipt
                socket.emit('event-received', {
                    success: true,
                    eventId: userEvent.timestamp
                });
            } catch (error) {
                console.error('Error handling user event:', error);
                socket.emit('event-error', {
                    error: 'Failed to process event'
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);

            // Remove from active connections
            const userId = Object.keys(activeConnections).find(
                key => activeConnections[key] === socket.id
            );

            if (userId) {
                delete activeConnections[userId];
            }
        });
    });
} 