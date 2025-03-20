<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { socket } from "./socket";

const isConnected = ref(false);
const transport = ref("N/A");
const connectionErrors = ref([]);

if (socket.connected) {
  onConnect();
}

function onConnect() {
  isConnected.value = true;
  connectionErrors.value = [];
  transport.value = socket.io.engine.transport.name;

  socket.io.engine.on("upgrade", (rawTransport) => {
    transport.value = rawTransport.name;
  });
  
  console.log('Socket.IO connected successfully');
}

function onDisconnect(reason) {
  isConnected.value = false;
  transport.value = "N/A";
  console.log('Socket.IO disconnected:', reason);
}

function onConnectError(error) {
  connectionErrors.value.push(`Connection error: ${error.message}`);
  console.error('Socket.IO connection error:', error);
}

socket.on("connect", onConnect);
socket.on("disconnect", onDisconnect);
socket.on("connect_error", onConnectError);

// Clean up event listeners
onBeforeUnmount(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
  socket.off("connect_error", onConnectError);
  
  // Also clean up the engine upgrade listener if connected
  if (socket.io?.engine) {
    socket.io.engine.off("upgrade");
  }
});
</script>

<template>
<div class="socket-status">
  <p>Status: <span :class="isConnected ? 'text-green-500' : 'text-red-500'">
    {{ isConnected ? "connected" : "disconnected" }}
  </span></p>
  <p>Transport: {{ transport }}</p>
  
  <div v-if="connectionErrors.length > 0" class="text-red-500 mt-2">
    <p v-for="(error, index) in connectionErrors" :key="index">
      {{ error }}
    </p>
  </div>
</div>
</template>