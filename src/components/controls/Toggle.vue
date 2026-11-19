<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    init: boolean
}>();

const enabled = ref(props.init);

</script>

<template>
    <label class="toggle-switch">
        <input type="checkbox" v-model="enabled">
        <span class="slider"></span>
    </label>
</template>

<style scoped>
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
}

/* Hide the actual checkbox */
.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

/* Background */
.slider {
    position: absolute;
    inset: 0;
    background-color: var(--color-background-light);
    border: 1px solid var(--color-background);
    border-radius: 24px;
    transition: 0.2s;
}

/* The ball */
.slider::before {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    left: 2px;
    top: 2px;
    background-color: var(--color-text);
    border-radius: 50%;
    transition: 0.2s;
}

/* ON state */
input:checked + .slider {
    background-color: var(--color-background);
}

input:checked + .slider::before {
    transform: translateX(20px);
}
</style>