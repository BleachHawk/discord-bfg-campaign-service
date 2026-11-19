<script setup lang="ts">
import type { Battle, Faction, Subsector, System, SystemType } from '@shared/types/types';
import { computed, ref, watch } from 'vue';
import Dropdown from './controls/Dropdown.vue';
import * as service from './Service';
import * as utils from '@shared/utils/utils'
import type { Navigation } from '@/App.vue';

/**
 * The vue props.
 */
const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
    subsectors: Subsector[],
    systems: System[],
    systemTypes: SystemType[],
    navigation: Navigation,
}>();

/**
 * Interface extension of a Battle, with additional fields for this view.
 */
interface BattleResult extends Battle {
    dateString: string;
    system: System | null;
    winner: number | null;
    loser: number | null;
    controlPoints: number | null;
}

// expanded entries
const expandedBattleEntries = ref<Record<number, boolean>>({});

// filters
const filterOptionALL = 'All';
let filter_faction_selected = ref<Record<number, string>>({ 0: filterOptionALL });
let filter_subsector_selected = ref<Record<number, string>>({ 0: filterOptionALL });
let filter_system_selected = ref<Record<number, string>>({ 0: filterOptionALL });
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
const filter_systems_options = computed(() => {
    const selectedSubsector =
        Number(Object.keys(filter_subsector_selected.value)[0]);
    return [
        { 0: filterOptionALL },
        ...props.systems
            .filter(system =>
                selectedSubsector !== 0
                    ? system.subsector_ID === selectedSubsector
                    : true
            )
            .sort((a, b) => {
                const textA = a.system_name.toLowerCase();
                const textB = b.system_name.toLowerCase();

                return textA.localeCompare(textB);
            })
            .map(system => ({
                [system.system_ID]: system.system_name
            }))
    ];
});

/**
 * The list of (sorted and filtered) battles.
 */
const sortedAndFilteredBattles = computed(() => {
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
                controlPoints: getControlPoints(battle),
            }
        })).sort((a, b) => b.battle_ID - a.battle_ID) as BattleResult[];
});

/**
 * Watch the view navigation for selected battles or systems.
 */
watch(
    [
        () => props.navigation.selectedBattleId.value,
        () => props.navigation.selectedSystemId.value,
    ],
    ([battleId, systemId]) => {

        // anonymous function for adjusting the filters
        function adjustFilters(system: System) {
            const subsectorOption = filter_subsectors_options.value.find(
                option =>
                    Number(Object.keys(option)[0]) === system.subsector_ID
            );

            if (subsectorOption) {
                filter_subsector_selected.value = subsectorOption;
            }

            filter_system_selected.value = {
                [system.system_ID]: system.system_name
            };
        }

        // if no battle ID was given, check the system ID
        if (battleId === undefined) {
            if (systemId !== undefined) {
                const system = props.systems.find(
                    system => system.system_ID === systemId
                );

                if (system) {
                    adjustFilters(system);
                }
            }

            return;
        }

        const battle = props.battles.find(
            battle => battle.battle_ID === battleId
        );
        if (!battle) return;

        // if a battle was found, set the filters accordingly
        resetFactionFilter();
        expandBattleEntry(battleId);

        const system = props.systems.find(
            system => system.system_ID === battle.battle_system
        );

        if (system) {
            adjustFilters(system);
        }
    },
    { immediate: true }
);

/**
 * Expand the given battle entry.
 * @param battleId the battle ID
 */
function expandBattleEntry(battleId: number) {
    // Collapse all battles
    for (const id of Object.keys(expandedBattleEntries.value)) {
        expandedBattleEntries.value[Number(id)] = false;
    }

    // Expand the selected battle
    expandedBattleEntries.value[battleId] = true;
}

/**
 * Get the won control points for given battle.
 * @param battle the battle
 */
function getControlPoints(battle: Battle): number | null {
    const vpDifference = Math.abs(
        battle.battle_victoryPoints1 - battle.battle_victoryPoints2
    );
    if (vpDifference < 1) {
        return null;
    }
    return utils.getControlPoints(vpDifference);
}

/**
 * Get the victory points percentage.
 * @param vp1 victory points 1
 * @param vp2 victory points 2
 */
function getVictoryPercentage(vp1: number, vp2: number) {
    const total = vp1 + vp2;
    if (total === 0) return 50;
    return (vp1 / total) * 100;
}

/**
 * Reset the faction filter.
 */
function resetFactionFilter() {
    filter_faction_selected.value = { 0: filterOptionALL };
}

/**
 * Reset the subsector filter.
 */
function resetSubsectorFilter() {
    filter_subsector_selected.value = { 0: filterOptionALL };
}

/**
 * Reset the systems filter.
 */
function resetSystemFilter() {
    filter_system_selected.value = { 0: filterOptionALL };
}

/**
 * Reset all filters.
 */
function resetAllFilters() {
    resetFactionFilter();
    resetSubsectorFilter();
    resetSystemFilter();
    expandedBattleEntries.value = []; // this currently also collapses all entries. TODO: add a button to collapse all (and expand all?)
    props.navigation.selectedBattleId.value = undefined;
}

</script>

<template>
    <div v-if="props.battles" id="battles-overview">

        <!-- TODO: implement filters: points, phase, date, free string (players) ? -->

        <div id="filters">
            <div class="filter-block">
                Faction
                <Dropdown :options="filter_factions_options" v-model="filter_faction_selected" />
            </div>

            <div class="filter-block">
                Subsector
                <Dropdown :options="filter_subsectors_options" v-model="filter_subsector_selected"
                    @select="resetSystemFilter()" />
            </div>

            <div class="filter-block">
                System
                <Dropdown :options="filter_systems_options" v-model="filter_system_selected" />
            </div>

            <div class="filter-block">
                <button class="button-secondary" @click="resetAllFilters()">
                    <span>Reset Filters</span>
                </button>
            </div>
        </div>

        <ul id="battles-list">
            <span v-if="!sortedAndFilteredBattles || sortedAndFilteredBattles.length < 1" id="no-results">No battles
                found</span>
            <li v-for="battle in sortedAndFilteredBattles" :key="battle.battle_ID" class="list-entry"
                :class="{ 'marked': navigation.selectedBattleId.value === battle.battle_ID }"
                data-keywords="official upToDate">
                <!-- <img :src="service.getLatinNumberIconUrl(1)" alt="handbook"> -->
                <article>
                    <details
                        @toggle="expandedBattleEntries[battle.battle_ID] = ($event.target as HTMLDetailsElement).open"
                        :open="expandedBattleEntries[battle.battle_ID] ?? false">
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
</template>

<style scoped>
/* .v-leave-active */
.v-enter-active {
    transition: opacity 1.5s ease;
}

.marked {
    outline: 1px solid var(--color-text);
    outline-offset: 3px;
}

#battles-overview {
    position: absolute;
    height: stretch;
    width: 100vw;
    padding-right: 1.5vw;
    overflow-y: scroll;
    overflow-x: hidden;
    background-color: var(--color-background);

    #filters {
        font-family: 'Adobe Caslon Pro';
        padding: 10px 0 0 40px;
        display: flex;
        gap: 20px;

        .filter-block {}
    }

    #battles-list {
        margin-top: 20px;
        list-style-type: none;
        display: grid;
        gap: 20px;

        #no-results {
            font-size: 30px;
            padding: 30px;
        }

        .list-entry {
            display: flex;
            border-radius: 4px;
            padding: 0.5em 0.5em 0.5em;
            background-color: var(--color-background-light);
            font-family: 'Adobe Caslon Pro';

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