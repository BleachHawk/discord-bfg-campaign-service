<script setup lang="ts">
// import HelloWorld from './components/HelloWorld.vue'
// import TheWelcome from './components/TheWelcome.vue'

const requestCampaign = new Request("/campaign");
    fetch(requestCampaign)
        .then(async (response) => {
            const data = await response.json();
            const campaign_data_string = JSON.stringify(data);
            console.log(campaign_data_string);
        });

    const requestBattleLog = new Request("/battles");
    fetch(requestBattleLog)
        .then(async (response) => {
            const data = await response.json();
            console.log(JSON.stringify(data));
        });
</script>

<template>
  <img alt="background" src="./assets/images/map_main.png"/>
  <!-- <header>
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />
    </div>
  </header>

  <main>
    <TheWelcome />
  </main> -->
</template>

<style scoped>

/* header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
} */

@media (min-width: 1024px) {
  /* header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  } */
}
</style>
