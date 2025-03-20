<template>
    <div class="flex flex-col gap-2 items-center w-full">
        <div class="w-1/3 flex flex-col gap-2 m-5">
            <SInput v-model="query" placeholder="Enter your query" />
            <SButton @click="handleClick">Click me</SButton>
        </div>
        <!-- <div ref="cardContainer" class="max-w-md flex flex-col gap-2 m-5"></div> -->
        <!-- <AdaptiveCard :card="adaptiveCardExample" :closable="true" /> -->
        <pre class="text-xs max-w-xl">{{ result }}</pre>
    </div>
</template>

<script setup lang="ts">
const query = ref('')
const result = ref<any>('')

const handleClick = async () => {
    console.log('[Six] Calling UI API: ', query.value)

    const response = await $fetch(`/api/ui`, {
        method: 'POST',
        body: {
            query: query.value,
            rawData: { sus: query.value } 
        }
    })

    console.log('[Six] Done Calling: ', response)
    result.value = response
}
</script>
