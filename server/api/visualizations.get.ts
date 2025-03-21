import { getUserVisualizations } from '../socket/queryPlanner';

export default defineEventHandler(async (event) => {
    try {
        // Get userId and limit from query parameters
        const query = getQuery(event);
        const userId = query.userId as string;
        const limit = query.limit ? parseInt(query.limit as string) : 10;

        if (!userId) {
            return {
                error: true,
                message: 'User ID is required'
            };
        }

        // Get visualizations for the user
        const visualizations = await getUserVisualizations(userId, limit);

        return visualizations;
    } catch (error) {
        console.error('Error fetching visualizations:', error);
        return {
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
        };
    }
}); 