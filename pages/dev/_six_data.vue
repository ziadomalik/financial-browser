<template>
    <div class="max-w-4xl mx-auto flex flex-col gap-6 m-5">
        <!-- Search Form with Event Tracking -->
        <div class="form-container">
            <h2 class="text-xl font-bold mb-2">Financial Data Search</h2>
            <div class="flex flex-col md:flex-row gap-2 mb-2">
                <SInput 
                    v-model="query" 
                    placeholder="Enter your query" 
                    v-track-search
                    class="flex-grow"
                />
                <SButton 
                    @click="handleClick"
                    v-track-click="{ type: 'search-button', data: { source: 'search-form' } }"
                >
                    Search
                </SButton>
            </div>
            
            <!-- Voice Input Component -->
            <VoiceInput :onResult="handleVoiceResult" />
        </div>

        <!-- Interactive Card Elements -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
                v-for="(item, index) in sampleCompanies" 
                :key="index"
                class="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                v-track-click="{ type: 'company-card', data: { companyName: item.name } }"
            >
                <h3 class="font-semibold text-lg">{{ item.name }}</h3>
                <p class="text-gray-600">{{ item.description }}</p>
            </div>
        </div>

        <!-- Results Section -->
        <div class="results-section grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
                <h2 class="text-xl font-bold mb-2">API Results</h2>
                <div class="bg-white rounded-lg shadow p-4 h-96 overflow-y-auto">
                    <pre>{{ result }}</pre>
                </div>
            </div>
            
            <!-- Socket.io Query Results -->
            <div class="md:col-span-1">
                <QueryResults />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const query = ref('')
const result = ref<any>('')

// Sample data for interactive elements
const sampleCompanies = ref([
    { name: 'Apple Inc.', description: 'Technology company that designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.' },
    { name: 'Microsoft', description: 'Technology company that develops, manufactures, licenses, supports, and sells computer software, consumer electronics, and related services.' },
    { name: 'Amazon', description: 'Multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.' },
    { name: 'Tesla', description: 'Electric vehicle and clean energy company that designs and manufactures electric cars, battery energy storage, solar panels, solar roof tiles, and related products and services.' }
])

// Access the event tracker from the plugin
const { $trackSearch } = useNuxtApp() as any

const handleClick = async () => {
    console.log('[Six] Calling API: ', query.value)
    
    // Track the search event programmatically
    if ($trackSearch) {
        $trackSearch(query.value, { source: 'button-click' })
    }
    
    const response = await $fetch(`/api/six_data?query=${encodeURIComponent(query.value)}`)
    console.log('[Six] Done Calling: ', response)

    console.log(response)
    result.value = response
}

// Handle voice input results
const handleVoiceResult = (text: string) => {
    query.value = text
    handleClick()
}
</script>

<style scoped>
/* You can add scoped styles here if needed */
</style>
