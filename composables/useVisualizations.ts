import { ref, onMounted, onUnmounted, watch, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export interface Visualization {
    userId: string;
    query: string;
    text: string;
    toolResults: any[];
    adaptiveCards: any[];
    timestamp: number;
}

export function useVisualizations(userIdRef: MaybeRefOrGetter<string>) {
    const visualizations = ref<Visualization[]>([]);
    const isLoading = ref<boolean>(false);
    const error = ref<Error | null>(null);
    let pollingInterval: NodeJS.Timeout | null = null;

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
            isLoading.value = false;
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

    // Watch for changes to userId and refresh
    watch(() => toValue(userIdRef), (newUserId, oldUserId) => {
        if (newUserId !== oldUserId && newUserId) {
            fetchVisualizations();
        }
    });

    // Setup on component mount
    onMounted(() => {
        fetchVisualizations();
        startPolling();
    });

    // Cleanup on component unmount
    onUnmounted(() => {
        stopPolling();
    });

    // Return everything the component needs
    return {
        visualizations,
        isLoading,
        error,
        fetchVisualizations,
        startPolling,
        stopPolling
    };
} 