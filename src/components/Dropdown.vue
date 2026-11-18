<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  options: Record<number, string>[];
}>();
const model = defineModel<Record<number, string> | null>({ default: null });
const emit = defineEmits<{
  select: [option: Record<number, string>];
}>();

const isOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);
const selectedOptionId = computed(() =>
  model.value ? Number(Object.keys(model.value)[0]) : null
);

function selectOption(option: Record<number, string>) {
  emit('select', option);
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

let computedButtonWidth = '';
const buttonWidth = computed(() => {
  if (computedButtonWidth) {
    return computedButtonWidth;
  }

  let longest = Math.max(
    ...props.options.map(option => {
      return option ? Object.values(option)[0]!.length : 0;
    }));
  computedButtonWidth = `${longest + 5}ch`
  return computedButtonWidth;
});

</script>

<template>
  <div ref="dropdown" class="dropdown">
    <button @click="isOpen = !isOpen" class="dropdown-button" :style="{ width: buttonWidth }">
      {{ model ? Object.values(model)[0] : '' }} <span class="dropdown-v">▼</span>
    </button>

    <div v-if="isOpen" class="dropdown-menu" :class="{ 'dropdown-menu-large': props.options.length > 15 }">
      <div v-for="option in props.options" :key="Object.keys(option)[0]" class="dropdown-option"
        :class="{ 'selected-option': Number(Object.keys(option)[0]) === selectedOptionId }"
        @click="selectOption(option)">
        {{ Object.values(option)[0] }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
  font-family: 'Adobe Caslon Pro';

  .dropdown-button {
    text-align: start;
    font-size: 16px;
    background: inherit;
    color: inherit;
    padding: 4px 6px 4px 6px;
    border: none;
    background-color: var(--color-background-light);
    cursor: pointer;

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

.dropdown-menu-large {
  min-width: 500px;
  columns: 3;
  column-gap: 0;

  .dropdown-option {
    break-inside: avoid;
  }
}

/* @media (min-width: 1200px) {
  .dropdown-menu-large {
    columns: 1;
  }
} */

.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-option:hover {
  background: var(--color-background-light);
}

.selected-option {
  backdrop-filter: brightness(1.5);
}
</style>