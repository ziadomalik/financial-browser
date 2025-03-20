import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";

export default defineNitroPlugin((nitroApp: NitroApp) => {
    const engine = new Engine();
    const io = new Server();

    io.bind(engine);

    // In-memory storage (replace with a more robust solution in production)
    const activeConnections: Record<string, string> = {}; // userId -> socketId mapping

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Handle authentication
        socket.on('authenticate', async (data: { userId: string, token: string }) => {
            try {
                // In a real app, you would verify the token here
                const { userId } = data;

                // Store the connection
                activeConnections[userId] = socket.id;
                socket.join(`user:${userId}`);

                // Confirm successful authentication
                socket.emit('authenticated', { success: true });

                console.log(`User ${userId} authenticated`);
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('authenticated', {
                    success: false,
                    error: 'Authentication failed'
                });
            }
        });

        // Handle user events
        socket.on('user-event', async (data: {
            userId: string;
            eventType: string;
            eventData: any;
        }) => {
            const { userId, eventType, eventData } = data;

            console.log(`User ${userId} triggered event: ${eventType}`, eventData);

            // Example of sending back event confirmation
            socket.emit('event-received', {
                eventType,
                timestamp: new Date().toISOString()
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);

            // Remove from active connections
            for (const [userId, socketId] of Object.entries(activeConnections)) {
                if (socketId === socket.id) {
                    delete activeConnections[userId];
                    break;
                }
            }
        });
    });

    nitroApp.router.use("/socket.io/", defineEventHandler({
        handler(event) {
            // Add _query property to the request object that Engine.io expects
            const req = event.node.req as any;
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            req._query = Object.fromEntries(url.searchParams);

            engine.handleRequest(req, event.node.res);
            event._handled = true;
        },
        websocket: {
            open(peer) {
                // @ts-expect-error private method and property
                engine.prepare(peer._internal.nodeReq);
                // @ts-expect-error private method and property
                engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
            }
        }
    }));

    console.log("Socket.IO server initialized and listening on /socket.io/");
});