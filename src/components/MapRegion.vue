<script setup lang="ts">
import type { Subsector } from '@shared/types/types';

defineProps<{
    subsector: Subsector,
    hoveredSubsector: Subsector | null,
    selectedSubsector: Subsector | null
}>()

const emit = defineEmits<{
    select: [value: Subsector];
}>();
function selectSubsector(subsector: Subsector) {
    emit('select', subsector);
}

function polygonCoordinates(subsector: Subsector) {
    return subsector.polygon_points
        .map(([px, py]) => `${px},${py}`)
        .join(' ');
}

</script>

<template>
    <polygon :points="polygonCoordinates(subsector)" :class="{
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