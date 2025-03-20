<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
useHead({
  title: 'Financial Browser',
  meta: [
    { name: 'description', content: 'A deep financial research and visualization tool' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.ico' }
  ]
})
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body {
  background-color: #f5f5f5;
}

.text-primary {
  color: #0284c7;
}

.bg-primary {
  background-color: #0284c7;
}

.border-primary {
  border-color: #0284c7;
}

.focus\:ring-primary:focus {
  --tw-ring-color: #0284c7;
}

.hover\:bg-primary\/90:hover {
  background-color: rgba(2, 132, 199, 0.9);
}
</style>
