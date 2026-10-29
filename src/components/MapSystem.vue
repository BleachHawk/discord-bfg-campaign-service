<script setup lang="ts">
import type { Faction, System } from './Types.vue';
import { computed } from 'vue';

type SelectFunction = (system: System) => void;

const props = defineProps<{
    system: System,
    selectedPointId: number | null,
    selectPoint: SelectFunction,
    icons: { [k: string]: string; },
    factions: Faction[],
    mapScale: number
}>()

// find the corresponding icon for the given system type
const systemIconUrl = computed(() =>
    props.icons[props.system.type.toLowerCase()]
);

// find the corresponding icon for the given faction
const factionIconUrl = computed(() => {
    const currentFactionID = props.system.currentFaction_ID;
    if (!currentFactionID) {
        return '';
    } else {
        const key = props.factions.find(fac => fac.faction_ID === currentFactionID)?.short_name;
        return key ? props.icons[key] : '';
    }
});
</script>

<template>
    <!-- Interactive points -->
    <button v-if="system.visibleScale ? mapScale >= system.visibleScale : true" :key="system.system_ID"
        class="map-system" :class="[system.type.toLowerCase(), {
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
        <!-- <span class="map-system-label">{{ system.visibleScale }}</span> -->
        <span v-if="system.currentFaction_ID" class="map-system-faction">
            <img :src="factionIconUrl">
        </span>
    </button>
    <!-- only show the system type icon -->
    <div v-else class="map-system" :style="{
        left: `${system.location_x}%`,
        top: `${system.location_y}%`,
    }">
        <span class="map-system-type">
            <img :src="systemIconUrl">
        </span>
    </div>
</template>

<style scoped>
.map-system {
    --point-color: 216, 201, 161;
    --label-highlight-color: 226 188 105;
    --font-size: 12px;
    --gap: 2px;
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

    .map-system-label {
        pointer-events: none;
        transform: var(--map-system-label-transform);
        letter-spacing: 1px;
    }

    .map-system-type,
    .map-system-faction {
        display: flex;

        img {
            max-height: calc(var(--font-size) + 4px);
        }
    }

    &.hive {
        --font-size: 16px;
        --map-system-label-transform: translateY(2px);
        --gap: 5px;
        /* --padding: 2px; */
    }

    &.forge {
        --font-size: 16px;
        --map-system-label-transform: translateY(2px);
        --gap: 5px;
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