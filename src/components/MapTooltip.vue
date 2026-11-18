<script setup lang="ts">
import type { Faction, Subsector, System, SystemType } from '@shared/types/types';
import { computed } from 'vue';
import * as utils from '@shared/utils/utils';
import * as service from './Service';
import type { Navigation } from '@/App.vue';

const props = defineProps<{
    selectedSubsector: Subsector | null,
    hoveredSubsector: Subsector | null,
    selectedSystem: System | null,
    hoveredSystem: System | null,
    factions: Faction[],
    systemTypes: SystemType[],
    navigation: Navigation,
}>()

const tooltipSubsector = computed(() => {
    if (props.selectedSystem) {
        return;
    }

    const subsector = props.hoveredSubsector ?? props.selectedSubsector;
    if (!subsector) return null;
    let leadingFactionBlock = null;
    if (subsector.ownership) {
        leadingFactionBlock = utils.getBlockFaction(subsector.ownership.currentFaction_ID, props.factions);
    }

    return {
        ...subsector,
        currentFactionBlock: leadingFactionBlock,
        selected: props.selectedSubsector?.subsector_ID === subsector.subsector_ID,
        factionIconUrl: service.getFactionIconUrl(subsector.ownership?.currentFaction_ID, props.factions),
        numberIconUrl: service.getLatinNumberIconUrl(subsector.subsector_ID)
    }
});
const tooltipSystem = computed(() => {
    if (props.selectedSubsector) {
        return;
    }

    const system = props.hoveredSystem ?? props.selectedSystem;
    if (!system) return null;
    const systemType = utils.getSystemType(system.system_type_ID, props.systemTypes);

    return {
        ...system,
        system_type_name: systemType?.system_type_name,
        system_type_description: systemType?.description,
        system_type_importance: systemType?.importance,
        selected: props.selectedSystem?.system_ID === system.system_ID
    };
});

</script>

<template>
    <!-- TODO: show slim tooltip on hover and detailed on click -->
    <div class="map-tooltip" :class="{ 'map-tooltip-selected': tooltipSystem?.selected || tooltipSubsector?.selected }">
        <template v-if="tooltipSystem">
            <div class="map-tooltip-icon-container">
                <img :src="tooltipSystem.typeIconUrl" style="max-width: 80px;">
            </div>
            <strong>
                {{ tooltipSystem.system_name }} {{ tooltipSystem.capital_type_ID === 1 ? '(Sector Capital)' :
                    (tooltipSystem.capital_type_ID === 2 ? '(Subsector Capital)' : '') }}
            </strong>
            <article>
                <details>
                    <summary>{{ tooltipSystem.system_type_name }} - Strategic value {{
                        tooltipSystem.system_type_importance }}</summary>
                    <p>
                        {{ tooltipSystem.system_type_description }}
                    </p>
                </details>
                <details>
                    <summary>Description</summary>
                    <p>
                        {{ tooltipSystem.description }}
                    </p>
                </details>
            </article>

            <div v-if="tooltipSystem.battles">
                <br>
                <article>
                    <details>
                        <summary>Battles</summary>
                        <ul class="battles-list">
                            <!-- only show the last 3 -->
                            <li v-for="battle in tooltipSystem?.battles.sort((a, b) => b.battle_ID - a.battle_ID).slice(-3)" :key="battle.battle_ID">
                                <a @click="props.navigation.openBattlesView(battle.battle_ID)">
                                <div>
                                    <span>{{ service.getFactionNameByID(battle.battle_faction1, factions) }}</span>
                                    <span class="battle_vp">({{ battle.battle_victoryPoints1 }})</span>
                                </div>
                                <div>
                                    <span>{{ service.getFactionNameByID(battle.battle_faction2, factions) }}</span>
                                    <span class="battle_vp">({{ battle.battle_victoryPoints2 }})</span>
                                </div>
                                </a>
                            </li>
                            <span v-if="tooltipSystem?.battles.length > 3">[...]</span>
                        </ul>
                    </details>
                </article>
            </div>

            <div v-if="tooltipSystem.ownership">
                <br>
                <article>
                    <span v-if="tooltipSystem.ownership.currentFaction_ID !== 100">Currently under control of
                    </span>
                    <span v-else>Currently </span>
                    <details>
                        <summary>{{ service.getFactionNameByID(tooltipSystem.ownership.currentFaction_ID,
                            props.factions) }}
                        </summary>
                        <ul>
                            <li v-for="[factionId, power] in
                                Object.entries(tooltipSystem?.ownership.factionPower ?? {})
                                    .sort(([, a], [, b]) => b - a)" :key="factionId">
                                {{ service.getFactionNameByID(Number.parseInt(factionId), props.factions) }} :
                                {{ power }}
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

            <div v-if="tooltipSubsector?.ownership?.currentFaction_ID">
                <br>
                <article>
                    <span v-if="tooltipSubsector.ownership.currentFaction_ID !== 100">Currently under control of
                    </span>
                    <span v-else>Currently </span>
                    <details>
                        <summary>{{ service.getFactionNameByID(tooltipSubsector.ownership.currentFaction_ID,
                            props.factions)
                        }}</summary>
                        <ul>
                            <li v-for="[factionId, power] in
                                Object.entries(tooltipSubsector?.ownership.factionPower ?? {})
                                    .sort(([, a], [, b]) => b - a)" :key="factionId">
                                {{ service.getFactionNameByID(Number.parseInt(factionId), props.factions) }} : {{ power
                                }}
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
    min-width: 380px;
    max-width: 380px;
    max-height: 85vh;
    overflow-y: scroll;
    padding: 12px 8px 12px 12px;
    border: 1px solid var(--color-text);
    border-radius: 6px;
    background-color: var(--tooltip-background);
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
            overflow-y: auto;
            overflow-x: hidden;

            &.battles-list {
                overflow: hidden;
                display: grid;
                gap: 10px;

                .battle_vp {
                    float: right;
                }
            }
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
        filter: drop-shadow(2px 4px 6px rgb(var(--selected-color)));
    }
}
</style>