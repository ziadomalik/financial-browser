// Queue check script
import IORedis from 'ioredis';

// Redis connection for monitoring
const connection = new IORedis("rediss://default:AZZ3AAIjcDFkMjgwYTY3NTgyN2M0NDhiOTM1N2JkYzQzNTVkODEwMHAxMA@super-colt-38519.upstash.io:6379", {
    maxRetriesPerRequest: null,
});

async function checkQueues() {
    try {
        console.log('Checking queue status...');

        // Get all Bull queue related keys
        const keys = await connection.keys('bull:*');
        console.log('Found Redis Bull queue keys:', keys);

        // Check queue job counts
        const interactionJobCount = await connection.get('bull:interaction-query:id');
        console.log('Interaction Queue Job Count:', interactionJobCount || 0);

        const executionJobCount = await connection.get('bull:query-execution:id');
        console.log('Execution Queue Job Count:', executionJobCount || 0);

        const visualizationJobCount = await connection.get('bull:visualization:id');
        console.log('Visualization Queue Job Count:', visualizationJobCount || 0);

        // List all user visualization keys 
        const allUserVisualizationKeys = await connection.keys('user:visualization:*');
        console.log('All User Visualization Keys:', allUserVisualizationKeys);

        // Check for specific test user's visualizations
        for (const key of allUserVisualizationKeys) {
            // Skip partial keys for now
            if (key.includes('partial')) continue;

            try {
                const type = await connection.type(key);
                console.log(`Key ${key} is of type: ${type}`);

                if (type === 'list') {
                    const visualizations = await connection.lrange(key, 0, -1);
                    if (visualizations.length > 0) {
                        console.log(`Visualizations for ${key}:`, visualizations.length);
                        // Print first visualization to check structure
                        console.log('First visualization sample:', JSON.parse(visualizations[0]));
                    } else {
                        console.log(`No visualizations found for ${key}`);
                    }
                } else if (type === 'string') {
                    const value = await connection.get(key);
                    console.log(`Value for ${key}:`, JSON.parse(value));
                }
            } catch (error) {
                console.error(`Error processing key ${key}:`, error.message);
            }
        }

        // Check partial visualizations
        const partialKeys = await connection.keys('user:visualization:partial:*');
        console.log('Partial Visualization Keys:', partialKeys);

        for (const key of partialKeys) {
            try {
                const type = await connection.type(key);
                console.log(`Partial key ${key} is of type: ${type}`);

                if (type === 'string') {
                    const value = await connection.get(key);
                    console.log(`Partial visualization for ${key}:`, JSON.parse(value));
                }
            } catch (error) {
                console.error(`Error processing partial key ${key}:`, error.message);
            }
        }

        // Close the connection
        await connection.quit();
        console.log('Done checking queues');
    } catch (error) {
        console.error('Error checking queues:', error);
        await connection.quit();
    }
}

// Run the check
checkQueues(); 