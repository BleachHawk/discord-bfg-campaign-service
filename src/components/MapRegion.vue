<script setup lang="ts">
import type { Subsector } from './Types.vue';

defineProps<{
    subsector: Subsector,
    hoveredSubsectorId: number | null
}>()

function polygonCoordinates(subsector: Subsector) {
    return subsector.polygon_points
        .map(([px, py]) => `${px},${py}`)
        .join(' ');
}

</script>

<template>
    <polygon :key="subsector.subsector_ID" :points="polygonCoordinates(subsector)" :class="{
        'subsector-highlighted': hoveredSubsectorId === subsector.subsector_ID,
        'subsector-dimmed': hoveredSubsectorId && hoveredSubsectorId !== subsector.subsector_ID,
    }" />
</template>

<style scoped></style>