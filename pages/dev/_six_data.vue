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
                    :disabled="isLoading"
                    class="relative"
                >
                    <span v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    </span>
                    <span :class="{ 'opacity-0': isLoading }">Search</span>
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
                    <div v-if="isLoading" class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                    <div v-else-if="isError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
                        <h3 class="font-bold">Error</h3>
                        <p>{{ errorMessage }}</p>
                    </div>
                    <pre v-else>{{ result }}</pre>
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
import { ref, computed } from 'vue'

const query = ref('')
const result = ref<any>('')
const isLoading = ref(false)

// Computed properties for error handling
const isError = computed(() => {
    return result.value && 
           typeof result.value === 'object' && 
           (result.value.error === true || result.value.toolResults?.some((tr: any) => 
               tr.result && tr.result.error === true
           ))
})

const errorMessage = computed(() => {
    if (!result.value) return ''
    
    // Check for top-level error message
    if (result.value.message) return result.value.message
    
    // Check in tool results
    if (result.value.toolResults) {
        const errorResult = result.value.toolResults.find((tr: any) => 
            tr.result && tr.result.error === true
        )
        if (errorResult && errorResult.result.message) {
            return errorResult.result.message
        }
    }
    
    return 'An unknown error occurred'
})


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
    
    // Set loading state
    isLoading.value = true
    result.value = ''
    
    try {
        const response = await $fetch(`/api/six_data?query=${encodeURIComponent(query.value)}`)
        console.log('[Six] Done Calling: ', response)
        result.value = response
    } catch (error) {
        console.error('[Six] API error:', error)
        result.value = {
            error: true,
            message: error instanceof Error ? error.message : 'Failed to fetch data from API'
        }
    } finally {
        isLoading.value = false
    }
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
