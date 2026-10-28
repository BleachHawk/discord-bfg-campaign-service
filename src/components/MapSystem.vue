<script setup lang="ts">
import type { System } from './Types.vue';
import { computed } from 'vue';

type SelectFunction = (system: System) => void;

const props = defineProps<{
    system: System,
    selectedPointId: number | null,
    selectPoint: SelectFunction,
    icons: { [k: string]: string; }
}>()

// find the corresponding icon for the given system type
const systemIconUrl = computed(() =>
    props.system.type
        ? props.icons[props.system.type.toLowerCase()]
        : ''
);

// find the corresponding icon for the given faction
const factionIconUrl = computed(() =>
    props.system.currentFaction
        ? props.icons[props.system.currentFaction]
        : ''
);
</script>

<template>
    <!-- Interactive points -->
    <button :key="system.system_ID" class="map-system" :class="[system.type?.toLowerCase(), {
        'point-highlighted':
            selectedPointId === system.system_ID
    }]" :style="{
        left: `${system.location_x}%`,
        top: `${system.location_y}%`,
    }" :aria-label="system.system_name" @pointerdown.stop @click.stop="selectPoint(system)">
        <span class="map-system-type">
            <img :src="systemIconUrl">
        </span>
        <span class="map-system-label">{{ system.system_name }}</span>
        <span v-if="system.currentFaction" class="map-system-faction">
            <img :src="factionIconUrl">
        </span>
    </button>
</template>

<style scoped>

.map-system {
    --point-color: 216, 201, 161;
    --label-highlight-color: 226 188 105;
    --font-size: 12px;

    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);

    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 4px 4px 10px;

    /* border-radius: 0; */
    /* background: transparent; */
    color: rgb(var(--point-color));
    background-color: rgba(100, 100, 100, 0.7);
    border: 0;
    border-radius: 5px;

    cursor: pointer;
    white-space: nowrap;
    font: inherit;
    font-size: var(--font-size);
    text-shadow: 0 1px 3px #000;

    transition: color 150ms ease, filter 150ms ease;

    &.hive {
        --font-size: 18px;
    }

    &.forge {
        --font-size: 18px;
    }

    .map-system-label {
        pointer-events: none;
        transform: translateY(2px);
        letter-spacing: 1px;
    }

    .map-system-type,
    .map-system-faction {
        min-width: 20px;
        display: flex;

        img {
            max-height: calc(var(--font-size) + 4px);
        }
    }

    &:hover,
    &.point-highlighted {
        color: #fff0c4;
        /* background: transparent; */
        outline: none;
        filter: drop-shadow(0 0 5px rgba(var(--point-color), 0.85));

        .map-system-label {
            border-color: rgb(var(--label-highlight-color));
        }
    }

    &:focus-visible {
        outline: 1px solid rgb(var(--label-highlight-color));
        outline-offset: 5px;
    }
}
</style>