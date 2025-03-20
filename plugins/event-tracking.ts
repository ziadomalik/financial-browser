import { defineNuxtPlugin } from '#app'
import type { Router } from 'vue-router'

export default defineNuxtPlugin((nuxtApp) => {
    // Get the event tracker from the socket plugin (might be undefined)
    const eventTracker = nuxtApp.$eventTracker as any

    // Track click directive
    nuxtApp.vueApp.directive('track-click', {
        mounted(el, binding) {
            const value = binding.value || {}
            const elementType = value.type || 'unknown'
            const additionalData = value.data || {}

            el.addEventListener('click', () => {
                if (eventTracker?.trackClick) {
                    eventTracker.trackClick(el.id || 'unnamed-element', elementType, additionalData)
                } else {
                    console.warn('eventTracker not available, click not tracked')
                }
            })
        }
    })

    // Track search directive
    nuxtApp.vueApp.directive('track-search', {
        mounted(el, binding) {
            const filters = binding.value || {}

            // Works for input elements
            if (el.tagName === 'INPUT') {
                el.addEventListener('keyup', (event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                        if (eventTracker?.trackSearch) {
                            eventTracker.trackSearch(el.value, filters)
                        } else {
                            console.warn('eventTracker not available, search not tracked')
                        }
                    }
                })
            }

            // Works for form elements
            if (el.tagName === 'FORM') {
                el.addEventListener('submit', (event: SubmitEvent) => {
                    const inputEl = el.querySelector('input[type="search"], input[type="text"]')
                    if (inputEl) {
                        if (eventTracker?.trackSearch) {
                            eventTracker.trackSearch((inputEl as HTMLInputElement).value, filters)
                        } else {
                            console.warn('eventTracker not available, search not tracked')
                        }
                    }
                })
            }
        }
    })

    // Track zoom directive
    nuxtApp.vueApp.directive('track-zoom', {
        mounted(el, binding) {
            const viewportInfo = binding.value || {}
            let lastScale = 1

            // Track pinch zoom on mobile
            el.addEventListener('gesturechange', (event: Event) => {
                const scale = (event as any).scale
                // Only track significant zoom changes
                if (Math.abs(scale - lastScale) > 0.1) {
                    if (eventTracker?.trackZoom) {
                        eventTracker.trackZoom(scale, viewportInfo)
                    } else {
                        console.warn('eventTracker not available, zoom not tracked')
                    }
                    lastScale = scale
                }
            })

            // Track mouse wheel zoom
            el.addEventListener('wheel', (event: WheelEvent) => {
                if (event.ctrlKey) {
                    const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1
                    lastScale += zoomDelta
                    if (eventTracker?.trackZoom) {
                        eventTracker.trackZoom(lastScale, viewportInfo)
                    } else {
                        console.warn('eventTracker not available, zoom not tracked')
                    }

                    // Prevent default zoom behavior
                    event.preventDefault()
                }
            }, { passive: false })
        }
    })

    // Navigation tracking
    // This will be automatically applied to all page navigations
    const router = nuxtApp.$router as Router

    if (router) {
        let currentRoute = router.currentRoute.value.path

        router.afterEach((to) => {
            const from = currentRoute
            currentRoute = to.path

            if (eventTracker?.trackNavigation) {
                eventTracker.trackNavigation(from, to.path)
            } else {
                console.warn('eventTracker not available, navigation not tracked')
            }
        })
    }

    // Fallback functions if eventTracker is not available
    return {
        provide: {
            trackClick: (elementId: string, elementType: string, additionalData?: any) => {
                if (eventTracker?.trackClick) {
                    eventTracker.trackClick(elementId, elementType, additionalData)
                } else {
                    console.warn('eventTracker not available, click not tracked')
                }
            },
            trackSearch: (query: string, filters?: any) => {
                if (eventTracker?.trackSearch) {
                    eventTracker.trackSearch(query, filters)
                } else {
                    console.warn('eventTracker not available, search not tracked')
                }
            },
            trackZoom: (zoomLevel: number, viewportInfo?: any) => {
                if (eventTracker?.trackZoom) {
                    eventTracker.trackZoom(zoomLevel, viewportInfo)
                } else {
                    console.warn('eventTracker not available, zoom not tracked')
                }
            },
            trackVoice: (command: string, confidence?: number) => {
                if (eventTracker?.trackVoice) {
                    eventTracker.trackVoice(command, confidence)
                } else {
                    console.warn('eventTracker not available, voice not tracked')
                }
            },
            trackNavigation: (from: string, to: string) => {
                if (eventTracker?.trackNavigation) {
                    eventTracker.trackNavigation(from, to)
                } else {
                    console.warn('eventTracker not available, navigation not tracked')
                }
            }
        }
    }
}) 