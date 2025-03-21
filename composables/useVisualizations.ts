import { ref, onMounted, onUnmounted, watch, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export interface Visualization {
    userId: string;
    query: string;
    text: string;
    toolResults: any[];
    adaptiveCards: any[];
    timestamp: number;
    isPartialVisualization?: boolean;
    isSearchQuery?: boolean;
    isSearchPartial?: boolean;
    toolName?: string;
    isComplete?: boolean;
}

export function useVisualizations(userIdRef: MaybeRefOrGetter<string>) {
    const visualizations = ref<Visualization[]>([]);
    const isLoading = ref<boolean>(false);
    const error = ref<Error | null>(null);
    let pollingInterval: NodeJS.Timeout | null = null;
    let socketListeners: (() => void)[] = [];

    // Allow manually setting the loading state
    const setLoading = (state: boolean) => {
        isLoading.value = state;
    };

    // Fetch visualizations from the API
    const fetchVisualizations = async () => {
        const userId = toValue(userIdRef);
        if (!userId) return;

        try {
            isLoading.value = true;
            error.value = null;

            const data = await $fetch<Visualization[] | { error: boolean; message: string }>(`/api/visualizations`, {
                params: { userId }
            });

            // Only update if we got an array
            if (Array.isArray(data)) {
                visualizations.value = data;
            } else if ('error' in data && data.error) {
                throw new Error(data.message || 'Unknown error');
            }

        } catch (err) {
            error.value = err instanceof Error ? err : new Error('Unknown error');
            console.error('Error fetching visualizations:', err);
        } finally {
            // We'll reset loading state after a short delay to ensure the UI has updated
            setTimeout(() => {
                isLoading.value = false;
            }, 300);
        }
    };

    // Manually refresh visualizations - returns a promise that resolves when done
    const refresh = async () => {
        try {
            // Reset error state
            error.value = null;

            // Ensure loading state is set
            isLoading.value = true;

            // Perform the fetch
            await fetchVisualizations();

            return visualizations.value;
        } catch (err) {
            error.value = err instanceof Error ? err : new Error('Unknown error');
            console.error('Error refreshing visualizations:', err);
            throw err;
        }
    };

    // Start polling for new visualizations
    const startPolling = (intervalMs = 5000) => {
        stopPolling();
        fetchVisualizations();
        pollingInterval = setInterval(fetchVisualizations, intervalMs);
    };

    // Stop polling
    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    };

    // Setup socket listeners to receive real-time updates
    const setupSocketListeners = () => {
        const userId = toValue(userIdRef);
        if (!userId) return;

        // Clean up any existing listeners
        removeSocketListeners();

        // Get the Nuxt socket instance
        const socket = useNuxtApp().$socket;
        if (!socket) {
            console.warn('Socket instance not available for visualization updates');
            return;
        }

        // Listen for visualization cancellation events
        const onVisualizationCancelled = (data: any) => {
            try {
                const cancelledData = typeof data === 'string' ? JSON.parse(data) : data;

                // If this cancellation event is for our user, refresh visualizations
                if (cancelledData.userId === userId) {
                    console.log(`Visualizations cancelled for user ${userId}`);

                    // Set loading to false as the jobs were cancelled
                    isLoading.value = false;

                    // Refresh to get the latest state
                    setTimeout(() => {
                        fetchVisualizations();
                    }, 500);
                }
            } catch (err) {
                console.error('Error handling visualization cancellation:', err);
            }
        };

        // Listen for partial visualization updates
        const onPartialVisualization = (data: any) => {
            try {
                const vizData = typeof data === 'string' ? JSON.parse(data) : data;

                // Only process if this is for our user
                if (vizData.userId === userId) {
                    console.log(`Received partial visualization update for user ${userId}`);

                    // Refresh to show partial results
                    fetchVisualizations();
                }
            } catch (err) {
                console.error('Error handling partial visualization update:', err);
            }
        };

        // Listen for visualization completion
        const onVisualizationComplete = (data: any) => {
            try {
                const completeData = typeof data === 'string' ? JSON.parse(data) : data;

                // Only process if this is for our user
                if (completeData.userId === userId) {
                    console.log(`Received visualization completion for user ${userId}`);

                    // Refresh to show the final visualization
                    fetchVisualizations();

                    // Important: Reset the loading state after receiving complete results
                    setTimeout(() => {
                        isLoading.value = false;
                    }, 500);
                }
            } catch (err) {
                console.error('Error handling visualization completion:', err);
            }
        };

        // Listen for normal visualization updates
        const onVisualizationUpdate = (data: any) => {
            try {
                const updateData = typeof data === 'string' ? JSON.parse(data) : data;

                // Only process if this is for our user
                if (updateData.userId === userId) {
                    console.log(`Received visualization update for user ${userId}`);

                    // Refresh to show the updated visualization
                    fetchVisualizations();

                    // Reset loading state since we've received an update
                    setTimeout(() => {
                        isLoading.value = false;
                    }, 500);
                }
            } catch (err) {
                console.error('Error handling visualization update:', err);
            }
        };

        // Register listeners
        socket.on('visualization-cancelled', onVisualizationCancelled);
        socket.on('partial-visualization-update', onPartialVisualization);
        socket.on('visualization-complete', onVisualizationComplete);
        socket.on('visualization-updates', onVisualizationUpdate);

        // Save reference to the listeners for cleanup
        socketListeners.push(() => {
            socket.off('visualization-cancelled', onVisualizationCancelled);
            socket.off('partial-visualization-update', onPartialVisualization);
            socket.off('visualization-complete', onVisualizationComplete);
            socket.off('visualization-updates', onVisualizationUpdate);
        });
    };

    // Remove socket listeners
    const removeSocketListeners = () => {
        socketListeners.forEach(removeListener => removeListener());
        socketListeners = [];
    };

    // Watch for changes to userId and refresh
    watch(() => toValue(userIdRef), (newUserId, oldUserId) => {
        if (newUserId !== oldUserId && newUserId) {
            fetchVisualizations();
            setupSocketListeners();
        }
    });

    // Setup on component mount
    onMounted(() => {
        fetchVisualizations();
        startPolling();
        setupSocketListeners();
    });

    // Cleanup on component unmount
    onUnmounted(() => {
        stopPolling();
        removeSocketListeners();
    });

    // Return everything the component needs
    return {
        visualizations,
        isLoading,
        error,
        fetchVisualizations,
        refresh,
        startPolling,
        stopPolling,
        setLoading
    };
} 