<script setup lang="ts">
import { computed, ref } from "vue";

// TODO:
// onboarding
// - Highlight elements: Instead of just darkening the whole screen, use a spotlight effect around the map, system markers, or campaign information.
// - Persistent dismissal: Store completion in localStorage so returning visitors aren't shown the tour repeatedly.
// - Help button: Add a small ? button somewhere on the map so users can replay the tour.
// - Mobile layout: Position the explanation card at the bottom of the screen on mobile.
// For the spotlight effect, I'd use a dedicated overlay with a CSS mask or a library such as Driver.js. Driver.js already handles highlighting elements, positioning tooltips, and navigating between steps.

interface TourStep {
    title: string;
    description: string;
    target?: string;
}

const steps: TourStep[] = [
    {
        title: "Welcome",
        description: "to the Battlefleet Gothic community campaign site."
    },
    {
        title: "Select a system",
        description: "Click a system to inspect its details, ownership and history."
    },
    {
        title: "Follow the campaign",
        description: "Track campaign phases, battles and faction influence."
    }
];

const DONT_SHOW_TOUR_KEY = 'hide_map_tour';
const currentStep = ref(0);
const dontShow = ref(false);
const tourActive = ref(true);
const visible = computed(() => localStorage.getItem(DONT_SHOW_TOUR_KEY) === 'true' ? false : true);

function nextStep() {
    if (currentStep.value < steps.length - 1) {
        currentStep.value++;
    } else {
        if (dontShow.value) {
            localStorage.setItem(DONT_SHOW_TOUR_KEY, 'true');
        }
        tourActive.value = false;
    }
}

function previousStep() {
    if (currentStep.value > 0) {
        currentStep.value--;
    }
}

function skip() {
    if (dontShow.value) {
        localStorage.setItem(DONT_SHOW_TOUR_KEY, 'true');
    }
    tourActive.value = false;
}
</script>

<template>
    <div v-if="visible && tourActive" class="tour-overlay">
        <div class="tour-card">
            <div class="tour-header">
                <h3>{{ steps[currentStep]?.title }}</h3>
                <span>{{ currentStep + 1 }} / {{ steps.length }}</span>
            </div>

            <p>{{ steps[currentStep]?.description }}</p>

            <div class="tour-progress">
                <span v-for="(_, i) in steps" :key="i" :class="{ active: i === currentStep }" />
            </div>

            <div class="tour-buttons">
                <span>
                    <button @click="skip()">Skip</button>
                    <label>
                        <input type="checkbox" v-model="dontShow" />
                        Don't show this again
                    </label>
                </span>


                <span>
                    <button v-if="currentStep > 0" @click="previousStep">
                        Back
                    </button>
                    <button @click="nextStep">
                        {{ currentStep === steps.length - 1
                            ? "Finish"
                            : "Next" }}
                    </button>
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tour-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);

    display: flex;
    justify-content: center;
    align-items: center;
}

.tour-card {
    width: min(420px, 90vw);
    padding: 24px;
    border: 1px solid var(--color-text);
    border-radius: 8px;
    background: var(--tooltip-background);
}

.tour-header,
.tour-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tour-progress {
    display: flex;
    gap: 6px;
    margin: 20px 0;
}

.tour-progress span {
    height: 4px;
    flex: 1;
    background: #555;
}

.tour-progress span.active {
    background: var(--color-text);
}
</style>