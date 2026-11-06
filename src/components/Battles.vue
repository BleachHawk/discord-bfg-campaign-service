<script setup lang="ts">
import type { Battle, Faction, Subsector, System, SystemType } from '@shared/types/types';
import { computed, ref } from 'vue';
import Dropdown from './Dropdown.vue';
import * as service from './Service';
import * as utils from '@shared/utils/utils'

const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
    subsectors: Subsector[],
    systems: System[],
    systemTypes: SystemType[]
}>();

interface BattleResult extends Battle {
    dateString: string;
    system: System | null;
    winner: number | null;
    loser: number | null;
    controlPoints: number | null;
}

const expandedBattleEntries = ref<Record<number, boolean>>({});

function getControlPoints(battle: Battle): number | null {
    const vpDifference = Math.abs(
        battle.battle_victoryPoints1 - battle.battle_victoryPoints2
    );
    if (vpDifference < 1) {
        return null;
    }
    return utils.getControlPoints(vpDifference);
}

const filterOptionALL = 'All';

const sortedBattles = computed(() => {
    const filteredFaction = Number(Object.keys(filter_faction_selected.value)[0]);
    const filteredSubsector = Number(Object.keys(filter_subsector_selected.value)[0]);
    const filteredSystem = Number(Object.keys(filter_system_selected.value)[0]);

    return props.battles
        .filter(battle =>
            (filteredFaction === 0 ||
                battle.battle_faction1 === filteredFaction ||
                battle.battle_faction2 === filteredFaction)
            &&
            (filteredSubsector === 0 ||
                props.systems.find(s => s.system_ID === battle.battle_system)?.subsector_ID === filteredSubsector)
            &&
            (filteredSystem === 0 ||
                battle.battle_system === filteredSystem)
        )
        .map(battle => ({
            ...battle,
            ...{
                system: props.systems.find(s => s.system_ID === battle.battle_system),
                dateString: new Date(battle.timestamp).toISOString().slice(0, 10),
                winner: battle.battle_victoryPoints1 > battle.battle_victoryPoints2
                    ? battle.battle_faction1
                    : battle.battle_victoryPoints2 > battle.battle_victoryPoints1
                        ? battle.battle_faction2
                        : null,
                loser: battle.battle_victoryPoints1 > battle.battle_victoryPoints2
                    ? battle.battle_faction2
                    : battle.battle_victoryPoints2 > battle.battle_victoryPoints1
                        ? battle.battle_faction1
                        : null,
                controlPoints: getControlPoints(battle)
            }
        })).sort((a, b) => b.battle_ID - a.battle_ID) as BattleResult[];
});

function getVictoryPercentage(vp1: number, vp2: number) {
    const total = vp1 + vp2;
    if (total === 0) return 50;
    return (vp1 / total) * 100;
}

const filter_factions_options = computed(() => {
    return [
        { 0: filterOptionALL },
        ...props.factions
            .sort((a, b) => 
                a.faction_name.localeCompare(b.faction_name)
            )
            .filter(faction => faction.faction_ID !== 100 &&
                faction.faction_ID !== 1 &&
                faction.faction_ID !== 2 &&
                faction.faction_ID !== 3)
            .map(faction => ({
                [faction.faction_ID]: faction.faction_name
            }))
    ];
});
let filter_faction_selected = ref<Record<number, string>>({ 0: filterOptionALL });

const filter_subsectors_options = computed(() => {
    return [
        { 0: filterOptionALL },
        ...props.subsectors
            .sort((a, b) => a.subsector_ID - b.subsector_ID)
            .map(subsector => ({
                [subsector.subsector_ID]: '(' + subsector.subsector_ID + ') ' + subsector.subsector_name
            }))
    ];
});
let filter_subsector_selected = ref<Record<number, string>>({ 0: filterOptionALL });

const filter_systems_options = computed(() => {
    return [
        { 0: filterOptionALL },
        ...props.systems
            .sort((a, b) => {
                var textA = a.system_name.toLowerCase();
                var textB = b.system_name.toLowerCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            })
            .map(system => ({
                [system.system_ID]: system.system_name
            }))
    ];
});
let filter_system_selected = ref<Record<number, string>>({ 0: filterOptionALL });

</script>

<template>
    <!-- <div>
        <Transition> -->
    <div v-if="props.battles" id="battles-overview">

        <!-- TODO: implement filters: points, phase, date, free string (players) ? -->

        <div id="filters">
            <div class="filter-block">
                Faction
                <Dropdown :options="filter_factions_options" v-model="filter_faction_selected" />
            </div>

            <div class="filter-block">
                Subsector
                <Dropdown :options="filter_subsectors_options" v-model="filter_subsector_selected" />
            </div>

            <div class="filter-block">
                System
                <Dropdown :options="filter_systems_options" v-model="filter_system_selected" />
            </div>
        </div>

        <ul id="battles-list">
            <span v-if="!sortedBattles || sortedBattles.length < 1">No battles found</span>
            <li v-for="battle in sortedBattles" :key="battle.battle_ID" class="list-entry"
                data-keywords="official upToDate">
                <!-- <img :src="service.getLatinNumberIconUrl(1)" alt="handbook"> -->
                <article>
                    <details
                        @toggle="expandedBattleEntries[battle.battle_ID] = ($event.target as HTMLDetailsElement).open">
                        <summary>
                            <div class="summary-content">
                                <span class="block-column">
                                    <span class="flex-segment">
                                        <img :src="service.getLatinNumberIconUrl(battle.system?.subsector_ID)"
                                            alt="subsector_img" class="optional-img">
                                        <img :src="service.getTypeIconUrl(battle.system?.system_type_ID, props.systemTypes)"
                                            alt="systemtype_img" class="optional-img">
                                        <div class="text">{{ battle.system?.system_name }}</div>
                                    </span>
                                    <span v-if="expandedBattleEntries[battle.battle_ID]" class="additional info">
                                        <span>Date: {{ battle.dateString }}</span>
                                        <span class="optional-text">(Phase {{ battle.phase?.campaign_phase_ID }})</span>
                                        <span v-if="battle.battle_author" class="optional-text">
                                            {{ battle.battle_author }}
                                        </span>
                                    </span>
                                </span>
                                <span class="block-column text" style="max-width: 220px;">
                                    <span class="flex-element info">
                                        Points: {{ battle.battle_points }}
                                    </span>
                                    <span v-if="expandedBattleEntries[battle.battle_ID]" class="additional">
                                        {{ battle.battle_scenario }}
                                    </span>
                                </span>
                                <span class="block-column">
                                    <span class="flex-segment">
                                        <img :src="service.getFactionIconUrl(battle.battle_faction1, factions)"
                                            alt="faction1_img" class="optional-img">
                                        <span class="text">
                                            {{ service.getFactionNameByID(battle.battle_faction1, factions) }} -
                                            <span class="optional-text">Victory points:</span>
                                            {{ battle.battle_victoryPoints1 }}
                                        </span>
                                    </span>
                                    <span v-if="expandedBattleEntries[battle.battle_ID] && battle.battle_player1"
                                        class="additional">{{ battle.battle_player1 }}</span>
                                </span>
                                <span class="block-column optional-column">
                                    <span class="flex-segment">
                                        <span class="victory-bar">
                                            <span class="victory-bar-faction"
                                                :class="[(battle.battle_victoryPoints1 > battle.battle_victoryPoints2) ? 'victory-bar-winner' : 'victory-bar-loser']"
                                                :style="{ width: `${getVictoryPercentage(battle.battle_victoryPoints1, battle.battle_victoryPoints2)}%` }" />
                                            <span class="victory-bar-faction"
                                                :class="[(battle.battle_victoryPoints1 < battle.battle_victoryPoints2) ? 'victory-bar-winner' : 'victory-bar-loser']"
                                                :style="{ flex: 1 }" />
                                        </span>
                                    </span>
                                    <span v-if="expandedBattleEntries[battle.battle_ID]" class="additional info">
                                        <span class="optional-text">Winner: </span>
                                        <span>
                                            {{ service.getFactionNameByID(battle.winner, props.factions) }}
                                        </span>
                                        <span>
                                            (Control points: {{ battle.controlPoints }})
                                        </span>
                                    </span>
                                </span>
                                <span class="block-column">
                                    <span class="flex-segment">
                                        <img :src="service.getFactionIconUrl(battle.battle_faction2, factions)"
                                            alt="faction1_img" class="optional-img">
                                        <span class="text">
                                            {{ service.getFactionNameByID(battle.battle_faction2, factions) }} -
                                            <span class="optional-text">Victory points:</span>
                                            {{ battle.battle_victoryPoints2 }}
                                        </span>
                                    </span>
                                    <span v-if="expandedBattleEntries[battle.battle_ID] && battle.battle_player2"
                                        class="additional">{{ battle.battle_player2 }}</span>
                                </span>
                            </div>
                        </summary>
                        <div class="article-content">
                            <div v-if="battle.battle_report" class="report">
                                <div>Report:</div>
                                {{ battle.battle_report }}
                            </div>
                        </div>
                    </details>
                </article>
            </li>
        </ul>
    </div>
    <!-- </Transition>
    </div> -->
</template>

<style scoped>
/* .v-leave-active */
.v-enter-active {
    transition: opacity 1.5s ease;
}

#battles-overview {
    position: absolute;
    height: stretch;
    width: 100vw;

    /* height: calc(100vh - 150px);
    width: calc(100vw - 100px);
    transform: translate(50px, 50px);
    border: 1px solid antiquewhite; */

    padding-right: 2vw;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--color-background);

    #filters {
        padding: 10px 0 0 40px;
        display: flex;
        gap: 20px;

        .filter-block {}
    }

    #battles-list {
        margin-top: 10px;
        list-style-type: none;
        display: grid;
        gap: 20px;

        .list-entry {
            display: flex;
            border-radius: 4px;
            padding: 0.5em 0.5em 0.5em;
            background-color: var(--color-background-light);
            font-family: 'Adobe Caslon Pro';
            /* border: 1px solid var(--color-text); */

            article,
            details {
                width: 100%;
            }

            details[open]>summary::before {
                transform: rotate(90deg);
                transform-origin: center;
            }

            summary {
                container-type: inline-size;
                cursor: pointer;

                display: block;
                position: relative;
                list-style: none;
                padding-left: 24px;

                &::marker {
                    /* remove default marker */
                    content: "";
                }

                &::-webkit-details-marker {
                    /* remove default marker */
                    display: none;
                }

                &::before {
                    content: "▶";
                    position: absolute;
                    left: 4px;
                    top: 8px;
                    display: block;
                    font-size: 12px;
                    line-height: 1;
                }
            }

            /* rudimentary support for smaller screens / minimized browsers */
            /* no mobile support yet */
            @container (max-width: 900px) {
                .optional-img {
                    display: none;
                }
            }

            @container (max-width: 1300px) {
                .optional-column {
                    display: none;
                }
            }

            @container (max-width: 1500px) {
                .optional-text {
                    display: none;
                }
            }

            .summary-content {
                display: inline-flex;
                align-items: center;
                justify-content: space-between;
                width: calc(100% - 1.5em);
                vertical-align: middle;

                .info {
                    display: flex;
                    gap: 10px;
                    flex: 1;
                }

                .additional {
                    filter: brightness(0.85);
                }

                >.block-column {
                    flex: 1;

                    >.flex-segment {
                        min-height: 26px;
                        display: flex;
                        align-items: center;
                        padding-bottom: 5px;
                    }
                }

                .victory-bar {
                    display: flex;
                    width: 100%;
                    height: 8px;
                    overflow: hidden;
                    border-radius: 6px;
                    gap: 2px;
                    margin-right: 30px;
                    box-shadow: 3px 3px 2px var(--color-background), 1px 1px 1px var(--color-background);

                    .victory-bar-faction {
                        height: inherit;
                        background: rgb(94 235 204 / 48%);
                    }

                    .victory-bar-winner {
                        background: rgb(126 199 33 / 48%);
                    }

                    .victory-bar-loser {
                        background: rgb(233 77 77 / 48%);
                    }
                }
            }

            .article-content {
                padding: 5px;
                cursor: default;
                filter: brightness(0.85);
            }

            img {
                padding: 0 10px 0 0;
                max-width: 35px;
                filter: grayscale(60%);
            }

            .text {
                transform: translateY(3px);
            }
        }
    }
}
</style>