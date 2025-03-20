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

export default defineNuxtPlugin((nuxtApp) => {
    // This plugin only runs on the client side
    const socket = getSocket()

    // Create reactive refs for socket state
    const isConnected = ref(false)
    const queryResults = ref<QueryResult[]>([])
    const socketErrors = ref<SocketError[]>([])

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
            eventTracker
        }
    }
})
