export const useCrawl = () => {
  // Reactive state
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const queries = ref<any[]>([])
  const results = ref<any[]>([])
  const progress = ref<{ [key: number]: string }>({})
  const isComplete = ref(false)
  
  // EventSource instance
  let eventSource: EventSource | null = null
  
  // Start crawling with the given query
  const startCrawl = async (query: string) => {
    // Reset state
    isLoading.value = true
    error.value = null
    queries.value = []
    results.value = []
    progress.value = {}
    isComplete.value = false
    
    // Close any existing connection
    if (eventSource) {
      eventSource.close()
    }
    
    try {
      // Create EventSource connection to the endpoint
      const url = `/api/crawl?query=${encodeURIComponent(query)}`
      eventSource = new EventSource(url)
      
      // Handle incoming events
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.event) {
          case 'queries':
            queries.value = data.data
            // Initialize results array with empty slots
            results.value = Array(data.data.length).fill(null)
            break
            
          case 'status':
            progress.value = {
              ...progress.value,
              [data.data.index]: data.data.status
            }
            break
            
          case 'result':
            // Update the specific result by index
            results.value = [
              ...results.value.slice(0, data.data.index),
              data.data.result,
              ...results.value.slice(data.data.index + 1)
            ]
            progress.value = {
              ...progress.value,
              [data.data.index]: 'completed'
            }
            break
            
          case 'error':
            if (data.data.index !== undefined) {
              // Individual query error
              progress.value = {
                ...progress.value,
                [data.data.index]: 'error'
              }
            } else {
              // Global error
              error.value = data.data
            }
            break
            
          case 'complete':
            isComplete.value = true
            isLoading.value = false
            if (eventSource) {
              eventSource.close()
              eventSource = null
            }
            break
        }
      }
      
      // Handle connection errors
      eventSource.onerror = (e) => {
        error.value = 'Connection error with the server'
        isLoading.value = false
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
      }
      
    } catch (err: any) {
      error.value = err.message || 'An error occurred'
      isLoading.value = false
    }
  }
  
  // Cancel the ongoing crawl
  const cancelCrawl = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    isLoading.value = false
  }
  
  // Cleanup function to close EventSource when component unmounts
  onUnmounted(() => {
    if (eventSource) {
      eventSource.close()
    }
  })
  
  // Calculate overall progress
  const overallProgress = computed(() => {
    if (!queries.value.length) return 0
    
    const completedCount = Object.values(progress.value).filter(
      status => status === 'completed'
    ).length
    
    return Math.round((completedCount / queries.value.length) * 100)
  })
  
  return {
    // State
    isLoading,
    error,
    queries,
    results,
    progress,
    isComplete,
    overallProgress,
    
    // Actions
    startCrawl,
    cancelCrawl
  }
}

