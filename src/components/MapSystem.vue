<script setup lang="ts">
import type { Faction, System } from '@shared/types/types';

const props = defineProps<{
    system: System,
    selectedSystem: System | null,
    factions: Faction[],
    mapScale: number,
    uiScale: number
}>()

const emit = defineEmits<{
    select: [value: System];
}>();
function selectSystem(system: System) {
    emit('select', system);
}

</script>

<template>
    <!-- Interactive points -->
    <button class="map-system" :style="{ left: `${system.location_x}%`, top: `${system.location_y}%` }"
        :aria-label="system.system_name" @pointerdown.stop @click.stop="selectSystem(system)">
        <span class="map-system-content" :class="{
            'point-highlighted':
                selectedSystem?.system_ID === system.system_ID,
            'map-system-sector-capital':
                system.capital_type_ID === 1,
            'map-system-subsector-capital':
                system.capital_type_ID === 2
        }" :style="{ scale: `${system.scale! * 0.85 * uiScale}` }">
            <span class="map-system-type">
                <img :src="system.typeIconUrl">
            </span>
            <span v-if="system.visibleScale ? mapScale >= system.visibleScale : true"
                class="map-system-label-container">
                <span class="map-system-label">{{ system.system_name }}</span>
            </span>
            <span v-else-if="system.ownership" style="border-left: 1px solid #909090; font-size: 10px;">
                <wbr>
            </span>
            <span class="map-system-faction">
                <img :src="system.factionIconUrl">
            </span>
        </span>
    </button>
</template>

<style scoped>
.map-system {
    --label-highlight-color: 226 188 105;
    --gap: 4px;
    --padding: 2px 2px 2px 2px;
    --map-system-label-transform: translateY(1.5px);

    position: absolute;
    transform: translate(-50%, -50%) scale(var(--inverse-scale));
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--gap);

    color: rgb(var(--selected-color));
    border: 0;
    border-radius: 5px;

    cursor: pointer;
    white-space: nowrap;
    font: inherit;
    text-shadow: 0 1px 3px #000;

    transition: color 150ms ease, filter 150ms ease;

    width: max-content;
    height: max-content;
    padding: 0;
    background: transparent;

    .map-system-content {
        display: flex;
        align-items: center;
        gap: var(--gap);
        padding: var(--padding);

        background-color: rgba(100, 100, 100, 0.7);
        border-radius: 5px;
        transform-origin: center;

        &.map-system-sector-capital {
            border: 1px solid white;
        }

        &.map-system-subsector-capital {
            border: 1px dashed white;
        }

        .map-system-type,
        .map-system-faction {
            display: flex;

            img {
                /* arbitrary for now, look into it later */
                max-height: 20px;
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

        &:hover,
        &.point-highlighted {
            color: #fff0c4;
            outline: none;
            filter: drop-shadow(0 0 5px rgba(var(--selected-color)));
        }

        &.point-highlighted {
            filter: drop-shadow(0 0 10px rgba(var(--selected-color)));
            outline: 1px solid rgb(var(--label-highlight-color));
            outline-offset: 5px;
        }

        &:focus-visible {
            outline: 1px solid rgb(var(--label-highlight-color));
            outline-offset: 5px;
        }
    }


}
</style>