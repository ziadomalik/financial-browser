import { io } from "socket.io-client";

// Use absolute URL to avoid any path resolution issues
export const socket = io(window.location.origin, {
    autoConnect: true, // Auto-connect to Socket.IO server
    path: '/socket.io/' // Make sure path matches server endpoint
});