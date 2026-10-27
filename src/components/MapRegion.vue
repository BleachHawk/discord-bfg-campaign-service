<script lang="ts" setup>
import type { SubSector } from './Types.vue';

defineProps<{
    subsector: SubSector,
    hoveredAreaId: String | null
}>()

function polygonCoordinates(area: SubSector) {
    return area.points
        .map(([px, py]) => `${px},${py}`)
        .join(' ');
}

</script>

<template>
    <polygon :key="subsector.id" :points="polygonCoordinates(subsector)" :class="{
        'area-highlighted': hoveredAreaId === subsector.id,
        'area-dimmed': hoveredAreaId && hoveredAreaId !== subsector.id,
    }" />
</template>

<style scoped></style>