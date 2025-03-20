<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { socket } from './socket';
import { useUserStore } from '~/stores/user';

const message = ref('');
const serverMessages = ref([]);
const userStore = useUserStore();

// Handle incoming messages
function onServerMessage(eventName, data) {
  serverMessages.value.push({
    eventName,
    data,
    timestamp: new Date().toLocaleTimeString()
  });
}

// Set up event listeners
function setupListeners() {
  // Listen for various events
  socket.on('authenticated', data => onServerMessage('authenticated', data));
  socket.on('event-received', data => onServerMessage('event-received', data));
}

// Clean up listeners
function cleanupListeners() {
  socket.off('authenticated');
  socket.off('event-received');
}

// Send a test event to the server
function sendTestEvent() {
  if (!message.value.trim()) return;
  
  socket.emit('user-event', {
    userId: userStore.userId || 'anonymous',
    eventType: 'message',
    eventData: {
      content: message.value
    }
  });
  
  message.value = '';
}

// Connect and authenticate
function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
  
  if (userStore.isAuthenticated && userStore.userId) {
    socket.emit('authenticate', {
      userId: userStore.userId,
      token: userStore.token
    });
  }
}

// Initialize the component
onMounted(() => {
  setupListeners();
  connectSocket();
});

// Clean up on component unmount
onBeforeUnmount(() => {
  cleanupListeners();
});
</script>

<template>
  <div class="p-4 border rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Socket.IO Example</h3>
    
    <!-- Connection status -->
    <Connection />
    
    <!-- Send message form -->
    <div class="mt-4 flex">
      <input
        v-model="message"
        type="text"
        placeholder="Type a message to send to the server"
        class="flex-1 rounded-l border p-2"
        @keyup.enter="sendTestEvent"
      />
      <button
        @click="sendTestEvent"
        class="bg-blue-500 text-white px-4 py-2 rounded-r"
        :disabled="!message.trim()"
      >
        Send
      </button>
    </div>
    
    <!-- Server messages -->
    <div class="mt-4">
      <h4 class="font-medium mb-2">Server Messages:</h4>
      <div class="max-h-60 overflow-y-auto border rounded p-2">
        <div v-if="serverMessages.length === 0" class="text-gray-500">
          No messages yet.
        </div>
        <div 
          v-for="(msg, index) in serverMessages"
          :key="index"
          class="mb-2 p-2 border-b"
        >
          <div class="flex justify-between">
            <span class="font-bold">{{ msg.eventName }}</span>
            <span class="text-sm text-gray-500">{{ msg.timestamp }}</span>
          </div>
          <pre class="text-sm bg-gray-100 p-1 mt-1 rounded">{{ JSON.stringify(msg.data, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template> 