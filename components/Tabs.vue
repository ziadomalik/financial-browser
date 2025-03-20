<template>
  <header class="bg-[#ECECEC] p-4 flex items-center gap-2">
    <!-- Loop through all tabs -->
    <div class="flex-1 flex items-center">
        <div 
          v-for="tab in tabsStore.tabs" 
          :key="tab.id"
          @click="tabsStore.setActiveTab(tab.id)"
          class="flex text-[#323232] items-center gap-2 px-3 py-2 mx-2 cursor-pointer transition-colors"
          :class="[tab.active ? 'bg-white' : 'bg-gray-100', 'rounded-md hover:bg-gray-50']"
        >
          <img src="~/assets/images/six-logo.png" alt="logo" class="h-3">
          <span class="text-sm font-medium">{{ tab.title }}</span>
          <Icon 
            name="i-ph-x-light" 
            class="h-4 w-4 text-[#A2A2A2] hover:text-[#323232]" 
            @click.stop="tabsStore.closeTab(tab.id)" 
          />
        </div>
        <button 
          class="flex items-center justify-center gap-2 text-[#DE3819] ml-3"
          @click="tabsStore.addTab()"
        >
          <Icon name="i-ph-plus-bold" class="h-4" />
        </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTabsStore } from '~/stores/tabs'

const tabsStore = useTabsStore()

// Ensure we always have at least one tab
onMounted(() => {
  tabsStore.initialize()
})
</script>