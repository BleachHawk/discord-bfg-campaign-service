<script setup lang="ts">
import type { Faction, Subsector, System, SystemType } from '@shared/types/types';
import { computed } from 'vue';
import * as utils from '@shared/utils/utils';
import * as service from './Service.vue';

const props = defineProps<{
    selectedSubsector: Subsector | null,
    hoveredSubsector: Subsector | null,
    selectedSystem: System | null,
    hoveredSystem: System | null,
    factions: Faction[],
    systemTypes: SystemType[]
}>()

const tooltipSubsector = computed(() => {
    const subsector = props.hoveredSubsector ?? props.selectedSubsector;
    if (!subsector) return null;
    let leadingFactionBlock = null;
    if (subsector.ownership) {
        leadingFactionBlock = utils.getBlockFaction(subsector.ownership.currentFaction_ID, props.factions);
    }

    return {
        ...subsector,
        currentFactionBlock: leadingFactionBlock,
        selected: (props.selectedSubsector?.subsector_ID === props.hoveredSubsector?.subsector_ID) ? true : false,
        factionIconUrl: service.getFactionIconUrl(subsector.ownership?.currentFaction_ID, props.factions),
        numberIconUrl: service.getLatinNumberIconUrl(subsector.subsector_ID)
    }
});
const tooltipSystem = computed(() => {
    const system = props.hoveredSystem ?? props.selectedSystem;
    if (!system) return null;
    const systemType = utils.getSystemType(system.system_type_ID, props.systemTypes);

    return {
        ...system,
        system_type_name: systemType?.system_type_name,
        system_type_description: systemType?.description,
        system_type_importance: systemType?.importance,
    };
});

</script>

<template>
    <!-- TODO: show slim tooltip on hover and detailed on click -->
    <div class="map-tooltip" :class="{ 'map-tooltip-selected': selectedSystem || selectedSubsector }">
        <template v-if="tooltipSystem">
            <div class="map-tooltip-icon-container">
                <img :src="tooltipSystem.typeIconUrl" style="max-width: 80px;">
            </div>
            <strong>
                {{ tooltipSystem.system_name }}
            </strong>
            <article>
                <details>
                    <summary>{{ tooltipSystem.system_type_name }}</summary>
                    <p>
                        {{ tooltipSystem.system_type_description }}
                        Importance: {{ tooltipSystem.system_type_importance }}
                    </p>
                </details>
                <details>
                    <summary>Description</summary>
                    <p>
                        {{ tooltipSystem.description }}
                    </p>
                </details>
            </article>

            <div v-if="tooltipSystem.ownership">
                <br>
                <article>
                    <span v-if="tooltipSystem.ownership.currentFaction_ID !== 100">Currently under control of
                    </span>
                    <span v-else>Currently </span>
                    <details>
                        <summary>{{ service.getFactionNameByID(tooltipSystem.ownership.currentFaction_ID, props.factions) }}
                        </summary>
                        <ul>
                            <li v-for="[factionId, power] in
                                Object.entries(tooltipSystem?.ownership.factionPower ?? {})
                                    .sort(([, a], [, b]) => b - a)" :key="factionId">
                                {{ service.getFactionNameByID(Number.parseInt(factionId), props.factions) }} : {{ power }}
                            </li>
                        </ul>
                    </details>
                </article>
                <div class="map-tooltip-icon-container">
                    <img :src="tooltipSystem.factionIconUrl" style="max-width: 80px;">
                </div>
            </div>
        </template>

        <template v-else-if="tooltipSubsector">
            <div class="map-tooltip-icon-container">
                <img :src="tooltipSubsector?.numberIconUrl" style="max-width: 80px;">
            </div>
            <strong>
                '{{ tooltipSubsector?.subsector_name }}' Subsector
            </strong>
            <article>
                <details>
                    <summary>Description</summary>
                    <p>
                        {{ tooltipSubsector?.description }}
                    </p>
                </details>
            </article>

            <div v-if="tooltipSubsector?.ownership">
                <br>
                <article>
                    <span v-if="tooltipSubsector.ownership.currentFaction_ID !== 100">Currently under control of
                    </span>
                    <span v-else>Currently </span>
                    <details>
                        <summary>{{ service.getFactionNameByID(tooltipSubsector.ownership.currentFaction_ID, props.factions)
                            }}</summary>
                        <ul>
                            <li v-for="[factionId, power] in
                                Object.entries(tooltipSubsector?.ownership.factionPower ?? {})
                                    .sort(([, a], [, b]) => b - a)" :key="factionId">
                                {{ service.getFactionNameByID(Number.parseInt(factionId), props.factions) }} : {{ power }}
                            </li>
                        </ul>
                    </details>
                </article>
                <div class="map-tooltip-icon-container">
                    <img :src="tooltipSubsector.factionIconUrl" style="max-width: 80px;">
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.map-tooltip {
    position: absolute;
    z-index: 5;
    top: 110px;
    left: 10px;
    min-width: 20vw;
    max-width: 20vw;
    max-height: 85vh;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid var(--color-text);
    border-radius: 6px;
    background: var(--tooltip-background);
    pointer-events: none;
    cursor: default;

    strong {
        font-size: 18px;
    }

    p {
        margin-bottom: 0;
    }

    article {
        font-family: "Adobe Caslon Pro";
        letter-spacing: 1px;
        padding: 5px;
        background-color: var(--color-background-light);

        details>summary {
            cursor: pointer;
            padding: 10px 0 5px 5px;
            background-color: rgb(var(--tooltip-background-color) / 75%);
        }

        details>ul {
            padding-top: 5px;
        }

        details>p {
            padding: 5px;
        }
    }

    .map-tooltip-icon-container {
        display: flex;
        justify-content: center;
    }

    &.map-tooltip-selected {
        pointer-events: all;
    }
}
</style>