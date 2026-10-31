<script setup lang="ts">

import { ref, onMounted } from 'vue';
import ZoomableMap from './components/ZoomableMap.vue';

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

onMounted(async () => {
  try {
    const campaignResponse = await fetch('/campaign');

    if (!campaignResponse.ok) {
      throw new Error(`HTTP error: ${campaignResponse.status}`);
    }
    const campaignData = await campaignResponse.json();

    if (!campaignData) {
      throw new Error(`Campaign data error: ${campaignData}`)
    }
    console.log(campaignData);

    campaign_name.value = campaignData.campaign_name;
    sector.value = campaignData['sector'];
    factions.value = campaignData['factions'];
    battles.value = campaignData['battles'];
    systemTypes.value = campaignData['systemTypes'];
  } catch (err) {
    error.value = 'Failed to load campaign details.';
    console.error(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Transition>
    <div id="app">
      <h1 v-if="loading" id="loading">Loading campaign...</h1>
      <div v-else>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-else>
          <h1 id="header">{{ campaign_name }}</h1>
          <!-- Backdrop image -->
          <img ref="backgroundImage" class="background-image" src="./assets/images/skulls.png" alt="background"
            draggable="false" />
          <!-- Main map -->
          <ZoomableMap :sector="sector" :systemTypes="systemTypes" :factions="factions" :battles="battles" :icons="icons" />
        </div>
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
  }

  .error {
    padding: 10px;
  }

  .background-image {
    position: fixed;
    width: 100%;
  }
}

@media (min-width: 1024px) {
  /* support mobile display; mainly smaller header (and initally zoomed out map?) */
}
</style>
