<script setup lang="ts">
import type { System } from './Types.vue';
import { computed } from 'vue';

type SelectFunction = (system: System) => void;

const props = defineProps<{
    system: System,
    selectedPointId: number | null,
    selectPoint: SelectFunction
}>()

// find all the icons and map them to their names
const icons = Object.fromEntries(
    Object.entries(import.meta.glob('/src/assets/icons/*.svg', {
        eager: true,
        query: '?url',
        import: 'default'
    })).map(([path, url]) => [
        path.split('/').pop()!.replace('.svg', ''),
        url
    ])
);

// find the corresponding icon for the given faction
const iconUrl = computed(() =>
    props.system.currentFaction
        ? icons[props.system.currentFaction]
        : ''
);
</script>

<template>
    <!-- Interactive points -->
    <button :key="system.system_ID" class="map-point" :class="[system.type?.toLowerCase(), {
        'point-highlighted':
            selectedPointId === system.system_ID
    }]" :style="{
        left: `${system.location_x}%`,
        top: `${system.location_y}%`,
    }" :aria-label="system.system_name" @pointerdown.stop @click.stop="selectPoint(system)">
        <span class="map-point-dot"></span>
        <span class="map-point-label">{{ system.system_name }}</span>
        <span v-if="system.currentFaction" class="map-point-faction">
            <img :src="iconUrl">
        </span>
    </button>
</template>

<style scoped>
/* .map-point {
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
} */

.map-point {
    /* --point-color: rgb(216 201 161);
    --point-type-color: rgb(188 165 108); */
    --point-color: 216, 201, 161;
    --point-type-color: 188, 165, 108;
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
        --point-type-color: 243, 201, 107;
        --font-size: 18px;

        .map-point-dot {
            &::before {
                content: "";
                position: absolute;
                border: 1px solid rgb(var(--point-type-color));
                inset: -5px;
                transform: rotate(45deg);
            }
        }

    }

    &.forge {
        --point-type-color: 199, 108, 97;
        --font-size: 18px;

        .map-point-dot {
        }
    }

    .map-point-label {
        pointer-events: none;
        padding-left: 5px;
        transform: translateY(2px);
        letter-spacing: 1px;
    }

    .map-point-dot {
        position: relative;
        width: 10px;
        height: 10px;
        flex: 0 0 10px;
        border-radius: 50%;
        background: rgb(var(--point-type-color));
        box-shadow: 0 0 0 2px #17202a, 0 0 0 3px rgb(var(--point-type-color));

        /* &::before { */
        /* content: "";
            position: absolute;
            inset: -5px; */
        /* border: 1px solid rgb(188 165 108 / 70%); */
        /* border: 1px solid rgb(var(--point-type-color)); */
        /* transform: rotate(45deg); */
        /* } */

        /* &::after {
            content: "";
            position: absolute;
            left: 50%;
            top: -9px;
            width: 1px;
            height: 28px;
            background: rgb(188 165 108 / 55%);
            transform: translateX(-50%);
        } */
    }

    .map-point-faction {
        min-width: 20px;
    }

    .map-point-faction,
    .map-point-faction img {
        max-height: calc(var(--font-size) + 4px);
    }

    &:hover,
    &.point-highlighted {
        color: #fff0c4;
        /* background: transparent; */
        outline: none;
        filter: drop-shadow(0 0 5px rgba(var(--point-color), 0.85));

        .map-point-label {
            border-color: rgb(var(--label-highlight-color));
        }

        .map-point-dot {
            /* box-shadow: 0 0 0 2px #17202a, 0 0 0 3px rgb(var(--label-highlight-color)),
                0 0 5px rgba(var(--point-type-color), 0.65); */

            /* 0 0 10px rgb(226 188 105 / 65%); */

            box-shadow: 0 0 0 2px #17202a, 0 0 0 3px rgb(var(--point-type-color));
        }
    }

    &:focus-visible {
        outline: 1px solid rgb(var(--label-highlight-color));
        outline-offset: 5px;
    }
}
</style>