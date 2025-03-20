import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
    return {
        status: 'ok',
        message: 'Socket.io server is running',
        time: new Date().toISOString()
    }
}) 