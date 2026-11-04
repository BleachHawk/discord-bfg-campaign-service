<script setup lang="ts">
import type { Battle, Faction, System, SystemType, Campaign } from '@shared/types/types';
import { computed } from 'vue';
import * as service from './Service';
import * as utils from '@shared/utils/utils'

const props = defineProps<{
    factions: Faction[],
    battles: Battle[],
    systems: System[],
    systemTypes: SystemType[]
}>()

interface BattleResult extends Battle {
    dateString: string;
    system: System | null;
    winner: number | null;
    loser: number | null;
    controlPoints: number | null;
}

function getControlPoints(battle: Battle): number | null {
    console.log('get control points');
    const vpDifference = Math.abs(
        battle.battle_victoryPoints1 - battle.battle_victoryPoints2
    );
    if (vpDifference < 1) {
        return null;
    }
    return utils.getControlPoints(vpDifference);
}

const sortedBattles = computed(() => {
    // TODO: remove debug data:
    // let battles = props.battles as BattleResult[];
    // for (let i = 20; i < 100; i++) {
    //     battles.push({
    //         battle_ID: i,
    //         campaign_ID: 1,
    //         battle_system: 1,
    //         battle_faction1: 6,
    //         battle_faction2: 7,
    //         battle_points: 100,
    //         battle_player1: null,
    //         battle_player2: null,
    //         battle_victoryPoints1: i,
    //         battle_victoryPoints2: i + 5,
    //         battle_report: '',
    //         battle_author: '',
    //         timestamp: 0,
    //         dateString: '',
    //         system: null,
    //         winner: null,
    //         loser: null
    //     });
    // }
    // return battles.map(battle => ({

    return props.battles.map(battle => ({
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

</script>

<template>
    <!-- <div>
        <Transition> -->
    <div v-if="props.battles" id="battles-overview">

        <!-- TODO: implement (copy from horizon page) filters: faction(s), system(s), subsector(s), points, phase, date, free string (players) -->

        <ul id="links-list">
            <li v-for="battle in sortedBattles" :key="battle.battle_ID" class="list-entry"
                data-keywords="official upToDate">
                <!-- <img :src="service.getLatinNumberIconUrl(1)" alt="handbook"> -->
                <article>
                    <details>
                        <summary>
                            <div class="summary-content">
                                <span>
                                    <img :src="service.getLatinNumberIconUrl(battle.system?.subsector_ID)"
                                        alt="subsector_img">
                                    <img :src="service.getTypeIconUrl(battle.system?.system_type_ID, props.systemTypes)"
                                        alt="systemtype_img">
                                    <div class="text">{{ battle.system?.system_name }}</div>
                                </span>
                                <span class="text">
                                    Points: {{ battle.battle_points }}
                                </span>
                                <img :src="service.getFactionIconUrl(battle.battle_faction1, factions)"
                                    alt="faction1_img">
                                <span class="text">
                                    {{ service.getFactionNameByID(battle.battle_faction1, factions) }} -
                                    Victory points:
                                    {{ battle.battle_victoryPoints1 }}
                                </span>
                                <div class="victory-bar">
                                    <div class="victory-bar-faction"
                                        :class="[(battle.battle_victoryPoints1 > battle.battle_victoryPoints2) ? 'victory-bar-winner' : 'victory-bar-loser']"
                                        :style="{ width: `${getVictoryPercentage(battle.battle_victoryPoints1, battle.battle_victoryPoints2)}%` }" />
                                    <div class="victory-bar-faction"
                                        :class="[(battle.battle_victoryPoints1 < battle.battle_victoryPoints2) ? 'victory-bar-winner' : 'victory-bar-loser']"
                                        :style="{ flex: 1 }" />
                                </div>
                                <img :src="service.getFactionIconUrl(battle.battle_faction2, factions)"
                                    alt="faction1_img">
                                <span class="text">
                                    {{ service.getFactionNameByID(battle.battle_faction2, factions) }} -
                                    Victory points:
                                    {{ battle.battle_victoryPoints2 }}
                                </span>
                            </div>
                        </summary>
                        <div class="article-content">
                            <br>
                            <div>
                                <!-- <span>Battle {{ battle.battle_ID }}</span> -->
                                <div class="info">
                                    <span>Date:</span>
                                    <span>{{ battle.dateString }}</span>
                                    <span>(Phase {{ battle.phase?.campaign_phase_ID }})</span>
                                </div>
                                <div class="info">
                                    <span>Attacker:</span>
                                    <span>
                                        {{ service.getFactionNameByID(battle.battle_faction1, props.factions) }}
                                    </span>
                                    <span v-if="battle.battle_player1">({{ battle.battle_player1 }})</span>
                                </div>
                                <div class="info">
                                    <span>Defender:</span>
                                    <span>
                                        {{ service.getFactionNameByID(battle.battle_faction2, props.factions) }}
                                    </span>
                                    <span v-if="battle.battle_player2">({{ battle.battle_player2 }})</span>
                                </div>
                                <div v-if="battle.winner" class="info">
                                    <span>Winner:</span>
                                    <span>
                                        {{ service.getFactionNameByID(battle.winner, props.factions) }}
                                    </span>
                                    <span>
                                        (Control points: {{ battle.controlPoints }})
                                    </span>
                                </div>
                            </div class="report">
                            <div v-if="battle.battle_report">
                                <br>
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

    #links-list {
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

            summary {
                cursor: pointer;
            }

            .summary-content {
                display: inline-flex;
                align-items: center;
                justify-content: space-between;
                width: calc(100% - 1.5em);
                vertical-align: middle;

                >* {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    align-items: center;
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

                .info {
                    display: flex;
                    gap: 10px;
                }
            }

            img {
                padding: 0 5px 0 5px;
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