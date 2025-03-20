<template>
  <div class="max-w-3xl mx-auto px-2">
    <div class="flex justify-between items-center mb-3">
      <span class="text-muted-foreground text-sm font-medium">Latest News</span>
      <div v-if="dataSource" class="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
        Source: {{ dataSource }}
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="text-center py-4">
      <div class="text-destructive mb-2">
        <p class="text-sm">{{ error }}</p>
        <p v-if="errorDetails" class="text-xs mt-1 text-muted-foreground">{{ errorDetails }}</p>
      </div>
      <Button @click="fetchNews" variant="outline" class="mt-2">Try Again</Button>
    </div>
    
    <!-- News Cards Layout - Matching the image -->
    <div v-else-if="!noData" class="flex flex-col space-y-3">
      <!-- Primary news card - larger -->
      <div v-if="featuredNews" class="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div class="flex flex-col">
          <!-- Image -->
          <div class="h-36 overflow-hidden">
            <img v-if="featuredNews.imageUrl" :src="featuredNews.imageUrl" alt="Featured news" 
                class="w-full h-full object-cover">
            <div v-else class="w-full h-full bg-gray-100 flex items-center justify-center">
              <Icon name="lucide:newspaper" class="h-10 w-10 text-gray-400" />
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-3">
            <h3 class="font-medium text-base mb-1.5">{{ featuredNews.title }}</h3>
            <p class="text-xs text-gray-600 mb-2 line-clamp-2">
              {{ featuredNews.description || 'No description available' }}
            </p>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500">{{ formatDate(featuredNews.publishedAt) }}</div>
              <div class="flex gap-1.5">
                <a :href="featuredNews.url" target="_blank" 
                   class="px-2 py-0.5 bg-primary text-white text-xs rounded-md">Read Article</a>
                <button class="px-2 py-0.5 border border-gray-300 text-xs rounded-md">Explore</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Secondary news cards - smaller -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(item, index) in news.slice(0, 3)" :key="index" 
             class="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div class="flex flex-col">
            <!-- Image -->
            <div class="h-24 overflow-hidden">
              <img v-if="item.imageUrl" :src="item.imageUrl" alt="News image" 
                  class="w-full h-full object-cover">
              <div v-else class="w-full h-full bg-gray-100 flex items-center justify-center">
                <Icon name="lucide:newspaper" class="h-6 w-6 text-gray-400" />
              </div>
            </div>
            
            <!-- Content -->
            <div class="p-2">
              <h3 class="font-medium text-xs mb-1.5 line-clamp-2">{{ item.title }}</h3>
              <div class="flex items-center justify-between">
                <div class="text-xs text-gray-500">{{ formatDate(item.publishedAt) }}</div>
                <div class="flex gap-1">
                  <a :href="item.url" target="_blank" 
                     class="px-1.5 py-0.5 bg-primary text-white text-xs rounded-md">Read</a>
                  <button class="px-1.5 py-0.5 border border-gray-300 text-xs rounded-md">Explore</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center py-4">
      <div class="text-muted-foreground">
        <Icon name="lucide:newspaper" class="h-6 w-6 mx-auto mb-1.5" />
        <p class="text-xs">No financial news available</p>
      </div>
      <Button @click="fetchNews" variant="outline" class="mt-2 text-xs">Refresh</Button>
    </div>
    
    <!-- Data Source Message -->
    <div v-if="sourceMessage && !loading && !error" class="mt-3 text-xs text-muted-foreground bg-muted p-1.5 rounded-md">
      {{ sourceMessage }}
    </div>
  </div>
</template>

<script setup>
const loading = ref(true)
const error = ref(null)
const errorDetails = ref(null)
const featuredNews = ref(null)
const news = ref([])
const dataSource = ref(null)
const sourceMessage = ref(null)
const retryCount = ref(0)

// Check if there's data to display
const noData = computed(() => !featuredNews.value && (!news.value || news.value.length === 0))

// Function to format dates
const formatDate = (date) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    console.error('Date formatting error:', e)
    return 'Invalid date'
  }
}

// Fetch news from our API endpoint
const fetchNews = async () => {
  loading.value = true
  error.value = null
  errorDetails.value = null
  dataSource.value = null
  sourceMessage.value = null
  
  try {
    const { data, error: fetchError } = await useFetch('/api/financial-news', {
      // Add retry logic
      retry: 1,
      key: `financial-news-${Date.now()}`,
      // Add error handling options
      onResponseError({ response }) {
        console.error('API response error:', response.status, response.statusText)
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      },
      onRequestError({ error }) {
        console.error('Request error:', error)
        throw error
      }
    })
    
    // Check for fetch errors
    if (fetchError.value) {
      console.error('Fetch error:', fetchError.value)
      throw new Error(fetchError.value.message || 'Network error')
    }
    
    console.log('Response data:', data.value)
    
    // Check for API error response and display with any sample data provided
    if (data.value?.error) {
      error.value = 'Failed to fetch financial news'
      errorDetails.value = data.value.error
      console.error('API error:', data.value.error)
      
      // Still display sample data if provided despite error
      if (data.value.featured && data.value.items) {
        featuredNews.value = data.value.featured
        news.value = data.value.items || []
        dataSource.value = data.value.source || 'sample'
        error.value = null // Clear error if we have fallback data
        errorDetails.value = data.value.error // Keep error details for informational purposes
      }
    } 
    // Check if we have data
    else if (data.value) {
      // Set the data source information
      dataSource.value = data.value.source || 'unknown'
      sourceMessage.value = data.value.message || null
      
      // Check if we have any news items to display
      if ((!data.value.featured && (!data.value.items || data.value.items.length === 0))) {
        error.value = 'No financial news available'
      } else {
        featuredNews.value = data.value.featured
        news.value = data.value.items || []
      }
    } else {
      error.value = 'No data received from the server'
    }
  } catch (err) {
    console.error('Error fetching news:', err)
    error.value = 'Failed to load financial news'
    errorDetails.value = err.message || 'Unknown error'
    
    // Increment retry count
    retryCount.value++
    
    // Auto-retry after a delay for certain errors, up to 2 times
    if (retryCount.value <= 2 && (err.message?.includes('Network error') || err.message?.includes('timeout'))) {
      setTimeout(() => {
        console.log(`Auto-retrying (${retryCount.value}/2)...`)
        fetchNews()
      }, 3000) // Wait 3 seconds before retry
    }
  } finally {
    loading.value = false
  }
}

// Fetch news on component mount
onMounted(() => {
  fetchNews()
})
</script>