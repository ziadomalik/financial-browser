<template>
  <div class="relative w-[450px] mt-4">
    <SInput 
        v-model="searchQuery"
        class="h-[50px] w-full rounded-full pl-12" 
        placeholder="Just type and insights will show" 
        @keyup.enter="handleSearch"
        :disabled="isLoading"
    />
    <span class="absolute left-0 inset-y-0 flex items-center justify-center px-4">
        <Icon v-if="!isLoading" name="i-ph-magnifying-glass" class="size-5 text-[#DE3819]" />
        <div v-else class="animate-spin size-5 text-[#DE3819]">
            <Icon name="i-ph-spinner" class="size-5" />
        </div>
    </span>
    <button 
        @click="handleSearch" 
        class="absolute right-0 inset-y-0 flex items-center justify-center px-4"
        :disabled="isLoading || !searchQuery.trim()"
    >
        <span 
            class="px-3 py-1 rounded-full bg-[#DE3819] text-white text-sm font-medium" 
            :class="{'opacity-70': isLoading || !searchQuery.trim()}"
        >
            Search
        </span>
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';


const searchQuery = ref('');
const result = ref<any>('')
const isLoading = ref(false);

const { zodSchema } = await useAdaptiveSchema()

const { object: UiCards, submit } = useObject({
    api: '/api/ui',
    schema: zodSchema.value!
})

// Handle search event
const handleSearch = async () => {
    if (!searchQuery.value.trim() || isLoading.value) return;
    
    // Set loading state
    isLoading.value = true;
    result.value = ''
    
    try {
        const response = await $fetch(`/api/six-data?query=${encodeURIComponent(searchQuery.value)}`)
        console.log('[Six] Done Calling: ', response)
        result.value = response
        // Track the search event using the Nuxt app
        const { $trackSearch } = useNuxtApp();
        if ($trackSearch) {
            $trackSearch(searchQuery.value);}


    } catch (error) {
        console.error('[Six] API error', error);
        isLoading.value = false;
        result.value = {
            error: true,
            message: error instanceof Error ? error.message : 'Failed to fetch data from API'
        }
    } finally {}

    try {
        await submit({
            userQuery: searchQuery.value,
            toolCallJsonResult: result.value
        }) // -> updates the UiCards object

        console.log('UI Components rendered successfully')

    } catch (error) {

        console.error('Error rendering UI components:', error);
    }
    
    finally{
        isLoading.value = false;
    }

}
</script>