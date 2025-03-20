import * as AdaptiveCards from 'adaptivecards';

export default defineNuxtPlugin(() => {
    // Configure AdaptiveCards globally
    try {
        // Disable schema validation to avoid CORS issues
        if (AdaptiveCards.GlobalSettings) {
            // Try different properties based on the version
            // @ts-ignore - We're handling property existence at runtime
            if ('enableSchemaValidation' in AdaptiveCards.GlobalSettings) {
                // @ts-ignore
                AdaptiveCards.GlobalSettings.enableSchemaValidation = false;
            }

            // @ts-ignore
            if ('useBuiltInInputValidation' in AdaptiveCards.GlobalSettings) {
                // @ts-ignore
                AdaptiveCards.GlobalSettings.useBuiltInInputValidation = false;
            }
        }

        console.log('AdaptiveCards configured successfully');
    } catch (error) {
        console.error('Error configuring AdaptiveCards:', error);
    }
}); 