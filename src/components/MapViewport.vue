<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, onBeforeUnmount } from 'vue';
import type { Battle, Faction, Sector, Subsector, System, SystemType } from '@shared/types/types';
import MapRegion from './MapRegion.vue';
import MapSystem from './MapSystem.vue';
import MapTooltip from './MapTooltip.vue';
import * as service from './Service';
import MapTour from './MapTour.vue';

const props = defineProps<{
    sector: Sector,
    systemTypes: SystemType[],
    factions: Faction[],
    battles: Battle[], // TODO: not used yet
}>()

const emit = defineEmits<{
  refresh: [];
}>();

// TODO: make these configurable? (and store in localStorage) in a small dropdown menu at the top left
// visibility is the map zoom scale at which they show their label
// display is their own scale
const systemScales: Record<number, { visibility: number; display: number }> = {
    1: { visibility: 0.4, display: 1.4 }, // hive
    2: { visibility: 0.4, display: 1.4 }, // forge
    3: { visibility: 0.4, display: 1.4 }, // dock
    4: { visibility: 0.5, display: 1.3 }, // fortress
    5: { visibility: 0.5, display: 1.3 }, // shrine
    6: { visibility: 0.5, display: 1.3 }, // industrial
    7: { visibility: 0.6, display: 1.2 }, // civilised
    8: { visibility: 0.7, display: 1.1 }, // mining
    9: { visibility: 0.7, display: 1.1 }, // agri
    // mining_asteroid: { visibility: 0.7, display: 1.1 },
    10: { visibility: 0.8, display: 1.0 }, // knight
    11: { visibility: 0.8, display: 1.0 }, // research
    12: { visibility: 1.0, display: 0.9 }, // feudal
    13: { visibility: 1.1, display: 0.9 }, // penal
    14: { visibility: 1.1, display: 0.9 }, // feral
    // dead: { visibility: 1.1, display: 0.9 }
};

const systems = computed(() =>
    props.sector.subsectors
        .flatMap(subsector => subsector.systems)
        .map(system => ({
            ...system,
            ...{
                scale: systemScales[system.system_type_ID] ? systemScales[system.system_type_ID]?.display : 1,
                visibleScale: systemScales[system.system_type_ID] ? systemScales[system.system_type_ID]?.visibility : 1,
                typeIconUrl: service.getTypeIconUrl(system.system_type_ID, props.systemTypes),
                factionIconUrl: service.getFactionIconUrl(system.ownership?.currentFaction_ID, props.factions)
            }
        }))
);

const loading = ref(true);
const viewport = ref<HTMLElement | null>(null);
const mapImage = ref<HTMLImageElement | null>(null);

const imageWidth = ref(0);
const imageHeight = ref(0);

const hoveredSystem = ref<System | null>(null);
const selectedSystem = ref<System | null>(null);

const hoveredSubsector = ref<Subsector | null>(null);
const selectedSubsector = ref<Subsector | null>(null);

let framePending = false

const scale = ref(1);
const x = ref(0);
const y = ref(0);
const minScale = 0.30;
const maxScale = 5;
const zoomFactor = 1.15;

const dragging = ref({
    mode: false, // dragging mode
    active: false, // actually dragging happening
    dragStartX: 0, // start x
    dragStartY: 0, // start y
    lastMouseX: 0, // last mouse x
    lastMouseY: 0 // last mouse y
});

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
const SESSION_STORAGE_MAP_STATE_KEY = 'campaign_map_state';

function storeMapState() {
    const stateString = scale.value + ',' + x.value + ',' + y.value;
    sessionStorage.setItem(SESSION_STORAGE_MAP_STATE_KEY, stateString);
}

function loadMapState() {
    const stateString = sessionStorage.getItem(SESSION_STORAGE_MAP_STATE_KEY);
    if (stateString) {
        const vals = stateString.split(',');
        vals[0] && (scale.value = Number.parseFloat(vals[0]));
        vals[1] && (x.value = Number.parseFloat(vals[1]));
        vals[2] && (y.value = Number.parseFloat(vals[2]));
    }
}

function centerImage() {
    const viewportWidth = viewport.value?.clientWidth ?? 0;
    const viewportHeigth = viewport.value?.clientHeight ?? 0;
    const imageWidth = mapImage.value?.naturalWidth ?? 0;
    const imageHeight = mapImage.value ? (mapImage.value.naturalHeight + 150) : 0;

    x.value = (viewportWidth - imageWidth * scale.value) / 2;
    y.value = (viewportHeigth - imageHeight * scale.value) / 2;

    storeMapState();
}

/**
 * Mouse wheel zoom handler.
 * @param event the wheel event
 */
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

// currently not used
// function zoomIn() {
//     scale.value = Math.min(maxScale, scale.value * zoomFactor);
//     storeMapState();
// }
// function zoomOut() {
//     scale.value = Math.max(minScale, scale.value / zoomFactor);
//     storeMapState();
// }

/**
 * Mouse down handler on the map viewport.
 * Set the dragging mode to true and store inital coordinates.
 * @param event the pointer event
 */
function mapMouseDown(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging.value.mode = true;

    dragging.value.dragStartX = event.clientX;
    dragging.value.dragStartY = event.clientY;

    dragging.value.lastMouseX = event.clientX;
    dragging.value.lastMouseY = event.clientY;
}

/**
 * Mouse move handler on the map viewport.
 * If actual dragging is happening, set dragging to active. If no frame draw is pending, refresh the map.
 * @param event the pointer event
 */
function mapMouseMove(event: PointerEvent) {
    if (!dragging.value.mode) return;

    if (framePending) {
        return;
    }

    if (Math.abs(event.clientX - dragging.value.dragStartX) > 3 || Math.abs(event.clientY - dragging.value.dragStartY) > 3) {
        // actual dragging happened
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        dragging.value.active = true;
    } else {
        return;
    }

    framePending = true;

    requestAnimationFrame(() => {
        x.value += event.clientX - dragging.value.lastMouseX;
        y.value += event.clientY - dragging.value.lastMouseY;

        dragging.value.lastMouseX = event.clientX;
        dragging.value.lastMouseY = event.clientY;

        framePending = false;
    });
}

/**
 * Mouse up handler on the map viewport.
 * When actual dragging was happening, store the new map state and disable dragging.
 * When no actual dragging was happening, disable dragging mode and deselect all selections.
 */
function mapMouseUp() {
    if (!dragging.value.active) {
        dragging.value.mode = false;
        deselectAll();
    } else {
        dragging.value.mode = false;
        dragging.value.active = false;
        storeMapState();
    }
}

function refreshView() {
    emit('refresh');
}

function resetView() {
    scale.value = 0.7;
    centerImage();
}

function onRegionEnter(subsector_ID: number) {
    clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
        const subsector = props.sector.subsectors.find(a => a.subsector_ID === subsector_ID);
        subsector && (hoveredSubsector.value = subsector);
    }, 200);
}

function onRegionLeave() {
    clearTimeout(tooltipTimer);
    hoveredSubsector.value = null;
}

function onSystemEnter(system: System) {
    clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
        hoveredSystem.value = system;
    }, 200);
}

function onSystemLeave() {
    clearTimeout(tooltipTimer);
    hoveredSystem.value = null;
}

function onRightClick() {
    deselectAll();
}

function onImageLoad() {
    const image = mapImage.value;
    if (!image) return;

    imageWidth.value = image.naturalWidth;
    imageHeight.value = image.naturalHeight;

    if (sessionStorage.getItem(SESSION_STORAGE_MAP_STATE_KEY)) {
        loadMapState();
    } else {
        centerImage();
    }
    loading.value = false;
}

function deselectAll() {
    if (dragging.value.active) {
        return;
    }
    selectedSystem.value = null;
    selectedSubsector.value = null;
}

function selectSystem(system: System | null) {
    deselectAll();
    selectedSystem.value = system;
}

function selectSubsector(subsector: Subsector | null) {
    deselectAll();
    selectedSubsector.value = subsector;
}

onMounted(() => {
    viewport.value?.addEventListener('wheel', zoom, { passive: false });
});

onUnmounted(() => {
    viewport.value?.removeEventListener('wheel', zoom);
});

onBeforeUnmount(() => {
    clearTimeout(tooltipTimer)
});

</script>

<template>
    <div>
        <div ref="viewport" class="map-viewport" :class="{ dragging: dragging.active, loading }"
            @pointerdown="mapMouseDown" @pointermove="mapMouseMove" @pointerup="mapMouseUp" @pointercancel="mapMouseUp"
            @contextmenu.prevent="onRightClick">

            <div class="map-world ornate-frame" :style="{
                width: imageWidth ? `${imageWidth}px` : 'auto',
                height: imageHeight ? `${imageHeight}px` : 'auto',
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                '--inverse-scale': 1 / scale
            }">
                <!-- Map image background -->
                <img ref="mapImage" class="map-image" src="../assets/images/map_main.svg" alt="Sector map"
                    draggable="false" @load="onImageLoad" />
                <Transition>
                    <img v-if="!loading" ref="mapImage" class="map-image-overlay" src="../assets/images/overlay.png"
                        alt="Sector map overlay" draggable="false" />
                </Transition>

                <!-- Map svg background -->
                <Transition>
                    <svg v-if="imageWidth && imageHeight" class="map-svg" viewBox="0 0 100 100"
                        preserveAspectRatio="none">
                        <!-- Map region overlay -->
                        <MapRegion v-for="subsector in sector.subsectors" :subsector="subsector"
                            :hoveredSubsector="hoveredSubsector" :selectedSubsector="selectedSubsector"
                            @select="selectSubsector" @pointerenter="onRegionEnter(subsector.subsector_ID)"
                            @pointerleave="onRegionLeave()" />
                    </svg>
                </Transition>

                <!-- Map interactive points -->
                <div class="system-container">
                    <MapSystem v-for="system in systems" :system="system" :selectedSystem="selectedSystem"
                        :factions="factions" :mapScale="scale" @select="selectSystem"
                        @pointerenter="onSystemEnter(system)" @pointerleave="onSystemLeave()" />
                </div>
            </div>
            <div class="map-controls" @pointerdown.stop>
                <!-- TODO: move this button to App.vue -->
                <!-- TODO: add a "find location" button here -->
                <button @click.stop="refreshView" class="map-control-button button-styled button-tooltip" alt="Refresh data">
                    <img src="../assets/icons/refresh.svg">
                </button>
                <button @click.stop="resetView" class="map-control-button button-styled button-tooltip" alt="Center view">
                    <img src="../assets/icons/center.svg">
                </button>
            </div>
        </div>
        <MapTour />

        <Transition>
            <MapTooltip v-if="hoveredSystem || selectedSystem || hoveredSubsector || selectedSubsector"
                :selectedSubsector="selectedSubsector" :hoveredSubsector="hoveredSubsector"
                :selectedSystem="selectedSystem" :hoveredSystem="hoveredSystem" :factions="factions"
                :systemTypes="systemTypes" />
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

.map-controls {
    position: absolute;
    display: flex;
    left: 10px;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--tooltip-background);
    border-radius: 8px;

    .map-control-button {
        --button-styled-fontSize: 0;
        img {
            height: 20px;
        }
    }
}
</style>