// Simple Redis connection test script
import IORedis from 'ioredis';

// Redis connection configuration - Using Upstash Redis
const connection = new IORedis("rediss://default:AZZ3AAIjcDFkMjgwYTY3NTgyN2M0NDhiOTM1N2JkYzQzNTVkODEwMHAxMA@super-colt-38519.upstash.io:6379", {
    maxRetriesPerRequest: null,
});

// Test the connection
async function testRedisConnection() {
    try {
        // Ping the Redis server
        const pingResult = await connection.ping();
        console.log('Redis connection test:', pingResult === 'PONG' ? 'SUCCESS' : 'FAILED');

        // List all queues in Redis
        const keys = await connection.keys('bull:*');
        console.log('Found Redis queues:', keys);

        // Close the connection
        await connection.quit();
        console.log('Redis connection closed');
    } catch (error) {
        console.error('Redis connection error:', error);
    }
}

// Run the test
testRedisConnection(); 