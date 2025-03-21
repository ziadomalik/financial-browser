// Pipeline test script
import IORedis from 'ioredis';
import fetch from 'node-fetch';

// Redis connection for monitoring
const connection = new IORedis("rediss://default:AZZ3AAIjcDFkMjgwYTY3NTgyN2M0NDhiOTM1N2JkYzQzNTVkODEwMHAxMA@super-colt-38519.upstash.io:6379", {
    maxRetriesPerRequest: null,
});

// Monitor Redis pub/sub channels for visualization updates
function setupRedisMonitoring() {
    const subscriber = new IORedis("rediss://default:AZZ3AAIjcDFkMjgwYTY3NTgyN2M0NDhiOTM1N2JkYzQzNTVkODEwMHAxMA@super-colt-38519.upstash.io:6379", {
        maxRetriesPerRequest: null,
    });

    // Subscribe to partial visualization updates
    subscriber.subscribe('partial-visualization-update');
    subscriber.subscribe('visualization-updates');

    subscriber.on('message', (channel, message) => {
        console.log(`[${channel}] Received message:`, JSON.parse(message));
    });

    return subscriber;
}

// Function to submit a test search query
async function submitTestQuery() {
    try {
        const testUserId = 'test-user-' + Date.now();
        const testQuery = 'What is the latest stock price for Apple?';

        console.log(`Submitting test search for query: "${testQuery}" with user ID: ${testUserId}`);

        // Create event payload
        const payload = {
            userId: testUserId,
            eventType: 'click',
            eventData: {
                type: 'search',
                query: testQuery,
                source: 'test-script'
            }
        };

        // Send to pipeline API
        const response = await fetch('http://localhost:3000/api/pipeline/add-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Pipeline API response:', result);

        return { userId: testUserId, jobId: result.jobId };

    } catch (error) {
        console.error('Error submitting test query:', error);
        return null;
    }
}

// Monitor jobs in the pipeline
async function monitorPipelineJobs(testUserId) {
    console.log(`Monitoring Redis for events related to user: ${testUserId}`);

    // Check for visualizations periodically
    const checkInterval = setInterval(async () => {
        try {
            // Check for partial visualizations
            const partialKey = `user:visualization:partial:${testUserId}:1`;
            const partialVisualization = await connection.get(partialKey);

            if (partialVisualization) {
                console.log('Found partial visualization in Redis:', JSON.parse(partialVisualization));
            }

            // Check for complete visualizations
            const completeKey = `user:visualization:${testUserId}`;
            const completeVisualizations = await connection.lrange(completeKey, 0, -1);

            if (completeVisualizations.length > 0) {
                console.log('Found complete visualization in Redis:',
                    completeVisualizations.map(v => JSON.parse(v)));

                // If we've found complete visualizations, we've verified the full pipeline
                clearInterval(checkInterval);
                console.log('Pipeline test completed successfully!');
            }

        } catch (error) {
            console.error('Error checking Redis for visualizations:', error);
        }
    }, 3000); // Check every 3 seconds

    // Stop checking after 30 seconds to avoid infinite running
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Pipeline monitoring timed out after 30 seconds');
    }, 30000);
}

// Main test function
async function testPipeline() {
    console.log('Starting pipeline test...');

    // Setup Redis monitoring
    const subscriber = setupRedisMonitoring();

    // Submit a test query
    const testData = await submitTestQuery();

    if (testData) {
        // Monitor the pipeline jobs
        await monitorPipelineJobs(testData.userId);
    }

    // Cleanup function
    setTimeout(async () => {
        try {
            await subscriber.quit();
            await connection.quit();
            console.log('Redis connections closed');
        } catch (error) {
            console.error('Error closing Redis connections:', error);
        }
    }, 35000); // Allow for monitoring timeout + a few seconds
}

// Run the test
testPipeline(); 