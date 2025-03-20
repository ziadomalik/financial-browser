<template>
    <div class="max-w-md flex flex-col gap-2 m-5">
        <SInput v-model="query" placeholder="Enter your query" />
        <SButton @click="handleClick">Click me</SButton>
        <pre>{{ result }}</pre> 
    </div>
</template>

<script setup lang="ts">
const query = ref('')
const result = ref('')

const handleClick = async () => {
    console.log('[Six] Calling API: ', query.value)
    const response = await $fetch(`/api/six?query=${encodeURIComponent(query.value)}`)
    console.log('[Six] Done Calling: ', response)

    console.log(response)
    result.value = response
}
</script>
