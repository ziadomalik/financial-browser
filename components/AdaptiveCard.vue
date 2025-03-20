<template>
  <div class="bento-card rounded-3xl border border-neutral-200 text-card-foreground overflow-hidden max-w-md shadow-sm">
    <div v-if="closable" class="flex items-center justify-end p-3">
      <button 
        @click="emit('close')" 
        class="rounded-full opacity-80 transition-all hover:opacity-100 focus:outline-none h-6 w-6 flex items-center justify-center bg-white/20 hover:bg-white/30"
        aria-label="Close"
      >
        <Icon name="i-ph-x-light" class="h-3 w-3 text-foreground/80" />
      </button>
    </div>
    <div class="px-4 pb-4 pt-2">
      <div ref="cardContainer" class="flex flex-col gap-2"></div>
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
    try {
        const adaptiveCard = new AdaptiveCards.AdaptiveCard();
        
        adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
            fontFamily: "Inter, Helvetica Neue, sans-serif",
            fontSizes: {
              small: 12,
              default: 14,
              medium: 16,
              large: 18,
              extraLarge: 22
            }
        });

        adaptiveCard.onExecuteAction = (action: AdaptiveCards.Action) => emit('executeAction', action);
        adaptiveCard.parse(props.card);
        const renderedCard = adaptiveCard.render();

        if (cardContainer.value) {
            cardContainer.value.appendChild(renderedCard!);
        }
    } catch (error) {
        console.error('Error rendering adaptive card:', error);
        
        // Create a simple fallback display if the card can't be rendered
        if (cardContainer.value) {
            const fallbackContent = document.createElement('div');
            fallbackContent.className = 'p-4 bg-neutral-100 rounded-xl';
            
            const title = document.createElement('h3');
            title.className = 'font-bold text-base mb-2';
            title.textContent = props.card.title || 'Card Content';
            
            const content = document.createElement('pre');
            content.className = 'text-sm whitespace-pre-wrap';
            content.textContent = JSON.stringify(props.card, null, 2);
            
            fallbackContent.appendChild(title);
            fallbackContent.appendChild(content);
            cardContainer.value.appendChild(fallbackContent);
        }
    }
})
</script>

<style>
/* Neutral bento card styling */
.bento-card {
  @apply relative bg-white;
}

/* Container styling */
.ac-container {
  @apply rounded-2xl;
}

/* Selectable elements styling */
.ac-selectable {
  @apply cursor-pointer transition-all hover:bg-neutral-100;
}

/* Image styling */
.ac-image {
  @apply rounded-2xl overflow-hidden shadow-sm;
}

/* Button styling */
.ac-pushButton {
  @apply inline-flex items-center justify-center rounded-full text-xs font-medium transition-all focus-visible:outline-none bg-primary/90 text-primary-foreground hover:bg-primary h-8 px-4 py-1.5 shadow-sm;
  margin-top: 0.25rem !important;
  margin-bottom: 0.25rem !important;
}

/* Vertical spacing for elements */
.ac-actionSet, .ac-columnSet, .ac-container, .ac-image, .ac-textBlock {
  margin-bottom: 0.5rem;
}

/* Link styling */
.ac-linkButton {
  @apply inline-flex items-center justify-center text-xs font-semibold transition-colors focus-visible:outline-none text-primary underline-offset-2 hover:underline;
}

/* Input styling */
.ac-input {
  @apply flex h-9 w-full rounded-full border border-input bg-background px-4 py-1.5 text-sm ring-0 file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50;
  margin-bottom: 0.35rem;
  transition: all 0.15s ease;
}

/* Specific input types */
.ac-textInput {
  @apply w-full;
}

.ac-multiline {
  @apply min-h-[70px] py-2 rounded-2xl;
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

/* Typography enhancements */
.ac-textBlock {
  @apply leading-snug text-sm font-medium;
}

/* Card sections */
.ac-columnSet {
  @apply gap-2;
}

/* Additional elements */
.ac-textBlock:first-child {
  @apply font-bold text-base;
}

.ac-factset {
  @apply rounded-xl bg-neutral-50 p-3;
}

/* Alternating row styling for factsets */
.ac-factset .ac-fact:nth-child(odd) .ac-factTitle,
.ac-factset .ac-fact:nth-child(odd) .ac-factValue {
  @apply bg-neutral-100 rounded-lg px-2;
}

/* Card title with underline */
.ac-container > div:first-child > .ac-textBlock {
  @apply border-b border-neutral-200 pb-2 mb-3;
}
</style>
