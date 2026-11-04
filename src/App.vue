<script setup lang="ts">

import { ref, onMounted, computed } from 'vue';
import MapViewport from './components/MapViewport.vue';
import type { Battle, Campaign, CampaignPhase, Subsector, System } from '@shared/types/types';
import * as service from './components/Service';
import Battles from './components/Battles.vue';
import Factions from './components/Factions.vue';

const campaign_name = ref('');
const loading = ref(true);
const error = ref('');

const sector = ref();
const systemTypes = ref();
const factions = ref();
const battles = ref();
const systems = ref();

let campaignData: Campaign | undefined;

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
let showPhaseTooltip = ref(false);

const campaignPhase = computed(() => {
  if (!campaignData) {
    return undefined;
  }
  return service.getCurrentPhase(campaignData);
});

enum Views {
  Map = "map",
  Battles = "battles",
  Factions = "factions"
};
const currentView = ref(Views.Map);

async function loadData() {
  try {
    const campaignResponse = await fetch('/campaign');

    if (!campaignResponse.ok) {
      throw new Error(`HTTP error: ${campaignResponse.status}`);
    }
    const data = await campaignResponse.json();

    if (!data) {
      throw new Error(`Campaign data error: ${data}`)
    }

    if (campaignData && JSON.stringify(campaignData) == JSON.stringify(data)) {
      console.log('Campaign data up to date');
      // TODO: create toast / snackbar element to display information
      // https://www.w3schools.com/howto/howto_js_snackbar.asp
      return;
    }
    campaignData = data;
    campaign_name.value = data.campaign_name;
    sector.value = data['sector'];
    factions.value = data['factions'];
    battles.value = data['battles'].map((battle: Battle) => ({
      ...battle,
      ...{
        phase: service.retrievePhase(data, battle.timestamp)
      }
    }));
    systems.value = sector.value.subsectors.flatMap((subsector: Subsector) => subsector.systems)
      .map((system: System) => ({
        ...system,
      })
      );
    systemTypes.value = data['systemTypes'];
    console.log('Campaign data updated');
    console.log(data);

  } catch (err) {
    error.value = 'Failed to load campaign details.';
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function onPhaseEnter() {
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => {
    showPhaseTooltip.value = true;
  }, 200);
}
function onPhaseLeave() {
  clearTimeout(tooltipTimer);
  showPhaseTooltip.value = false;
}

onMounted(async () => {
  service.initIcons();
  loadData();
});
</script>

<template>
  <Transition>
    <div id="app">
      <h1 v-if="loading" id="loading">Loading campaign...</h1>
      <div v-else>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-else>

          <!-- Header -->
          <h1 id="header">{{ campaign_name }} -
            <span @pointerenter="onPhaseEnter()" @pointerleave="onPhaseLeave()" style="cursor: help;">
              Phase: {{ campaignPhase?.name }}
            </span>
            <span id="header-buttons-container">
              <button alt="Show sector map" :class="{ 'selected': currentView === Views.Map }"
                @click="currentView = Views.Map">Map</button>
              <button alt="Show factions overview" :class="{ 'selected': currentView === Views.Factions }"
                @click="currentView = Views.Factions">Factions</button>
              <button alt="Show battles overview" :class="{ 'selected': currentView === Views.Battles }"
                @click="currentView = Views.Battles">Battles</button>

              <!-- TODO: move the refreshData button here -->
            </span>
          </h1>

          <!-- Backdrop image -->
          <img ref="backgroundImage" class="background-image" src="./assets/images/skulls.png" alt="background"
            draggable="false" />

          <!-- Content area -->
          <!-- using v-show and multipe transitions to only build each element once -->
          <Transition>
            <!-- Map -->
            <MapViewport v-show="currentView === Views.Map" :sector="sector" :systemTypes="systemTypes"
              :factions="factions" :battles="battles" :refreshFunction="loadData" />
          </Transition>

          <Transition>
            <!-- Factions Overview -->
            <Factions v-show="currentView === Views.Factions" :factions="factions" :battles="battles" />
          </Transition>

          <Transition>
            <!-- Battles Overview -->
            <Battles v-show="currentView === Views.Battles" :factions="factions" :battles="battles" :systems="systems"
              :systemTypes="systemTypes" :campaignData="campaignData" />
          </Transition>
        </div>
      </div>

      <div v-if="showPhaseTooltip" class="phase-tooltip">
        <ul>
          <li v-if="campaignPhase?.battle_size">
            Battle size:<p>{{ campaignPhase.battle_size }}</p>
          </li>
          <li v-if="campaignPhase?.objective">
            Objective:<p>{{ campaignPhase.objective }}</p>
          </li>
          <li v-if="campaignPhase?.description">
            Description:<p>{{ campaignPhase.description }}</p>
          </li>
          <li v-if="campaignPhase?.startdate">From: {{ campaignPhase.startdate }}</li>
          <li v-if="campaignPhase?.enddate">To: {{ campaignPhase.enddate }}</li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
#app {
  #loading {
    padding-left: 10px;
  }

  #header {
    border-bottom: 2px solid var(--color-text);
    padding-left: 10px;
    cursor: default;

    #header-buttons-container {
      display: inline-grid;
      grid-auto-columns: 1fr;
      grid-auto-flow: column;
      z-index: 1;

      /* rework this: */
      position: relative;
      padding-left: 3vw;
      bottom: 2px;

      button {
        font-family: inherit;
        font-size: 20px;
        min-width: 36px;
        min-height: 36px;
        cursor: pointer;
        background: inherit;
        color: inherit;
        position: relative;

        &::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: -1;
        }

        &.selected::before {
          backdrop-filter: brightness(2);
          box-shadow: 0px 3px 5px rgb(var(--selected-color));
        }

        &::after {
          font-family: "Adobe Caslon Pro";
          font-size: 15px;
          content: attr(alt);
          position: absolute;
          top: 35px;
          left: 50%;
          width: max-content;
          max-width: 250px;
          padding: 5px 10px 0px 10px;
          pointer-events: none;

          box-sizing: border-box;
          border: 1px solid var(--color-text);
          border-radius: 6px;
          background: var(--tooltip-background);
          opacity: 0;
          z-index: 10;

          transition: opacity 0.4s ease;
          transition-delay: 0s;
        }

        &:hover::after {
          opacity: 1;
          transition-delay: 500ms;
        }
      }
    }
  }

  .error {
    padding: 10px;
  }

  .background-image {
    position: fixed;
    width: 100%;
  }

  .phase-tooltip {
    font-family: "Adobe Caslon Pro";
    letter-spacing: 1px;
    position: absolute;
    z-index: 5;
    top: 40px;
    left: 380px;
    min-width: 15vw;
    max-width: 15vw;
    padding: 12px;
    border: 1px solid var(--color-text);
    border-radius: 6px;
    background: var(--tooltip-background);
    pointer-events: none;
    cursor: default;
  }
}

@media (min-width: 1024px) {
  /* support mobile display; mainly smaller header (and initally zoomed out map?) */
}
</style>
