<template>
    <div class="flex flex-col gap-2 items-center w-full">
        <div class="w-1/3 flex flex-col gap-2 m-5">
            <SInput v-model="query" placeholder="Enter your query" />
            <SButton 
                @click="handleClick"
                :disabled="isLoading"
                class="relative"
            >
                <span v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                    <div class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                </span>
                <span :class="{ 'opacity-0': isLoading }">Click me</span>
            </SButton>
        </div>
        <!-- <div ref="cardContainer" class="max-w-md flex flex-col gap-2 m-5"></div> -->
        <!-- <AdaptiveCard :card="adaptiveCardExample" :closable="true" /> -->
        <div v-for="card in cards">
            <AdaptiveCard :card="card" :closable="true" />
        </div>
    </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue'

const query = ref('')
const result = ref<any>('')
const isLoading = ref(false)

const { zodSchema } = await useAdaptiveSchema()

const { object: cards, submit } = useObject({
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
