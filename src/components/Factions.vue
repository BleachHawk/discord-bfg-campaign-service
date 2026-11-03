<script setup lang="ts">
import type { Battle, Faction } from '@shared/types/types';

const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
}>()

</script>

<template>
    <div style="position: absolute;">Factions</div>
</template>

<style scoped>
    /* .v-enter-active,
    .v-leave-active {
    transition: opacity 5s ease;
    } */
</style>