<template>
    <div class="flex flex-col gap-2 items-center w-full">
        <div class="w-1/3 flex flex-col gap-2 m-5">
            <SInput v-model="query" placeholder="Enter your query" />
            <SButton @click="handleClick">Click me</SButton>
        </div>
        <!-- <div ref="cardContainer" class="max-w-md flex flex-col gap-2 m-5"></div> -->
        <!-- <AdaptiveCard :card="adaptiveCardExample" :closable="true" /> -->
        <div v-for="card in object">
            <AdaptiveCard :card="card" :closable="true" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

const query = ref('')
const result = ref<any>('')

const { zodSchema } = await useAdaptiveSchema()

const { object, submit } = useObject({
    api: '/api/ui',
    schema: zodSchema.value!
})

const handleClick = async () => {
    console.log('[Six] Calling UI API: ', query.value)

    const response = await submit({
        query: query.value,
        rawData: { sus: query.value } 
    })

    console.log('[Six] Done Calling: ', response)
    result.value = response
}
</script>
