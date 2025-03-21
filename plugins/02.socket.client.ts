import { defineNuxtPlugin } from '#app'
import { getSocket } from '~/components/socket'
import { ref } from 'vue'

// Define types for our socket data
interface SocketError {
    message: string
    time: string
}

interface QueryResult {
    event: string
    data: any
    timestamp: string
    [key: string]: any
}

interface VisualizationData {
    userId: string;
    query: string;
    text: string;
    toolResults: any[];
    adaptiveCards: any[];
    timestamp: number;
    isPartial: boolean;
    stepNumber: number;
}

export default defineNuxtPlugin((nuxtApp) => {
    // This plugin only runs on the client side
    const socket = getSocket()

    // Create reactive refs for socket state
    const isConnected = ref(false)
    const queryResults = ref<QueryResult[]>([])
    const socketErrors = ref<SocketError[]>([])
    const partialVisualizations = ref<VisualizationData[]>([])
    const completeVisualizations = ref<VisualizationData[]>([])

    if (socket) {
        // Set up connection status
        if (socket.connected) {
            isConnected.value = true
        }

        // Listen for socket events
        socket.on('connect', () => {
            console.log('Socket connected')
            isConnected.value = true
        })

        socket.on('disconnect', () => {
            console.log('Socket disconnected')
            isConnected.value = false
        })

        socket.on('connect_error', (error: Error) => {
            console.error('Socket connection error:', error)
            socketErrors.value.push({
                message: error.message,
                time: new Date().toISOString()
            })
        })

        // Listen for query results
        socket.on('query-result', (data: any) => {
            console.log('Received query result:', data)
            queryResults.value.push({
                ...data,
                timestamp: data.timestamp || new Date().toISOString()
            })

            // Keep only the 10 most recent results
            if (queryResults.value.length > 10) {
                queryResults.value = queryResults.value.slice(-10)
            }
        })

        // Listen for partial visualization updates (incremental tool results)
        socket.on('partial-visualization-update', (data: { userId: string, visualizationData: VisualizationData }) => {
            console.log('Received partial visualization update:', data)

            if (data?.visualizationData) {
                // Add the new partial visualization
                partialVisualizations.value.push(data.visualizationData)

                // Keep only the 20 most recent partial visualizations
                if (partialVisualizations.value.length > 20) {
                    partialVisualizations.value = partialVisualizations.value.slice(-20)
                }

                // Notify any UI components that are listening for visualization updates
                nuxtApp.hook('visualization:partial-update', data.visualizationData)
            }
        })

        // Listen for complete visualization updates
        socket.on('visualization-updates', (data: { userId: string, visualizationData: VisualizationData }) => {
            console.log('Received complete visualization update:', data)

            if (data?.visualizationData) {
                // Add the complete visualization
                completeVisualizations.value.push(data.visualizationData)

                // Keep only the 10 most recent complete visualizations
                if (completeVisualizations.value.length > 10) {
                    completeVisualizations.value = completeVisualizations.value.slice(-10)
                }

                // Clear partial visualizations related to this query
                partialVisualizations.value = partialVisualizations.value.filter(
                    viz => viz.query !== data.visualizationData.query
                )

                // Notify any UI components that are listening for visualization updates
                nuxtApp.hook('visualization:complete-update', data.visualizationData)
            }
        })
    } else {
        console.warn('Socket.io not initialized - running in server context or initialization failed')
    }

    // Create a simple event tracker for socket events
    const eventTracker = {
        trackClick: (elementId: string, elementType: string, additionalData: any = {}) => {
            if (!socket) return

            socket.emit('user-event', {
                event: 'click',
                elementId,
                elementType,
                ...additionalData,
                timestamp: new Date().toISOString()
            })
        },

        trackSearch: (query: string, filters: any = {}) => {
            if (!socket) return

            socket.emit('user-event', {
                event: 'search',
                query,
                filters,
                timestamp: new Date().toISOString()
            })
        },

        trackNavigation: (from: string, to: string) => {
            if (!socket) return

            socket.emit('user-event', {
                event: 'navigation',
                from,
                to,
                timestamp: new Date().toISOString()
            })
        }
    }

    // Clean up socket listeners on app unmount
    nuxtApp.hook('app:suspense:resolve', () => {
        console.log('Socket.io plugin initialized')
    })

    nuxtApp.hook('app:beforeMount', () => {
        if (!socket || socket.connected) return
        socket.connect()
    })

    // Provide to the Nuxt app
    return {
        provide: {
            socket,
            isSocketConnected: isConnected,
            socketErrors,
            queryResults,
            partialVisualizations,
            completeVisualizations,
            eventTracker
        }
    }
})
