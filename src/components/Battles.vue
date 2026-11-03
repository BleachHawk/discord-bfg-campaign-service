<script setup lang="ts">
import type { Battle, Faction } from '@shared/types/types';

const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
}>()

</script>

<template>
    <div style="position: absolute;">Battles</div>
</template>

<style scoped>

</style>