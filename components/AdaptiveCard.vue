<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden max-w-lg">
    <div v-if="closable" class="flex items-center justify-end p-3 pb-0">
      <button 
        @click="emit('close')" 
        class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-6 w-6 flex items-center justify-center"
        aria-label="Close"
      >
        <Icon name="i-ph-x-light" class="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
    <div class="p-3 pb-0">
      <div ref="cardContainer" class="flex flex-col gap-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as AdaptiveCards from "adaptivecards";

const cardContainer = ref<HTMLDivElement | null>(null)
const props = defineProps<{ 
    card: Record<string, any>, 
    interactive?: boolean,
    closable?: boolean 
}>()

const emit = defineEmits(['executeAction', 'close'])

onMounted(() => {
    const adaptiveCard = new AdaptiveCards.AdaptiveCard();
    adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
        fontFamily: "Segoe UI, Helvetica Neue, sans-serif",
    });

    adaptiveCard.onExecuteAction = (action: AdaptiveCards.Action) => emit('executeAction', action)
    adaptiveCard.parse(props.card);
    const renderedCard = adaptiveCard.render();

    if (cardContainer.value) {
        cardContainer.value.appendChild(renderedCard!);
    }
})
</script>

<style>
/* Styling based on https://learn.microsoft.com/en-us/adaptive-cards/sdk/rendering-cards/javascript/native-styling */

/* Container styling */
.ac-container {
  @apply rounded-md;
}

/* Selectable elements styling */
.ac-selectable {
  @apply cursor-pointer transition-colors hover:bg-accent;
}

/* Image styling */
.ac-image {
  @apply rounded-md overflow-hidden;
}

/* Button styling - changed to secondary */
.ac-pushButton {
  @apply inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2;
  margin-top: 0.25rem !important;
  margin-bottom: 0.25rem !important;
}

/* Vertical spacing for elements */
.ac-actionSet, .ac-columnSet, .ac-container, .ac-image, .ac-textBlock {
  margin-bottom: 0.5rem;
}

/* Link styling */
.ac-linkButton {
  @apply inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-primary underline-offset-4 hover:underline;
}

/* Input styling */
.ac-input {
  @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
  margin-bottom: 0.5rem;
}

/* Specific input types */
.ac-textInput {
  @apply w-full;
}

.ac-multiline {
  @apply min-h-[80px];
}

.ac-numberInput {
  @apply [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none;
}

.ac-dateInput, .ac-timeInput {
  @apply cursor-pointer;
}

.ac-multichoiceInput {
  @apply p-0 h-auto;
}
</style>
