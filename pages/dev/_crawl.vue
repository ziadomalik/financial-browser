<template>
  <div class="p-4">
    <div class="flex flex-col gap-2 justify-center max-w-md">
      <div class="text-2xl font-semibold">Crawl Testing</div>
      <div class="flex gap-2">
        <SInput type="text" v-model="userQuery" placeholder="Enter your financial query" />
        <SButton @click="handleSubmit" :disabled="isLoading">Search</SButton>
        <SButton v-if="isLoading" @click="cancelCrawl">Cancel</SButton>
      </div>
    </div>
    <pre>{{ result }}</pre>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="isLoading || queries.length" class="results">
      <div class="progress-bar">
        <div class="progress" :style="{ width: `${overallProgress}%` }"></div>
        <span>{{ overallProgress }}% Complete</span>
      </div>
      <div v-for="(query, index) in queries" :key="index" class="query-item">
        <h3>Query {{ index + 1 }}</h3>
        <p><strong>Prompt:</strong> {{ query.prompt }}</p>
        <p><strong>Sites:</strong> {{ query.relevantSites.join(', ') }}</p>
        <p><strong>Status:</strong> {{ progress[index] || 'Pending' }}</p>
        <div v-if="results[index]" class="result">
          <h4>Results:</h4>
          <pre>{{ JSON.stringify(results[index], null, 2) }}</pre>
        </div>
      </div>
    </div>
    <div v-if="isComplete" class="complete-message">
      All queries completed!
    </div>
  </div>
</template>

<script setup lang="ts">
const { 
  startCrawl, 
  cancelCrawl, 
  isLoading, 
  queries, 
  results, 
  progress, 
  overallProgress,
  isComplete,
  error 
} = useCrawl()

const userQuery = ref('')

const handleSubmit = () => {
  if (userQuery.value) {
    startCrawl(userQuery.value)
  }
}
</script>
