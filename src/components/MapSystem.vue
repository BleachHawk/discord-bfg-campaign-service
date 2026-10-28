<script setup lang="ts">
import type { System } from './Types.vue';
import { computed } from 'vue';

type SelectFunction = (system: System) => void;

const props = defineProps<{
    system: System,
    selectedPointId: number | null,
    selectPoint: SelectFunction
}>()

const icons = Object.fromEntries(
    Object.entries(import.meta.glob('/src/assets/icons/*.png', {
        eager: true,
        query: '?url',
        import: 'default'
    })).map(([path, url]) => [
        path.split('/').pop()!.replace('.png', ''),
        url
    ])
);

const iconUrl = computed(() =>
    props.system.currentFaction
        ? icons[props.system.currentFaction]
        : ''
);
</script>

<template>
    <!-- Interactive points -->
    <button :key="system.system_ID" class="map-point" :class="{
        'point-highlighted':
            selectedPointId === system.system_ID
    }" :style="{
        left: `${system.location_x}%`,
        top: `${system.location_y}%`,
    }" :aria-label="system.system_name" @pointerdown.stop @click.stop="selectPoint(system)">
        <span class="map-point-dot" :class="[system.type?.toLowerCase()]"></span>
        <span class="map-point-label">{{ system.system_name }}</span>
        <span v-if="system.currentFaction" class="map-point-faction">
            <img :src="iconUrl">
        </span>
    </button>
</template>

<style scoped>
.map-point {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border: 0;
    border-radius: 4px;
    color: white;
    background: rgb(12 20 30 / 75%);
    cursor: pointer;
    white-space: nowrap;
    font: inherit;
    font-size: 12px;
    touch-action: manipulation;

    &:hover,
    &.point-highlighted {
        background: #28465a;
        outline: 1px solid #8ad2e6;
    }

    .map-point-label {
        pointer-events: none;
    }

    .map-point-dot {
        width: 9px;
        height: 9px;
        flex: 0 0 9px;
        border-radius: 50%;
        background: #dad8d3;

        &.hive {
            background: #f3c96b;
            box-shadow: 0 0 8px rgb(243 201 107 / 60%);
        }

        &.forge {
            background: #f37b6b;
            box-shadow: 0 0 8px rgb(243 123 107 / 60%);
        }
    }

    .map-point-faction,
    .map-point-faction img {
        max-height: 16px;
    }
}
</style>