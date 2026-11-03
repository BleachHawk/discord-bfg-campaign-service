<script setup lang="ts">

import { ref, onMounted, computed } from 'vue';
import ZoomableMap from './components/ZoomableMap.vue';
import type { Campaign, CampaignPhase } from '@shared/types/types';

const campaign_name = ref('');
const loading = ref(true);
const error = ref('');

const sector = ref();
const systemTypes = ref();
const factions = ref();
const battles = ref();

// find all the icons and map them to their names
const icons = Object.fromEntries(
  Object.entries(import.meta.glob('/src/assets/icons/*.svg', {
    eager: true,
    query: '?url',
    import: 'default'
  })).map(([path, url]) => [
    path.split('/').pop()!.replace('.svg', ''),
    url
  ])
);

let campaignData: Campaign | undefined;

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
let showPhaseTooltip = ref(false);

const campaignPhase = computed(() => {
  if (!campaignData) {
    return undefined;
  }
  return getCurrentPhase(campaignData.campaign_startDate, campaignData.campaignPhases);
});

function convertDateToString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentPhase(
  startDate: string | null,
  phases: CampaignPhase[]
): CampaignPhase | undefined {
  if (!campaignData || !startDate) {
    return undefined;
  }
  const currentDate: Date = new Date();

  // Parse date as local calendar date, avoiding UTC conversion issues.
  const [year, month, day] = startDate.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  const start = new Date(year, month - 1, day);

  if (currentDate < start) {
    return {
      campaign_phase_ID: 0,
      name: 'In Preparation',
      runtime: '',
      startdate: convertDateToString(start),
      objective: '',
      description: 'The Campaign has not yet started.',
      battle_size: '',
      campaign_ID: campaignData.campaign_ID
    };
  }

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const end = new Date(start);

    switch (phase!.runtime) {
      case "day":
        end.setDate(end.getDate() + 1);
        break;

      case "week":
        end.setDate(end.getDate() + 7);
        break;

      case "month":
        end.setMonth(end.getMonth() + 1);
        break;

      case "year":
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    phase!.startdate = convertDateToString(start);
    phase!.enddate = convertDateToString(end);

    if (currentDate < end) {
      return phase;
    }

    // Next phase starts when this one ends.
    start.setTime(end.getTime());
  }

  // Campaign has progressed beyond its defined phases.
  // TODO:
  return {
    campaign_phase_ID: 0,
    name: 'End',
    runtime: '',
    objective: '', // who won?
    description: 'The Campaign has concluded.',
    battle_size: '',
    campaign_ID: campaignData.campaign_ID
  };
}

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
    battles.value = data['battles'];
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
  clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => {
    showPhaseTooltip.value = true;
  }, 200);
}

onMounted(async () => {
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
          <h1 id="header">{{ campaign_name }} - 
            <span @pointerenter="onPhaseEnter()" @pointerleave="showPhaseTooltip = false" style="cursor: help;">Phase: {{ campaignPhase?.name }}</span></h1>
          <!-- Backdrop image -->
          <img ref="backgroundImage" class="background-image" src="./assets/images/skulls.png" alt="background"
            draggable="false" />
          <!-- Main map -->
          <ZoomableMap :sector="sector" :systemTypes="systemTypes" :factions="factions" :battles="battles"
            :icons="icons" :refreshFunction="loadData" />
        </div>
      </div>

      <div v-if="showPhaseTooltip" class="phase-tooltip">
        <ul>
          <li v-if="campaignPhase?.battle_size">Battle size:<p>{{ campaignPhase.battle_size }}</p>
          </li>
          <li v-if="campaignPhase?.objective">Objective:<p>{{ campaignPhase.objective }}</p>
          </li>
          <li v-if="campaignPhase?.description">Description:<p>{{ campaignPhase.description }}</p>
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
