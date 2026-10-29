<script setup lang="ts">

import { ref, onMounted } from 'vue';
import ZoomableMap from './components/ZoomableMap.vue';

const campaign_name = ref('');
const loading = ref(true);
const error = ref('');

const sector = ref();
const factions = ref();

onMounted(async () => {
  try {
    const campaignResponse = await fetch('/campaign');
    const battlesResponse = await fetch('/battles');
    const factionsResponse = await fetch('/factions');

    if (!campaignResponse.ok) {
      throw new Error(`HTTP error: ${campaignResponse.status}`);
    }
    if (!battlesResponse.ok) {
      throw new Error(`HTTP error: ${battlesResponse.status}`);
    }
    if (!factionsResponse.ok) {
      throw new Error(`HTTP error: ${factionsResponse.status}`);
    }
    const campaignData = await campaignResponse.json();
    const battlesData = await battlesResponse.json();
    const factionsData = await factionsResponse.json();

    if (!campaignData) {
      throw new Error(`Campaign data error: ${campaignData}`)
    }
    if (!battlesData) {
      throw new Error(`Campaign battles data error: ${battlesData}`)
    }
    if (!factionsData) {
      throw new Error(`Campaign factionsData data error: ${factionsData}`)
    }
    console.log(campaignData);
    console.log(battlesData);
    console.log(factionsData);

    campaign_name.value = campaignData.campaign_name;
    sector.value = campaignData['sector'];
    factions.value = factionsData;
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
      <p v-if="loading" id="loading">Loading campaign...</p>
      <div v-else>
        <p v-if="error">{{ error }}</p>
        <div v-else>
          <h1 id="header">{{ campaign_name }}</h1>
          <!-- Backdrop image -->
          <img ref="backgroundImage" class="background-image" src="./assets/images/skulls.png" alt="background" draggable="false"/>
          <!-- Main map -->
          <ZoomableMap :sector="sector" :factions="factions"/>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>



#app {
  background: #111820;

  #header {
    border-bottom: 2px solid antiquewhite;
    color: antiquewhite;
    padding-left: 10px;
  }
}

#loading {
  margin: 10px;
}

.background-image {
    position: fixed;
    width: 100%;
}


@media (min-width: 1024px) {
  /* support mobile display; mainly smaller header (and initally zoomed out map?) */
}
</style>
