<template>
    <div class="logo-container" :class="{ 'animate': animation !== false, 'no-hover': disableHover }">
        <svg width="250" height="250" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g class="logo-elements">
                <circle class="outer-circle" cx="125" cy="125" r="125" fill="#DE3819" fill-opacity="0.05" />
                <circle class="middle-circle" cx="125" cy="125" r="82.9208" fill="#DE3819" fill-opacity="0.05" />
                <ellipse class="inner-circle" cx="125" cy="123.763" rx="55.6931" ry="54.4554" fill="#DE3819" fill-opacity="0.1" />
                <path
                    d="M126.238 131.601C124.003 131.601 122.104 130.818 120.539 129.254C118.975 127.69 118.193 125.791 118.193 123.556V107.467C118.193 105.232 118.975 103.333 120.539 101.769C122.104 100.204 124.003 99.4224 126.238 99.4224C128.472 99.4224 130.372 100.204 131.936 101.769C133.5 103.333 134.282 105.232 134.282 107.467V123.556C134.282 125.791 133.5 127.69 131.936 129.254C130.372 130.818 128.472 131.601 126.238 131.601ZM123.556 150.371V142.126C118.908 141.5 115.065 139.422 112.026 135.891C108.987 132.36 107.467 128.249 107.467 123.556H112.83C112.83 127.265 114.137 130.427 116.752 133.042C119.366 135.656 122.528 136.964 126.238 136.964C129.947 136.964 133.109 135.656 135.723 133.042C138.338 130.427 139.645 127.265 139.645 123.556H145.008C145.008 128.249 143.489 132.36 140.45 135.891C137.411 139.422 133.567 141.5 128.919 142.126V150.371H123.556Z"
                    fill="#DE3819" />
            </g>
        </svg>
    </div>
</template>

<script setup lang="ts">
defineProps<{ animation?: boolean, disableHover?: boolean }>()
</script>

<style scoped>
.logo-container {
    position: relative;
    display: inline-block;
    cursor: pointer;
    padding: 30px;
    overflow: visible;
    transition: transform 0.3s ease;
}

.logo-container.animate .outer-circle {
    animation: pulse-outer 5s ease-in-out infinite;
}

.logo-container.animate .middle-circle {
    animation: pulse-middle 4s ease-in-out infinite;
}

.logo-container.animate .inner-circle {
    animation: pulse-inner 3s ease-in-out infinite;
}

.logo-container:hover {
    transform: scale(1.1);
}

.logo-container:hover .outer-circle {
    animation: pulse-outer-hover 5s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container:hover .middle-circle {
    animation: pulse-middle-hover 4s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container:hover .inner-circle {
    animation: pulse-inner-hover 3s ease-in-out infinite;
    animation-delay: 0s;
}

.logo-container.no-hover:hover {
    transform: none;
}

.logo-container.no-hover:hover .outer-circle,
.logo-container.no-hover:hover .middle-circle,
.logo-container.no-hover:hover .inner-circle {
    animation: none;
}

@keyframes pulse-outer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
}

@keyframes pulse-middle {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes pulse-inner {
    0%, 100% { transform: scale(1.02); }
    50% { transform: scale(0.98); }
}

@keyframes pulse-outer-hover {
    0%, 100% { transform: scale(1.03); }
    50% { transform: scale(1.08); }
}

@keyframes pulse-middle-hover {
    0%, 100% { transform: scale(1.05); }
    50% { transform: scale(1.12); }
}

@keyframes pulse-inner-hover {
    0%, 100% { transform: scale(1.08); }
    50% { transform: scale(0.95); }
}

circle, ellipse, path {
    transform-origin: center;
}

.logo-elements {
    transform-origin: center;
    transition: transform 0.3s ease;
    transform-box: fill-box;
}

svg {
    overflow: visible;
}
</style>
