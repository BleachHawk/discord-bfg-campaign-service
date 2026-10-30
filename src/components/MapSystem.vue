<script setup lang="ts">
import type { Faction, System } from '@shared/types/types';

type SelectFunction = (system: System) => void;

const props = defineProps<{
    system: System,
    selectedSystem: System | null,
    selectSystem: SelectFunction,
    factions: Faction[],
    mapScale: number
}>()

</script>

<template>
    <!-- Interactive points -->
    <button class="map-system" :class="[system.type.toLowerCase(), {
        'point-highlighted':
            selectedSystem?.system_ID === system.system_ID
    }]" :style="{
            left: `${system.location_x}%`,
            top: `${system.location_y}%`,
        }" :aria-label="system.system_name" @pointerdown.stop @click.stop="selectSystem(system)">
        <span class="map-system-type">
            <img :src="system.typeIconUrl">
        </span>
        <span v-if="system.visibleScale ? mapScale >= system.visibleScale : true" :key="system.system_ID"
            class="map-system-label-container">
            <span class="map-system-label">{{ system.system_name }}</span>
            <!-- <span class="map-system-label">{{ system.visibleScale }}</span> -->
            <span v-if="system.currentFaction_ID" class="map-system-faction">
                <img :src="system.factionIconUrl">
            </span>
        </span>
    </button>
</template>

<style scoped>
.map-system {
    --point-color: 216, 201, 161;
    --label-highlight-color: 226 188 105;
    --font-size: 12px;
    --gap: 4px;
    --padding: 2px 2px 2px 2px;
    --map-system-label-transform: translateY(1.5px);

    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%) scale(var(--inverse-scale));

    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: var(--padding);

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



    .map-system-type,
    .map-system-faction {
        display: flex;

        img {
            max-height: calc(var(--font-size) + 4px);
        }
    }

    .map-system-label-container {
        display: contents;

        .map-system-label {
            pointer-events: none;
            transform: var(--map-system-label-transform);
            letter-spacing: 1px;
        }
    }

    &.hive {
        --font-size: 16px;
        --map-system-label-transform: translateY(2px);
        --gap: 6px;
        /* --padding: 2px; */
    }

    &.forge {
        --font-size: 16px;
        --map-system-label-transform: translateY(2px);
        --gap: 6px;
        /* --padding: 2px; */
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