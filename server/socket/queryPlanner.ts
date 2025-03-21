// @ts-ignore - Module will be installed later
import { z } from 'zod';
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
// @ts-ignore - Module will be installed later
import { Queue, Worker, QueueEvents, Job } from 'bullmq';
// @ts-ignore - Module will be installed later
import IORedis from 'ioredis';
// Import $fetch from ofetch for server-side usage
import { $fetch } from 'ofetch';
// Import the centralized query processor function
import { processFinancialQuery } from '../api/six-data.get';

// Type declarations for linter
type JobError = Error & { message: string };

// Redis connection configuration - Using Upstash Redis
export const connection = new IORedis("rediss://default:AZZ3AAIjcDFkMjgwYTY3NTgyN2M0NDhiOTM1N2JkYzQzNTVkODEwMHAxMA@super-colt-38519.upstash.io:6379", {
    maxRetriesPerRequest: null,
});

// Read UI base URL from environment or use default
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3000';

// ==========================================
// QUEUE DEFINITIONS FOR THREE-STAGE PIPELINE
// ==========================================

// Queue configuration
const DEFAULT_JOB_TIMEOUT = 60000; // 1 minute timeout for jobs
const MAX_CONCURRENT_JOBS = 5; // Maximum number of concurrent jobs per queue

// 1. User interaction to query generation
const interactionQueue = new Queue('interaction-query', { connection });

// 2. Query execution with tool calling
export const queryExecutionQueue = new Queue('query-execution', { connection });

// 3. Results visualization 
export const visualizationQueue = new Queue('visualization', { connection });

// Queue event listeners for monitoring
const interactionEvents = new QueueEvents('interaction-query', { connection });
const queryExecutionEvents = new QueueEvents('query-execution', { connection });
const visualizationEvents = new QueueEvents('visualization', { connection });

// ==========================================
// INTERFACE DEFINITIONS
// ==========================================

// User event schema
const EventSchema = z.object({
    eventType: z.enum(['click', 'zoom', 'voice', 'hover', 'navigation']),
    eventData: z.any(),
});

interface UserEvent {
    userId: string;
    eventType: string;
    eventData: any;
    timestamp: number;
    description?: string;
}

// Generated query interface
interface GeneratedQuery {
    userId: string;
    query: string;
    context: {
        recentActions: string[];
        currentAction: string;
    };
    timestamp: number;
    sourceEventId?: string;
}

// Query execution result interface
interface QueryExecutionResult {
    userId: string;
    query: string;
    result: {
        text: string;
        toolResults: any[];
    };
    timestamp: number;
}

// Results storage - Redis keys
const USER_QUERIES_KEY_PREFIX = 'user:queries:';
const USER_RESULTS_KEY_PREFIX = 'user:results:';
const STORAGE_EXPIRY = 60 * 60 * 3; // 3 hours in seconds
const QUEUE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Setup periodic queue cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Clean up old jobs from the queues
 * This helps prevent memory leaks and keeps Redis usage under control
 */
const cleanupOldJobs = async () => {
    try {
        console.log('[Queue Cleanup] Starting cleanup of old jobs...');

        // Clean up completed jobs older than 1 hour
        const completedOlderThan = 60 * 60 * 1000; // 1 hour in ms

        // Clean up jobs from all three queues
        await interactionQueue.clean(completedOlderThan, 1000, 'completed');
        await queryExecutionQueue.clean(completedOlderThan, 1000, 'completed');
        await visualizationQueue.clean(completedOlderThan, 1000, 'completed');

        // Also clean up failed jobs older than 2 hours
        const failedOlderThan = 60 * 60 * 2 * 1000; // 2 hours in ms
        await interactionQueue.clean(failedOlderThan, 1000, 'failed');
        await queryExecutionQueue.clean(failedOlderThan, 1000, 'failed');
        await visualizationQueue.clean(failedOlderThan, 1000, 'failed');

        console.log('[Queue Cleanup] Cleanup completed successfully');
    } catch (error) {
        console.error('[Queue Cleanup] Error cleaning up old jobs:', error);
    }
};

// Schedule periodic cleanup
cleanupInterval = setInterval(cleanupOldJobs, QUEUE_CLEANUP_INTERVAL);
cleanupOldJobs(); // Run once at startup

// ==========================================
// PUBLIC FUNCTIONS
// ==========================================

/**
 * Add a user interaction event to the processing pipeline
 */
export const addUserEvent = async (userId: string, event: z.infer<typeof EventSchema>): Promise<string> => {
    const userEvent: UserEvent = {
        userId,
        eventType: event.eventType,
        eventData: event.eventData,
        timestamp: Date.now(),
    };

    // Add event to the interaction queue
    const job = await interactionQueue.add('process-interaction', userEvent, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 3600, // 1 hour in seconds
            count: 1000
        },
        removeOnFail: {
            age: 7200, // 2 hours in seconds
            count: 100
        }
    });

    return job.id || `job-${Date.now()}`;
};

/**
 * Get query results for a user from Redis
 */
export const getUserQueryResults = async (userId: string, limit = 10): Promise<QueryExecutionResult[]> => {
    const key = `${USER_RESULTS_KEY_PREFIX}${userId}`;

    try {
        // Get results from Redis
        const results = await connection.lrange(key, 0, limit - 1);

        // Parse JSON strings to objects
        return results.map((result: string) => JSON.parse(result)) as QueryExecutionResult[];
    } catch (error) {
        console.error(`Error retrieving query results from Redis: ${error}`);
        return [];
    }
};

/**
 * Get generated queries for a user from Redis
 */
export const getUserQueries = async (userId: string, limit = 10): Promise<GeneratedQuery[]> => {
    const key = `${USER_QUERIES_KEY_PREFIX}${userId}`;

    try {
        // Get queries from Redis
        const queries = await connection.lrange(key, 0, limit - 1);

        // Parse JSON strings to objects
        return queries.map((query: string) => JSON.parse(query)) as GeneratedQuery[];
    } catch (error) {
        console.error(`Error retrieving queries from Redis: ${error}`);
        return [];
    }
};

/**
 * Get visualizations for a user from Redis
 */
export const getUserVisualizations = async (userId: string, limit = 10): Promise<any[]> => {
    const key = `user:visualization:${userId}`;

    try {
        // Get visualizations from Redis
        const visualizations = await connection.lrange(key, 0, limit - 1);

        // Parse JSON strings to objects
        return visualizations.map((v: string) => JSON.parse(v));
    } catch (error) {
        console.error(`Error retrieving visualizations from Redis: ${error}`);
        return [];
    }
};

// ==========================================
// STAGE 1: INTERACTION TO QUERY GENERATION
// ==========================================

/**
 * Generate a human-readable description of an event
 */
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

/**
 * Determine if this event should trigger a query generation
 */
const shouldGenerateQuery = (event: UserEvent): boolean => {
    // Logic to determine if this event should trigger query planning
    // For now, only let search events and certain clicks trigger queries
    return ['click'].includes(event.eventType) &&
        event.description !== undefined;
};

/**
 * Store a generated query in Redis
 */
const storeGeneratedQuery = async (query: GeneratedQuery): Promise<void> => {
    const key = `${USER_QUERIES_KEY_PREFIX}${query.userId}`;

    try {
        // Add new query to the beginning of the list
        await connection.lpush(key, JSON.stringify(query));

        // Trim to keep only the latest 20 queries
        await connection.ltrim(key, 0, 19);

        // Set expiry on the key
        await connection.expire(key, STORAGE_EXPIRY);
    } catch (error) {
        console.error(`Error storing query in Redis: ${error}`);
    }
};

/**
 * Store a query execution result in Redis 
 */
const storeQueryResult = async (result: QueryExecutionResult): Promise<void> => {
    const key = `${USER_RESULTS_KEY_PREFIX}${result.userId}`;

    try {
        // Add new result to the beginning of the list
        await connection.lpush(key, JSON.stringify(result));

        // Trim to keep only the latest 20 results
        await connection.ltrim(key, 0, 19);

        // Set expiry on the key
        await connection.expire(key, STORAGE_EXPIRY);
    } catch (error) {
        console.error(`Error storing query result in Redis: ${error}`);
    }
};

/**
 * Generate relevant queries based on user interaction
 */
const generateQueriesFromEvent = async (event: UserEvent, description: string): Promise<string[]> => {
    try {
        // Get recent user events for context
        const recentResults = await getUserQueryResults(event.userId, 5);
        const recentActions = recentResults.map(r => r.query);

        // Generate queries using AI
        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: `
            Based on the user's current interaction: "${description}"
            And their recent actions: ${recentActions.join(', ') || 'None'}
            
            Generate 1-3 relevant financial data queries that would be useful to show to the user now.
            Each query should be specific and actionable.
            
            Format your response as a JSON array of query strings, for example:
            ["What are the current stock prices for tech companies?", "Show financial news for Apple"]
            `,
            maxTokens: 200,
        });

        // Parse the response to extract queries
        try {
            const queries = JSON.parse(text.trim());
            if (Array.isArray(queries)) {
                return queries.filter(q => typeof q === 'string').slice(0, 3);
            }
        } catch (err) {
            // If parsing fails, try to extract queries using regex
            const matches = text.match(/"([^"]+)"/g);
            if (matches) {
                return matches.map(m => m.replace(/"/g, '')).slice(0, 3);
            }
        }

        return [`What financial data about ${description} would be relevant?`];
    } catch (error) {
        console.error(`Error generating queries:`, error);
        return [`What financial data would be relevant based on user activity?`];
    }
};

// ==========================================
// WORKER IMPLEMENTATIONS FOR EACH STAGE
// ==========================================

/**
 * Stage 1: Worker for processing user interactions
 * Takes user events, generates descriptions, and creates queries
 */
const interactionWorker = new Worker('interaction-query', async (job: Job<UserEvent, string[]>) => {
    const event = job.data;

    try {
        // Generate human-readable description
        const description = await generateEventDescription(event);
        event.description = description;

        // Log progress
        await job.updateProgress(50);

        // Only generate queries if appropriate for this event type
        if (!shouldGenerateQuery(event)) {
            return [];
        }

        // Generate 1-3 relevant queries based on the event
        const queries = await generateQueriesFromEvent(event, description);

        // For each generated query, add it to the execution queue
        // and store it in Redis
        const generatedQueries: GeneratedQuery[] = [];

        for (const queryText of queries) {
            const generatedQuery: GeneratedQuery = {
                userId: event.userId,
                query: queryText,
                context: {
                    recentActions: [],
                    currentAction: description
                },
                timestamp: Date.now(),
                sourceEventId: String(job.id)
            };

            // Store query in Redis
            await storeGeneratedQuery(generatedQuery);
            generatedQueries.push(generatedQuery);

            // Add to execution queue
            await queryExecutionQueue.add('execute-query', generatedQuery, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: {
                    age: 3600, // 1 hour in seconds
                    count: 1000
                },
                removeOnFail: {
                    age: 7200, // 2 hours in seconds
                    count: 100
                }
            });
        }

        return queries;
    } catch (error) {
        console.error(`Error processing user interaction: ${error}`);
        throw error; // BullMQ will handle retries
    }
}, { connection });

/**
 * Stage 2: Worker for executing queries
 * Takes generated queries and executes them using processFinancialQuery
 */
const queryExecutionWorker = new Worker('query-execution', async (job: Job<GeneratedQuery, any>) => {
    const queryData = job.data;

    try {
        await job.updateProgress(10);

        // Process the query using the financial query processor
        // This will execute approximately 3 relevant tools
        const result = await processFinancialQuery(
            queryData.query,
            queryData.context
        );

        await job.updateProgress(90);

        // Store result in Redis
        const executionResult: QueryExecutionResult = {
            userId: queryData.userId,
            query: queryData.query,
            result: {
                text: result.text || '',  // Add fallback for undefined
                toolResults: result.toolResults || [],
            },
            timestamp: Date.now()
        };

        await storeQueryResult(executionResult);

        // Add to visualization queue
        await visualizationQueue.add('visualize-result', executionResult, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: {
                age: 3600, // 1 hour in seconds
                count: 1000 // Keep at most 1000 jobs
            },
            removeOnFail: {
                age: 7200, // 2 hours in seconds
                count: 100 // Keep at most 100 failed jobs
            }
        });

        return executionResult;
    } catch (error) {
        console.error(`Error executing query: ${error}`);
        throw error; // BullMQ will handle retries
    }
}, { connection });

/**
 * Stage 3: Worker for visualizing results
 * Takes query results and prepares them for UI visualization
 */
const visualizationWorker = new Worker('visualization', async (job: Job<QueryExecutionResult | any, any>) => {
    const resultData = job.data;
    const isPartialResult = resultData.isPartial === true;

    try {
        // Set a timeout to ensure this job doesn't run too long
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Visualization job ${job.id} timed out after ${DEFAULT_JOB_TIMEOUT / 1000} seconds`));
            }, DEFAULT_JOB_TIMEOUT);
        });

        // The actual visualization process
        const visualizationPromise = (async () => {
            // Call the UI adapter API to generate adaptive cards
            // Use the constant UI_BASE_URL for server-to-server communication
            const apiUrl = new URL('/api/ui', UI_BASE_URL).toString();

            console.log(`[Visualization] Making API request to ${apiUrl} (using base URL: ${UI_BASE_URL})`);

            // Log whether this is a partial or complete result
            if (isPartialResult) {
                console.log(`[Visualization] Processing partial result (step ${resultData.stepNumber})`);
            } else {
                console.log(`[Visualization] Processing complete result`);
            }

            // Prepare the payload that matches what the UI API expects
            const payload = {
                userQuery: resultData.query,
                toolCallJsonResult: resultData.result.toolResults,
                isPartial: isPartialResult
            };

            // Use ofetch to make the HTTP request with the absolute URL
            const adaptiveCards = await $fetch(apiUrl, {
                method: 'POST',
                body: payload,
                retry: 2,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: DEFAULT_JOB_TIMEOUT - 5000 // Slightly shorter than the job timeout
            });

            // Generate a unique key for partial results if needed
            const visualizationKey = isPartialResult
                ? `user:visualization:partial:${resultData.userId}:${resultData.stepNumber}`
                : `user:visualization:${resultData.userId}`;

            const visualizationData = {
                userId: resultData.userId,
                query: resultData.query,
                text: resultData.result.text,
                toolResults: resultData.result.toolResults,
                adaptiveCards: adaptiveCards,
                timestamp: Date.now(),
                isPartial: isPartialResult,
                stepNumber: resultData.stepNumber || 0
            };

            // Store in Redis - for partial results, we'll use a different pattern and shorter expiry
            if (isPartialResult) {
                // Store partial results with a shorter expiry time
                await connection.set(visualizationKey, JSON.stringify(visualizationData));
                await connection.expire(visualizationKey, 300); // 5 minute expiry for partial results

                // Publish partial result for immediate UI update
                await connection.publish('partial-visualization-update', JSON.stringify({
                    userId: resultData.userId,
                    visualizationData,
                    timestamp: Date.now()
                }));
            } else {
                // For complete results, use the standard approach
                await connection.lpush(visualizationKey, JSON.stringify(visualizationData));
                await connection.ltrim(visualizationKey, 0, 19); // Keep only latest 20
                await connection.expire(visualizationKey, STORAGE_EXPIRY);

                // Publish an event that can be listened to by the frontend
                await connection.publish('visualization-updates', JSON.stringify({
                    userId: resultData.userId,
                    visualizationData,
                    timestamp: Date.now()
                }));
            }

            return {
                success: true,
                visualizationId: visualizationKey,
                isPartial: isPartialResult
            };
        })();

        // Race between the timeout and the actual visualization process
        return await Promise.race([timeoutPromise, visualizationPromise]);
    } catch (error) {
        console.error('[Visualization Worker] Error generating visualization:', error);

        // Even on error, publish an error notification if this was a partial result
        if (isPartialResult) {
            try {
                await connection.publish('partial-visualization-error', JSON.stringify({
                    userId: resultData.userId,
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: Date.now()
                }));
            } catch (publishError) {
                console.error('[Visualization Worker] Error publishing error notification:', publishError);
            }
        }

        throw new Error(`Visualization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}, {
    connection,
    concurrency: MAX_CONCURRENT_JOBS, // Limit concurrent jobs
    limiter: {
        max: 10, // Maximum 10 jobs per time period
        duration: 1000 // per second
    }
});

// ==========================================
// EVENT LISTENERS FOR MONITORING
// ==========================================

// Stage 1: Interaction to query generation
interactionWorker.on('completed', (job: Job<UserEvent, string[]>) => {
    console.log(`Interaction job ${job.id} generated ${job.returnvalue.length} queries`);
});

interactionWorker.on('failed', (job: Job<UserEvent, string[]> | undefined, err: JobError) => {
    console.error(`Interaction job ${job?.id} failed with error: ${err.message}`);
});

// Stage 2: Query execution
queryExecutionWorker.on('completed', (job: Job<GeneratedQuery, any>) => {
    console.log(`Query execution job ${job.id} completed for query: ${job.data.query.substring(0, 50)}...`);
});

queryExecutionWorker.on('failed', (job: Job<GeneratedQuery, any> | undefined, err: JobError) => {
    console.error(`Query execution job ${job?.id} failed with error: ${err.message}`);
});

// Stage 3: Visualization
visualizationWorker.on('completed', (job: Job<QueryExecutionResult, any>) => {
    console.log(`Visualization job ${job.id} completed for result visualization`);
});

visualizationWorker.on('failed', (job: Job<QueryExecutionResult, any> | undefined, err: JobError) => {
    console.error(`Visualization job ${job?.id} failed with error: ${err.message}`);
});

// Queue events listeners
interactionEvents.on('waiting', ({ jobId }: { jobId: string }) => {
    console.log(`Interaction job ${jobId} is waiting`);
});

queryExecutionEvents.on('waiting', ({ jobId }: { jobId: string }) => {
    console.log(`Query execution job ${jobId} is waiting`);
});

visualizationEvents.on('waiting', ({ jobId }: { jobId: string }) => {
    console.log(`Visualization job ${jobId} is waiting`);
});

// ==========================================
// GRACEFUL SHUTDOWN HANDLERS
// ==========================================

// Cleanup when the server is shutting down
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queues and connections');

    // Clear the cleanup interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    await Promise.all([
        interactionWorker.close(),
        queryExecutionWorker.close(),
        visualizationWorker.close(),
        connection.quit()
    ]);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing queues and connections');

    // Clear the cleanup interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    await Promise.all([
        interactionWorker.close(),
        queryExecutionWorker.close(),
        visualizationWorker.close(),
        connection.quit()
    ]);
});
