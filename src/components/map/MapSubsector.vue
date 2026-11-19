<script setup lang="ts">
import type { Subsector } from '@shared/types/types';

/**
 * The vue props.
 */
defineProps<{
    subsector: Subsector,
    hoveredSubsector: Subsector | null,
    selectedSubsector: Subsector | null
}>()

/**
 * Emit a subsector selection.
 */
const emit = defineEmits<{
    select: [value: Subsector];
}>();

/**
 * Selecting a given subsector.
 * @param system the subsector system
 */
function selectSubsector(subsector: Subsector) {
    emit('select', subsector);
}

/**
 * Get the polygon coordinates for the given subsector.
 * @param subsector the string containing the subsector polygon coordinates
 */
function getPolygonCoordinates(subsector: Subsector): string {
    return subsector.polygon_points
        .map(([px, py]) => `${px},${py}`)
        .join(' ');
}

</script>

<template>
    <polygon :points="getPolygonCoordinates(subsector)" :class="{
        'subsector-highlighted': hoveredSubsector?.subsector_ID === subsector.subsector_ID,
        'subsector-selected': selectedSubsector?.subsector_ID === subsector.subsector_ID,
        'subsector-dimmed': (hoveredSubsector?.subsector_ID && hoveredSubsector?.subsector_ID !== subsector.subsector_ID) ||
            (selectedSubsector?.subsector_ID && selectedSubsector?.subsector_ID !== subsector.subsector_ID),
    }" @click.stop="selectSubsector(subsector)" />
</template>

<style scoped>
polygon {
    fill: #45c5e8;
    fill-opacity: 0.1;
    stroke: #8ad2e6;
    stroke-width: 0.25;
    stroke-opacity: 1;
    vector-effect: non-scaling-stroke;
    /* cursor: pointer; */
    stroke-linejoin: round;

    transition:
        fill-opacity 550ms ease,
        stroke-opacity 200ms ease,
        stroke-width 200ms ease;

    &.subsector-dimmed {
        fill-opacity: 0.05;
        stroke-opacity: 0.5;
    }

    &.subsector-highlighted {
        fill: #45c5e8;
        fill-opacity: 0.15;
        stroke-width: 0.6;
    }

    &.subsector-selected {
        fill: #45c5e8;
        fill-opacity: 0.3;
        stroke-width: 0.6;
        stroke: rgb(var(--selected-color));
        filter: drop-shadow(0 0 5px rgba(var(--selected-color), 0.65));
    }
}
</style>