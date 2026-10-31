<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import type { Battle, Faction, Sector, System, SystemType } from '@shared/types/types';
import MapRegion from './MapRegion.vue';
import MapSystem from './MapSystem.vue';

const props = defineProps<{
    sector: Sector,
    systemTypes: SystemType[],
    factions: Faction[],
    battles: Battle[],
    icons: { [k: string]: string; }
}>()

// TODO: make these configurable (and store in localStorage) in a small dropdown menu at the top left
const systemScales: Record<number, { visibility: number; display: number }> = {
    1: { visibility: 0.5, display: 1.4 }, // hive
    2: { visibility: 0.5, display: 1.4 }, // forge
    3: { visibility: 0.5, display: 1.4 }, // dock
    4: { visibility: 0.5, display: 1.3 }, // fortress
    5: { visibility: 0.5, display: 1.3 }, // shrine
    6: { visibility: 0.5, display: 1.3 }, // industrial
    7: { visibility: 0.6, display: 1.2 }, // civilised
    8: { visibility: 0.7, display: 1.1 }, // mining
    9: { visibility: 0.7, display: 1.1 }, // agri
    // mine_asteroid: { visibility: 0.7, display: 1.1 },
    10: { visibility: 0.8, display: 1.0 }, // knight
    11: { visibility: 0.8, display: 1.0 }, // research
    12: { visibility: 1.0, display: 0.9 }, // feudal
    13: { visibility: 1.1, display: 0.9 }, // penal
    // dead: { visibility: 1.1, display: 0.9 }
};

function getTypeIconUrl(typeID: number): string {
    const type = props.systemTypes.find(t => t.system_type_ID === typeID);
    let url = '';
    if (type) {
        url = props.icons[type.short_name] ?? '';
    }
    return url;
};

function getFactionIconUrl(currentFactionID: number | undefined): string {
    if (!currentFactionID) {
        return '';
    } else {
        const key = props.factions.find(fac => fac.faction_ID === currentFactionID)?.short_name;
        const url = key ? props.icons[key] : '';
        return url ?? '';
    }
};

const systems = computed(() =>
    props.sector.subsectors
        .flatMap(subsector => subsector.systems)
        .map(system => ({
            ...system,
            ...{
                scale: systemScales[system.system_type_ID] ? systemScales[system.system_type_ID]?.display : 1,
                visibleScale: systemScales[system.system_type_ID] ? systemScales[system.system_type_ID]?.visibility : 1,
                typeIconUrl: getTypeIconUrl(system.system_type_ID),
                factionIconUrl: getFactionIconUrl(system.currentFaction_ID)
            }
        }))
);

const viewport = ref<HTMLElement | null>(null);
const mapImage = ref<HTMLImageElement | null>(null);

const imageWidth = ref(0);
const imageHeight = ref(0);

const hoveredSubsectorId = ref<number | null>(null);
const hoveredSystem = ref<System | null>(null);
const selectedSystem = ref<System | null>(null);
const tooltipSystem = computed(() => hoveredSystem.value ?? selectedSystem.value)

const scale = ref(1);
const x = ref(0);
const y = ref(0);

let framePending = false

const minScale = 0.30;
const maxScale = 5;
const zoomFactor = 1.15;

const sessionStorageMapKey = 'campaign_map_state';

const dragging = ref(false);
const loading = ref(true);
let lastMouseX = 0;
let lastMouseY = 0;

// let tooltipTimer: ReturnType<typeof setTimeout> | undefined;

function getFactionNameByID(currentFaction_ID: number | undefined): string {
    const faction = props.factions.find(fac => fac.faction_ID === currentFaction_ID);
    return faction ? faction.faction_name : '';
}

function storeMapState() {
    const stateString = scale.value + ',' + x.value + ',' + y.value;
    sessionStorage.setItem(sessionStorageMapKey, stateString);
}

function loadMapState() {
    const stateString = sessionStorage.getItem(sessionStorageMapKey);
    if (stateString) {
        const vals = stateString.split(',');
        vals[0] && (scale.value = Number.parseFloat(vals[0]));
        vals[1] && (x.value = Number.parseFloat(vals[1]));
        vals[2] && (y.value = Number.parseFloat(vals[2]));
    }
}

function centerImage() {
    const viewportWidth = viewport.value?.clientWidth ?? 0;
    const imageWidth = mapImage.value?.naturalWidth ?? 0;

    x.value = (viewportWidth - imageWidth * scale.value) / 2;
    y.value = 10;

    storeMapState();
}

function zoom(event: WheelEvent) {
    event.preventDefault();

    const element = viewport.value;
    if (!element) return;

    const rect = element.getBoundingClientRect();

    // Cursor position relative to the viewport
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const oldScale = scale.value;
    const direction = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    let newScale = Math.min(
        maxScale,
        Math.max(minScale, oldScale * direction),
    );
    newScale = +newScale.toFixed(2);

    // Keep the point beneath the cursor stationary while zooming
    const imageX = (mouseX - x.value) / oldScale;
    const imageY = (mouseY - y.value) / oldScale;

    x.value = mouseX - imageX * newScale;
    y.value = mouseY - imageY * newScale;
    scale.value = newScale;

    storeMapState();
}

function zoomIn() {
    scale.value = Math.min(maxScale, scale.value * zoomFactor);
    storeMapState();
}

function zoomOut() {
    scale.value = Math.max(minScale, scale.value / zoomFactor);
    storeMapState();
}

function startDrag(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging.value = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function drag(event: PointerEvent) {
    if (framePending || !dragging.value) {
        return;
    }
    framePending = true;

    requestAnimationFrame(() => {
        x.value += event.clientX - lastMouseX;
        y.value += event.clientY - lastMouseY;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        framePending = false;
    });
}

function stopDrag() {
    dragging.value = false;
    storeMapState();
}

function resetView() {
    scale.value = 1;
    centerImage();
}

function onRegionEnter(subsector_ID: number) {
    // clearTimeout(tooltipTimer)
    // tooltipTimer = setTimeout(() => {
    hoveredSubsectorId.value = subsector_ID;
    // }, 0)
}

function onRegionLeave() {
    // clearTimeout(tooltipTimer)
    hoveredSubsectorId.value = null;
}

function onImageLoad() {
    const image = mapImage.value;
    if (!image) return;

    imageWidth.value = image.naturalWidth;
    imageHeight.value = image.naturalHeight;

    if (sessionStorage.getItem(sessionStorageMapKey)) {
        loadMapState();
    } else {
        centerImage();
    }
    loading.value = false;
}

function selectSystem(system: System | null) {
    selectedSystem.value = system;
}

onMounted(() => {
    viewport.value?.addEventListener('wheel', zoom, { passive: false });
});

onUnmounted(() => {
    viewport.value?.removeEventListener('wheel', zoom);
});

// onBeforeUnmount(() => {
//     clearTimeout(tooltipTimer)
// });

</script>

<template>
    <div ref="viewport" class="map-viewport" :class="{ dragging, loading }" @pointerdown="startDrag" @pointermove="drag"
        @click.stop="selectSystem(null)" @pointerup="stopDrag" @pointercancel="stopDrag">

        <div class="map-world ornate-frame" :style="{
            width: imageWidth ? `${imageWidth}px` : 'auto',
            height: imageHeight ? `${imageHeight}px` : 'auto',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            '--inverse-scale': 1 / scale
        }">
            <!-- Map image background -->
            <img ref="mapImage" class="map-image" src="../assets/images/map_main.svg" alt="Sector map" draggable="false"
                @load="onImageLoad" />
            <Transition>
                <img v-if="!loading" ref="mapImage" class="map-image-overlay" src="../assets/images/overlay.png"
                    alt="Sector map overlay" draggable="false" />
            </Transition>

            <!-- Map svg background -->
            <Transition>
                <svg v-if="imageWidth && imageHeight" class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <!-- Map region overlay -->
                    <MapRegion v-for="subsector in sector.subsectors" :subsector="subsector"
                        :hoveredSubsectorId="hoveredSubsectorId" @pointerenter="onRegionEnter(subsector.subsector_ID)"
                        @pointerleave="onRegionLeave()" />
                </svg>
            </Transition>

            <!-- Map interactive points -->
            <div class="system-container">
                <MapSystem v-for="system in systems" :system="system" :selectedSystem="selectedSystem"
                    :selectSystem="selectSystem" :factions="factions" :mapScale="scale"
                    @pointerenter="hoveredSystem = system" @pointerleave="hoveredSystem = null" />
            </div>
        </div>

        <div class="map-controls" @pointerdown.stop>
            <button @click.stop="zoomIn">+</button>
            <button @click.stop="zoomOut">−</button>
            <button @click.stop="resetView">Reset</button>
            <span>{{ Math.round(scale * 100) }}%</span>
            <!-- <span>{{ scale }}</span> -->
        </div>
        <Transition>
            <div v-if="hoveredSystem || hoveredSubsectorId || selectedSystem" class="map-tooltip" @pointerdown.stop>
                <template v-if="tooltipSystem">
                    <div class="map-tooltip-icon-container">
                        <img :src="tooltipSystem.typeIconUrl" style="max-width: 80px;">
                    </div>
                    <strong>
                        {{ tooltipSystem.system_name }}
                    </strong>
                    <p>
                        {{ tooltipSystem.description }}
                    </p>
                    <div v-if="tooltipSystem.currentFaction_ID">
                        <br>
                        <p>
                            <span v-if="tooltipSystem.currentFaction_ID !== 100">Currently under control of </span>
                            <span v-else>Currently </span>
                            {{ getFactionNameByID(tooltipSystem.currentFaction_ID) }}.
                        </p>
                        <article>
                            <details>LOREM IPSUM</details>
                            Test
                        </article>
                        <div class="map-tooltip-icon-container">
                            <img :src="tooltipSystem.factionIconUrl" style="max-width: 80px;">
                        </div>
                    </div>
                </template>

                <template v-else-if="hoveredSubsectorId">
                    <strong>
                        {{sector.subsectors.find(a => a.subsector_ID === hoveredSubsectorId)?.subsector_name}} Subsector
                        {{sector.subsectors.find(a => a.subsector_ID === hoveredSubsectorId)?.subsector_ID}}
                    </strong>
                    <p>
                        {{sector.subsectors.find(a => a.subsector_ID === hoveredSubsectorId)?.description}}
                    </p>
                </template>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.map-viewport {
    position: relative;
    width: 100%;
    height: 100vh;
    min-height: 400px;
    overflow: hidden;
    background: inherit;
    cursor: grab;
    touch-action: none;
    user-select: none;
}

.map-viewport.dragging {
    cursor: grabbing;
}

.map-viewport.loading {
    opacity: 0;
}

.map-world {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
}

.ornate-frame {
    background: #211b15;
    border: 2px solid #b89a57;
}

.ornate-frame::before,
.ornate-frame::after {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    border: 3px solid #e2c477;
    pointer-events: none;
}

.ornate-frame::before {
    top: -4px;
    left: -4px;
    border-right: none;
    border-bottom: none;
}

.ornate-frame::after {
    bottom: -4px;
    right: -4px;
    border-left: none;
    border-top: none;
}

.map-image,
.map-image-overlay {
    position: fixed;
    display: block;
    padding: 8px;
    width: 100%;
    height: 100%;
    max-width: none;
    pointer-events: none;
}

.map-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}

.map-svg polygon {
    fill: #45c5e8;
    fill-opacity: 0.1;
    stroke: #8ad2e6;
    stroke-width: 0.25;
    stroke-opacity: 1;
    vector-effect: non-scaling-stroke;
    /* cursor: pointer; */
    stroke-linejoin: round;

    transition:
        fill-opacity 600ms ease,
        stroke-opacity 200ms ease,
        stroke-width 200ms ease;
}

.map-svg polygon.subsector-highlighted {
    fill: #45c5e8;
    fill-opacity: 0.3;
    stroke-width: 0.6;
}

.map-svg polygon.subsector-dimmed {
    fill-opacity: 0.05;
    stroke-opacity: 0.5;
}

.map-tooltip {
    position: absolute;
    z-index: 5;
    top: 60px;
    left: 10px;
    max-width: 380px;
    padding: 12px;
    border: 1px solid var(--color-text);
    border-radius: 6px;
    background: rgb(12 20 30 / 95%);
    /* pointer-events: none; */

    strong {
        font-size: 18px;
    }

    p {
        margin-bottom: 0;
    }

    .map-tooltip-icon-container {
        display: flex;
        justify-content: center;
    }
}

.map-controls {
    position: absolute;
    display: flex;
    left: 10px;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgb(12 20 30 / 95%);
    border-radius: 8px;

    button {
        min-width: 36px;
        min-height: 36px;
        cursor: pointer;
        background: inherit;
        color: inherit;
    }
}
</style>