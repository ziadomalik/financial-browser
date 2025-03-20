import { io } from "socket.io-client";

// Create a getter function for the socket that only runs on the client side
let socketInstance: any = null;

export const getSocket = () => {
    // Only create socket on client-side
    if (process.client && !socketInstance) {
        socketInstance = io(window.location.origin, {
            autoConnect: true, // Auto-connect to Socket.IO server
            path: '/socket.io/' // Make sure path matches server endpoint
        });
    }
    return socketInstance;
};

// For backward compatibility
export const socket = process.client ? getSocket() : null;