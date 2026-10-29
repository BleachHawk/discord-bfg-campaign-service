<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import type { Faction, Sector, System } from './Types.vue';
import MapRegion from './MapRegion.vue';
import MapSystem from './MapSystem.vue';

const props = defineProps<{
    sector: Sector,
    factions: Faction[]
}>()

// TODO: make these configurable (and store in localStorage) in a small dropdown menu at the top left
const visibilityScales: Record<string, number> = {
    hive: 0.4,
    forge: 0.4,
    agri: 0.6,
    mining: 0.6,
    dead: 1.1
};

const systems = computed(() =>
    props.sector.subsectors
        .flatMap(subsector => subsector.systems)
        .map(system => ({
            ...system,
            ...{ visibleScale: visibilityScales[system.type.toLowerCase()] ?? 1 }
        }))
);

const viewport = ref<HTMLElement | null>(null);
const mapImage = ref<HTMLImageElement | null>(null);

const imageWidth = ref(0);
const imageHeight = ref(0);

const hoveredSubsectorId = ref<number | null>(null);
const hoveredSystemId = ref<number | null>(null);
const selectedPointId = ref<number | null>(null);

const scale = ref(1);
const x = ref(0);
const y = ref(0);

let framePending = false
let pendingX = 0
let pendingY = 0

const minScale = 0.30;
const maxScale = 5;
const zoomFactor = 1.15;

const sessionStorageMapKey = 'campaign_map_state';

const dragging = ref(false);
const loading = ref(true);
let lastMouseX = 0;
let lastMouseY = 0;

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;

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

function selectPoint(system: System) {
    selectedPointId.value = system.system_ID;
    console.log('Selected map point:', system);
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
        @pointerup="stopDrag" @pointercancel="stopDrag">

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
                <MapSystem v-for="system in systems" :system="system" :selectedPointId="selectedPointId"
                    :selectPoint="selectPoint" :icons="icons" :factions="factions" :mapScale="scale"
                    @pointerenter="hoveredSystemId = system.system_ID" @pointerleave="hoveredSystemId = null" />
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
            <div v-if="hoveredSystemId || hoveredSubsectorId" class="map-tooltip">
                <template v-if="hoveredSystemId">
                    <strong>
                        {{systems.find(p => p.system_ID === hoveredSystemId)?.system_name}}
                    </strong>
                    <p>
                        {{systems.find(p => p.system_ID === hoveredSystemId)?.description}}
                    </p>
                    <p>
                        {{getFactionNameByID(systems.find(p => p.system_ID ===
                            hoveredSystemId)?.currentFaction_ID)}}
                    </p>
                </template>

                <template v-else-if="hoveredSubsectorId">
                    <strong>
                        {{sector.subsectors.find(a => a.subsector_ID === hoveredSubsectorId)?.subsector_name}} Subsector {{sector.subsectors.find(a => a.subsector_ID === hoveredSubsectorId)?.subsector_ID}}
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

.map-image {
    position: fixed;
    padding: 8px;
    display: block;
    width: 100%;
    height: 100%;
    max-width: none;
    pointer-events: none;
}

.map-image-overlay {
    position: fixed;
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
    cursor: pointer;
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
    max-width: 280px;
    padding: 12px;
    border: 1px solid antiquewhite;
    border-radius: 6px;
    color: antiquewhite;
    background: rgb(12 20 30 / 95%);
    pointer-events: none;

    p {
        margin-bottom: 0;
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
    color: antiquewhite;
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