<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  options: Record<number, string>[];
}>();
const model = defineModel<Record<number, string> | null>({ default: null });

const isOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);

function selectOption(option: Record<number, string>) {
  model.value = option;
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdown.value && !dropdown.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});

const buttonWidth = computed(() => {
  const longest = Math.max(
    ...props.options.map(option => {
      return option ? Object.values(option)[0]!.length : 0;
    }));
  return `${longest + 4}ch`;
});

</script>

<template>
  <div ref="dropdown" class="dropdown">
    <button @click="isOpen = !isOpen" class="button-styled" :style="{ width: buttonWidth }">
      {{ model ? Object.values(model)[0] : '' }} <span class="dropdown-v">▼</span>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <div v-for="option in props.options" :key="Object.keys(option)[0]" class="dropdown-option"
        @click="selectOption(option)">
        {{ Object.values(option)[0] }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  --button-styled-fontSize: 16px;
  position: relative;
  display: inline-block;

  .button-styled {
    text-align: start;

    .dropdown-v {
      float: right;
    }
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 120%;
  background: var(--color-background);
  border: 1px solid var(--color-text);
  z-index: 5;
  font-family: 'Adobe Caslon Pro';
}

.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-option:hover {
  background: var(--color-background-light);
}
</style>