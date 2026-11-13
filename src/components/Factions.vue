<script setup lang="ts">
import type { Battle, Faction, Subsector, System, SystemType } from '@shared/types/types';
import * as service from './Service';
import * as utils from '@shared/utils/utils';
import { computed, ref } from 'vue';

const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
    subsectors: Subsector[],
    systems: System[],
    systemTypes: SystemType[],
}>();

const sortedPowerBlocks = computed(() => {
    return props.factions
        .filter(faction => faction.composite?.length)
        .map(powerBlock => ({
            ...powerBlock,
            subsectorOwnership: props.subsectors.map(subsector => {
                if (subsector.ownership) {
                    return {
                        "img": service.getLatinNumberIconUrl(subsector.subsector_ID),
                        "id": subsector.subsector_name,
                        "control": subsector.ownership.factionPower[powerBlock.faction_ID] ?? 0,
                        "systems": 0 // TODO
                    }
                }
                return {
                    "img": "",
                    "id": subsector.subsector_name,
                    "control": 0
                }
            }),
            factions: props.factions
                .filter(faction =>
                    powerBlock.composite!.includes(faction.faction_ID)
                )
                .sort((a, b) =>
                    a.faction_name.localeCompare(b.faction_name)
                )
                .map(faction => {
                    const rawPoints = props.systems.reduce((total, system) => {
                        return total + (system.ownership?.factionPower[faction.faction_ID] ?? 0);
                    }, 0);

                    const subsectorPoints = props.systems.reduce((total, system) => {
                        const systemType = utils.getSystemType(system.system_type_ID, props.systemTypes);
                        const fp = system.ownership?.factionPower[faction.faction_ID];
                        return total + (fp ? Math.round(fp * systemType.importance) : 0);
                    }, 0);

                    return {
                        ...faction,
                        ownership: {
                            systems: props.systems.filter(system =>
                                system.ownership?.currentFaction_ID === faction.faction_ID
                            ),
                            rawPoints,
                            subsectorPoints: subsectorPoints
                        }
                    };
                })
        }
        ))
});
const expandedBattleEntries = ref<Record<number, boolean>>({});

interface FactionBattle {
    battles: number;
    won: number;
    lost: number;
}
const factionBattles = computed<Record<number, FactionBattle>>(() => {
    const result: Record<number, FactionBattle> = {};

    // Initialize every faction
    for (const faction of props.factions) {
        result[faction.faction_ID] = {
            battles: 0,
            won: 0,
            lost: 0
        };
    }

    // Process battles
    for (const battle of props.battles) {
        const faction1 = result[battle.battle_faction1];
        const faction2 = result[battle.battle_faction2];

        if (!faction1 || !faction2) {
            continue;
        }

        faction1.battles++;
        faction2.battles++;

        if (battle.battle_victoryPoints1 > battle.battle_victoryPoints2) {
            faction1.won++;
            faction2.lost++;
        } else if (battle.battle_victoryPoints2 > battle.battle_victoryPoints1) {
            faction2.won++;
            faction1.lost++;
        }
    }

    return result;
});

</script>

<template>
    <div id="factions-overview">

        <!-- TODO: possible filter: data overall, data per campaign phase -->

        <ul class="factions-list">
            <li v-for="factionBlock in sortedPowerBlocks" :key="factionBlock.faction_ID" class="list-entry">
                <article>
                    <details
                        @toggle="expandedBattleEntries[factionBlock.faction_ID] = ($event.target as HTMLDetailsElement).open">
                        <summary>
                            <span class="faction-header">
                                <img :src="service.getFactionIconUrl(factionBlock.faction_ID, props.factions)"
                                    alt="faction" class="faction-icon" />

                                <div class="faction-name">
                                    {{ factionBlock.faction_name }}
                                </div>

                                <span class="control-composite" alt="Control in the subsectors">
                                    <!-- <span class="label">Control in the subsectors:</span> -->
                                    <span v-for="subOwnership in factionBlock.subsectorOwnership"
                                        class="composite-subsector" :class="{
                                            'highest-control': subOwnership.control === Math.max(
                                                ...sortedPowerBlocks.flatMap(block =>
                                                    block.subsectorOwnership
                                                        .filter(p => p.id === subOwnership.id && p.control > 0)
                                                        .map(p => p.control)
                                                )
                                            )
                                        }">
                                        <img :src="subOwnership.img" alt="subsector">
                                        <span class="composite-label subsector-label">{{ subOwnership.id }}</span>
                                        <span class="systems-span">
                                            <span class="composite-label">Systems: {{ subOwnership.systems }}</span>
                                        </span>
                                        <span class="control-span">
                                            <span class="composite-label">Strategic control: {{ subOwnership.control
                                            }}</span>
                                        </span>
                                    </span>
                                </span>

                                <!-- <span class="summary-composite darken"
                                    v-show="!expandedBattleEntries[factionBlock.faction_ID]">
                                    <span v-for="faction in factionBlock.factions" class="composite-member">
                                        <span class="member-label">{{ faction.faction_name }}</span>
                                    </span>
                                </span> -->
                            </span>
                        </summary>

                        <div class="article-content">
                            <table class="factions-table">
                                <colgroup>
                                    <col style="width: 30%">
                                    <col style="width: 10%">
                                    <col style="width: 10%">
                                    <col style="width: 10%">
                                    <col style="width: 10%">
                                    <col style="width: 10%">
                                    <col style="width: 10%">
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Battles fought</th>
                                        <th>Battles won</th>
                                        <th>Battles lost</th>
                                        <th>Raw control points</th>
                                        <th>Subsector control points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="faction in factionBlock.factions" :key="faction.faction_ID">
                                        <td>
                                            <img :src="service.getFactionIconUrl(faction.faction_ID, props.factions)"
                                                alt="faction" class="faction-icon" />
                                            <span class="td-label">{{ faction.faction_name }}</span>
                                        </td>
                                        <td>
                                            {{ factionBattles[faction.faction_ID]?.battles! > 0
                                                ? factionBattles[faction.faction_ID]?.battles : '-' }}
                                        </td>
                                        <td>
                                            {{ factionBattles[faction.faction_ID]?.won! > 0
                                                ? factionBattles[faction.faction_ID]?.won : '-' }}
                                        </td>
                                        <td>
                                            {{ factionBattles[faction.faction_ID]?.lost! > 0
                                                ? factionBattles[faction.faction_ID]?.lost : '-' }}
                                        </td>
                                        <td>
                                            {{ faction.ownership.rawPoints }}
                                        </td>
                                        <td>
                                            {{ faction.ownership.subsectorPoints }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </details>
                </article>
            </li>
        </ul>
    </div>
</template>

<style scoped>
#factions-overview {
    position: absolute;
    height: stretch;
    width: 100vw;
    padding-right: 1.5vw;
    overflow-y: scroll;
    overflow-x: hidden;
    background-color: var(--color-background);

    .factions-list {
        margin-top: 10px;
        list-style: none;

        display: grid;
        gap: 12px;

        .list-entry {
            display: flex;
            flex-direction: column;

            padding: 10px 15px;

            border-radius: 4px;

            background-color: var(--color-background-light);

            font-family: 'Adobe Caslon Pro';

            summary {
                cursor: pointer;

                &::marker {
                    /* remove default marker */
                    content: "";
                }

                &::-webkit-details-marker {
                    /* remove default marker */
                    display: none;
                }
            }

            .faction-header {
                display: flex;
                align-items: center;
                gap: 25px;
                flex-wrap: wrap;
                width: 100%;
            }

            .faction-icon {
                width: 50px;
                height: 50px;

                object-fit: contain;

                filter: grayscale(20%);
            }

            .faction-name {
                width: 200px;
                font-size: 20px;
                transform: translateY(4px);
            }

            .control-composite {
                display: inline-flex;
                gap: 8px;
                font-size: 14px;
                flex-wrap: balance;

                img {
                    min-width: 20px;
                }

                .label {
                    transform: translateY(10px);
                }

                .composite-subsector {
                    display: flex;
                    align-items: center;
                    padding: 4px 10px 4px 5px;
                    border: 1px solid var(--color-background);
                    gap: 10px;
                    border-radius: 4px;
                    display: inline-flex;

                    .composite-label {
                        display: inline-flex;
                        transform: translateY(3px);
                    }

                    .subsector-label {
                        font-size: 18px;
                    }

                    .systems-span,
                    .control-span {
                        background: var(--color-background);
                        border-radius: 30px;
                        min-width: auto;
                        display: inline-block;
                        text-align: center;
                        padding: 0 5px 0 5px;
                        text-wrap: nowrap;
                    }

                    img {
                        max-height: 20px;
                    }

                    &.highest-control .control-span {
                        filter: drop-shadow(0 0 5px rgba(var(--selected-color), 0.85));
                    }
                }
            }

            .darken {
                filter: brightness(0.75);
                margin-left: auto;
            }

            .faction-single {
                transform: translateY(4px);
            }

            .article-content {
                padding-top: 10px;

                .factions-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;

                    img {
                        max-height: 40px;
                    }
                }

                .factions-table th,
                .factions-table td {
                    padding: 6px 10px;
                    border-bottom: 1px solid #444;

                    .td-label {
                        transform: translateY(3px);
                    }
                }

                .factions-table td:first-child {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .faction-icon {
                    width: 24px;
                    height: 24px;
                    object-fit: contain;
                }
            }
        }
    }
}
</style>