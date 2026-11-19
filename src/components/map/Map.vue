<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, onBeforeUnmount, nextTick, watch } from 'vue';
import type { Battle, Faction, Sector, Subsector, System, SystemType } from '@shared/types/types';
import MapSubsector from './MapSubsector.vue';
import MapSystem from './MapSystem.vue';
import MapTooltip from './MapTooltip.vue';
import * as service from '../Service.js';
import MapTour from './MapTour.vue';
import type { Navigation } from '@/App.vue';
import { Dragging, MapObjectInteraction, SESSION_STORAGE_MAP_STATE_KEY, SYSTEM_TYPE_VISIBILITY } from './MapHelper.ts';

/**
 * The vue props.
 */
const props = defineProps<{
    sector: Sector,
    systemTypes: SystemType[],
    factions: Faction[],
    battles: Battle[], // TODO: not used yet
    navigation: Navigation,
}>()

const systems = computed(() =>
    props.sector.subsectors
        .flatMap(subsector => subsector.systems)
        .map(system => ({
            ...system,
            ...{
                scale: SYSTEM_TYPE_VISIBILITY[system.system_type_ID] ? SYSTEM_TYPE_VISIBILITY[system.system_type_ID]?.size : 1,
                visibleScale: SYSTEM_TYPE_VISIBILITY[system.system_type_ID] ? SYSTEM_TYPE_VISIBILITY[system.system_type_ID]?.visibility : 1,
                typeIconUrl: service.getTypeIconUrl(system.system_type_ID, props.systemTypes),
                factionIconUrl: service.getFactionIconUrl(system.ownership?.currentFaction_ID, props.factions)
            }
        }))
);

// background image
const imageLoading = ref(true);
const mapImage = ref<HTMLImageElement | null>(null);
const imageWidth = ref(0);
const imageHeight = ref(0);

// map dragging and hover / select of map objects
const dragging = new Dragging();
const mapObjectInteraction = new MapObjectInteraction();

// locate input overlay
const locateInput = ref<HTMLInputElement | null>(null);
const locateInputModel = ref('');
const locateInputVisible = ref(false);
let locateDebounce: ReturnType<typeof setTimeout> | undefined;

// viewport
const viewport = ref<HTMLElement | null>(null);
const viewportSize = ref({ width: 0, height: 0 });
let viewportObserver: ResizeObserver | undefined;

// scale and zoom
const scale = ref(1);
const x = ref(0);
const y = ref(0);
const minScale = 0.30;
const maxScale = 5;
const zoomFactor = 1.15;
const uiScale = computed(() => {
    const { width, height } = viewportSize.value;
    if (!width || !height) return 1;

    const widthFactor = width / 1440;
    const heightFactor = height / 900;

    return Math.max(0.85, Math.min(1.35, widthFactor, heightFactor));
});

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;

// =====================================================================================

/**
 * Watch the locate-input model and trigger search / locate.
 */
watch(locateInputModel, (value) => {
    if (locateDebounce) {
        clearTimeout(locateDebounce);
    }
    locateDebounce = setTimeout(() => {
        const search = value.trim();
        if (!search) {
            return;
        }

        // perform the search
        const found = findMapObject(search);

        if (!found) return;

        if ('system_ID' in found) {
            centerOnSystem(found);
        } else {
            centerOnSubsector(found);
        }
    }, 300);
});

// =====================================================================================

/**
 * Mouse down handler on the map viewport.
 * Set the dragging mode to true and store inital coordinates.
 * @param event the pointer event
 */
function onMapMouseDown(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging.mode = true;
    dragging.active.value = false;

    dragging.dragStartX = event.clientX;
    dragging.dragStartY = event.clientY;

    dragging.lastMouseX = event.clientX;
    dragging.lastMouseY = event.clientY;

    dragging.pendingPointerX = event.clientX;
    dragging.pendingPointerY = event.clientY;
}

/**
 * Mouse move handler on the map viewport.
 * If actual dragging is happening, set dragging to active. If no frame draw is pending, refresh the map.
 * @param event the pointer event
 */
function onMapMouseMove(event: PointerEvent) {
    if (!dragging.mode) return;

    // Only activate dragging after a small movement threshold.
    if (!dragging.active.value) {
        const movedX = Math.abs(event.clientX - dragging.dragStartX);
        const movedY = Math.abs(event.clientY - dragging.dragStartY);

        if (movedX <= 3 && movedY <= 3) return;

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        dragging.active.value = true;
    }

    // Always retain the newest pointer position.
    dragging.pendingPointerX = event.clientX;
    dragging.pendingPointerY = event.clientY;

    // Only schedule one visual update per animation frame.
    if (dragging.dragFrame !== null) return;

    dragging.dragFrame = requestAnimationFrame(() => {
        dragging.dragFrame = null;

        if (!viewport.value || !dragging.active.value) return;

        applyPendingDrag();
    });
}

/**
 * Mouse up handler on the map viewport.
 * When actual dragging was happening, store the new map state and disable dragging.
 * When no actual dragging was happening, disable dragging mode and deselect all selections.
 */
function onMapMouseUp(event?: PointerEvent) {
    if (!dragging.active.value) {
        dragging.mode = false;
        endAllInteractions();
        return;
    }

    // Include the final pointer position before finishing.
    if (event) {
        dragging.pendingPointerX = event.clientX;
        dragging.pendingPointerY = event.clientY;
    }

    // Flush any pending movement immediately.
    if (dragging.dragFrame !== null) {
        cancelAnimationFrame(dragging.dragFrame);
        dragging.dragFrame = null;
    }

    applyPendingDrag();

    dragging.mode = false;
    dragging.active.value = false;

    storeMapState();
}

/**
 * Apply the currently pending drag location.
 */
function applyPendingDrag() {
    x.value += dragging.pendingPointerX - dragging.lastMouseX;
    y.value += dragging.pendingPointerY - dragging.lastMouseY;

    dragging.lastMouseX = dragging.pendingPointerX;
    dragging.lastMouseY = dragging.pendingPointerY;
}

/**
 * On mouse entering a subsector.
 * @param subsector_ID the subsector id
 */
function onSubsectorEnter(subsector_ID: number) {
    if (mapObjectInteraction.selectedSystem.value) {
        return;
    }
    clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
        const subsector = props.sector.subsectors.find(a => a.subsector_ID === subsector_ID);
        subsector && (mapObjectInteraction.hoveredSubsector.value = subsector);
    }, 1000);
}

/**
 * On mouse leaving a subsector.
 */
function onSubsectorLeave() {
    clearTimeout(tooltipTimer);
    mapObjectInteraction.hoveredSubsector.value = null;
}

/**
 * On mouse entering a system.
 * @param system the system
 */
function onSystemEnter(system: System) {
    if (mapObjectInteraction.selectedSubsector.value) {
        return;
    }
    clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
        mapObjectInteraction.hoveredSystem.value = system;
    }, 200);
}

/**
 * On mouse leaving a system.
 */
function onSystemLeave() {
    clearTimeout(tooltipTimer);
    mapObjectInteraction.hoveredSystem.value = null;
}

/**
 * On map viewport right click.
 */
function onViewportRightClick() {
    endAllInteractions();
}

/**
 * On background image load.
 */
function onImageLoad() {
    const image = mapImage.value;
    if (!image) return;

    imageWidth.value = image.naturalWidth;
    imageHeight.value = image.naturalHeight;

    if (sessionStorage.getItem(SESSION_STORAGE_MAP_STATE_KEY)) {
        loadMapState();
    } else {
        resetView();
    }
    imageLoading.value = false;
}

/**
 * Store the current map state (scale and position).
 */
function storeMapState() {
    const stateString = scale.value + ',' + x.value + ',' + y.value;
    sessionStorage.setItem(SESSION_STORAGE_MAP_STATE_KEY, stateString);
}

/**
 * Get the current map state (scale and position).
 */
function loadMapState() {
    const stateString = sessionStorage.getItem(SESSION_STORAGE_MAP_STATE_KEY);
    if (stateString) {
        const vals = stateString.split(',');
        vals[0] && (scale.value = Number.parseFloat(vals[0]));
        vals[1] && (x.value = Number.parseFloat(vals[1]));
        vals[2] && (y.value = Number.parseFloat(vals[2]));
    }
}

/**
 * Center the map.
 */
function centerMap() {
    const viewportWidth = viewport.value?.clientWidth ?? 0;
    const viewportHeigth = viewport.value?.clientHeight ?? 0;
    const imageWidth = mapImage.value?.naturalWidth ?? 0;
    const imageHeight = mapImage.value ? (mapImage.value.naturalHeight + 90) : 0;

    x.value = (viewportWidth - imageWidth * scale.value) / 2;
    y.value = (viewportHeigth - imageHeight * scale.value) / 2;
    storeMapState();

    // animate to center not working yet:
    // animateToMapPosition(imageWidth.value / 2, imageHeight.value / 2, scale.value = 0.575 * uiScale.value);
}

/**
 * Reset the scale and center the map.
 */
function resetView() {
    scale.value = 0.575 * uiScale.value;
    centerMap();
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

/**
 * Deselect all selections and hide the locate-overlay.
 */
function endAllInteractions() {
    hideLocateOverlay();
    if (dragging.active.value) {
        return;
    }
    mapObjectInteraction.selectedSystem.value = null;
    mapObjectInteraction.selectedSubsector.value = null;
}

/**
 * Select the given system.
 * @param system the system
 */
function selectSystem(system: System | null) {
    endAllInteractions();
    mapObjectInteraction.selectedSystem.value = system;
}

/**
 * Select the given subsector.
 * @param subsector the subsector
 */
function selectSubsector(subsector: Subsector | null) {
    endAllInteractions();
    mapObjectInteraction.selectedSubsector.value = subsector;
}

/**
 * Show the locate-overlay.
 */
function showLocateOverlay() {
    locateInputVisible.value = true;
    nextTick(() => {
        locateInput.value?.focus();
    });
}

/**
 * Hide the locate-overlay.
 */
function hideLocateOverlay() {
    locateInputVisible.value = false;
    locateInputModel.value = '';

    if (locateDebounce) {
        clearTimeout(locateDebounce);
        locateDebounce = undefined;
    }
}

/**
 * Find a map object (system / subsector).
 * @param search the given string to be compared with system / subsector names
 * @returns a system, subsector or null
 */
function findMapObject(search: string): System | Subsector | null {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return null;

    const system = systems.value.find(
        system => system.system_name.toLowerCase().includes(normalized)
    );

    if (system) return system;

    const subsector = props.sector.subsectors.find(
        subsector => subsector.subsector_name.toLowerCase().includes(normalized)
    );

    return subsector ?? null;
}

/**
 * Center on the given map position.
 * @param mapX position x
 * @param mapY position y
 * @param targetScale the target scale
 */
function centerOnMapPosition(mapX: number, mapY: number, targetScale = 1) {
    const viewportWidth = viewport.value?.clientWidth ?? 0;
    const viewportHeight = viewport.value?.clientHeight ?? 0;

    if (!viewportWidth || !viewportHeight) return;

    scale.value = Math.min(
        maxScale,
        Math.max(minScale, targetScale)
    );

    x.value = viewportWidth / 2 - mapX * scale.value;
    y.value = viewportHeight / 2 - mapY * scale.value;

    storeMapState();
}

/**
 * Smooth animate over to the given map position.
 * @param mapX position x
 * @param mapY position y
 * @param targetScale the target scale
 */
function animateToMapPosition(mapX: number, mapY: number, targetScale: number) {
    const viewportWidth = viewport.value?.clientWidth ?? 0;
    const viewportHeight = viewport.value?.clientHeight ?? 0;

    if (!viewportWidth || !viewportHeight) return;

    const targetX = viewportWidth / 2 - mapX * targetScale;
    const targetY = viewportHeight / 2 - mapY * targetScale;

    const startX = x.value;
    const startY = y.value;
    const startScale = scale.value;

    const duration = 1000;
    const startTime = performance.now();

    function frame(time: number) {
        const progress = Math.min((time - startTime) / duration, 1);

        // smoothstep
        const t = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        x.value = startX + (targetX - startX) * t;
        y.value = startY + (targetY - startY) * t;
        scale.value = startScale + (targetScale - startScale) * t;

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            storeMapState();
        }
    }

    requestAnimationFrame(frame);
}

/**
 * Center on the given system.
 * @param system the system
 */
function centerOnSystem(system: System) {
    const mapX = imageWidth.value * system.location_x / 100;
    const mapY = imageHeight.value * system.location_y / 100;

    // centerOnMapPosition(mapX, mapY, 2);
    animateToMapPosition(mapX, mapY, 2);
}

/**
 * Center on the given subsector.
 * @param subsector the subsector
 */
function centerOnSubsector(subsector: Subsector) {
    // centerOnMapPosition(subsector.x, subsector.y, 0.8);
}

// =====================================================================================

/**
 * OnMounted, add needed listeners and observers.
 */
onMounted(() => {
    viewport.value?.addEventListener('wheel', zoom, { passive: false });

    viewportObserver = new ResizeObserver(([entry]) => {
        if (!entry) return;

        viewportSize.value = {
            width: entry.contentRect.width,
            height: entry.contentRect.height
        };
    });

    if (viewport.value) {
        viewportObserver.observe(viewport.value);
    }
});

/**
 * OnBeforeUnmount, clear timeouts and cancel animation frames.
 */
onBeforeUnmount(() => {
    clearTimeout(tooltipTimer);

    if (dragging.dragFrame !== null) {
        cancelAnimationFrame(dragging.dragFrame);
        dragging.dragFrame = null;
    }

    if (locateDebounce) {
        clearTimeout(locateDebounce);
    }
});

/**
 * OnUnmounted, remove listeners and observers.
 */
onUnmounted(() => {
    viewport.value?.removeEventListener('wheel', zoom);
    viewportObserver?.disconnect();
});

</script>

<template>
    <div>
        <div ref="viewport" class="map-viewport" :class="{ dragging: dragging.active.value }"
            @pointerdown="onMapMouseDown" @pointermove="onMapMouseMove" @pointerup="onMapMouseUp" @pointercancel="onMapMouseUp"
            @contextmenu.prevent="onViewportRightClick()">

            <Transition>
                <div v-show="!imageLoading" class="map-world ornate-frame" :style="{
                    width: `${imageWidth}px`,
                    height: `${imageHeight}px`,
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    '--inverse-scale': Math.max(1, 1 / scale),
                    '--ui-scale': uiScale
                }">
                    <!-- Map image background -->
                    <img ref="mapImage" class="map-image" src="../../assets/images/map_main.svg" alt="Sector map"
                        draggable="false" @load="onImageLoad" />
                    <!-- Map image overlay -->
                    <img class="map-image-overlay" src="../../assets/images/overlay.png" alt="Sector map overlay"
                        draggable="false" />

                    <!-- Map svg background -->
                    <svg v-if="imageWidth && imageHeight" class="map-svg" viewBox="0 0 100 100"
                        preserveAspectRatio="none">
                        <!-- Map subsector overlay -->
                        <MapSubsector v-for="subsector in sector.subsectors" :key="subsector.subsector_ID"
                            :subsector="subsector" :hoveredSubsector="mapObjectInteraction.hoveredSubsector.value"
                            :selectedSubsector="mapObjectInteraction.selectedSubsector.value" @select="selectSubsector"
                            @pointerenter="onSubsectorEnter(subsector.subsector_ID)" @pointerleave="onSubsectorLeave()" />
                    </svg>

                    <!-- Map system overlay -->
                    <div class="system-container">
                        <MapSystem v-for="system in systems" :key="system.system_ID" :system="system"
                            :selectedSystem="mapObjectInteraction.selectedSystem.value" :factions="factions"
                            :mapScale="scale" :uiScale="uiScale" @select="selectSystem"
                            @pointerenter="onSystemEnter(system)" @pointerleave="onSystemLeave()" />
                    </div>
                </div>
            </Transition>
            <div class="map-controls" @pointerdown.stop>
                <button @click="resetView()" class="map-control-button button-primary button-tooltip" alt="Center view">
                    <img src="../../assets/icons/center.svg">
                </button>
                <button @click="showLocateOverlay()" class="map-control-button button-primary"
                    :class="{ 'button-tooltip': !locateInputVisible }" alt="Locate a system or subsector">
                    <img src="../../assets/icons/locate.svg">
                </button>
                <input v-show="locateInputVisible" ref="locateInput" id="locate-input"
                    placeholder="Type a system or subsector name" v-model="locateInputModel"
                    @blur="hideLocateOverlay()"></input>
            </div>
        </div>

        <MapTour />

        <Transition>
            <MapTooltip
                v-if="mapObjectInteraction.hoveredSystem.value || mapObjectInteraction.selectedSystem.value || mapObjectInteraction.hoveredSubsector.value || mapObjectInteraction.selectedSubsector.value"
                :selectedSubsector="mapObjectInteraction.selectedSubsector.value"
                :hoveredSubsector="mapObjectInteraction.hoveredSubsector.value"
                :selectedSystem="mapObjectInteraction.selectedSystem.value"
                :hoveredSystem="mapObjectInteraction.hoveredSystem.value" :factions="factions"
                :systemTypes="systemTypes" :navigation="navigation" />
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

.map-world {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
    /* DO NOT USE; this reduces quality of elements AND performance significantly */
    /* will-change: transform; */
}

.map-image,
.map-image-overlay {
    position: absolute;
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
        --button-primary-fontSize: 0;

        img {
            height: 20px;
        }
    }

    #locate-input {
        color: var(--color-text);
        padding: 2px;
        position: absolute;
        left: 71px;
        top: 46px;
        width: 250px;
        height: 31px;
        background: var(--color-background);
        border: 1px solid var(--color-text);
    }
}
</style>