<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, onBeforeUnmount } from 'vue';
import type { Battle, Faction, Sector, Subsector, System, SystemType } from '@shared/types/types';
import MapRegion from './MapRegion.vue';
import MapSystem from './MapSystem.vue';
import * as utils from '@shared/utils/utils'

type RefreshFunction = () => void;

const props = defineProps<{
    sector: Sector,
    systemTypes: SystemType[],
    factions: Faction[],
    battles: Battle[],
    icons: { [k: string]: string; },
    refreshFunction: RefreshFunction,
}>()

// TODO: make these configurable? (and store in localStorage) in a small dropdown menu at the top left
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
    // mining_asteroid: { visibility: 0.7, display: 1.1 },
    10: { visibility: 0.8, display: 1.0 }, // knight
    11: { visibility: 0.8, display: 1.0 }, // research
    12: { visibility: 1.0, display: 0.9 }, // feudal
    13: { visibility: 1.1, display: 0.9 }, // penal
    // dead: { visibility: 1.1, display: 0.9 }
};

function getTypeIconUrl(typeID: number): string {
    const type = utils.getSystemType(typeID, props.systemTypes);
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
                factionIconUrl: getFactionIconUrl(system.ownership?.currentFaction_ID)
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
const tooltipSystem = computed(() => {
    const system = hoveredSystem.value ?? selectedSystem.value;
    if (!system) return null;
    const systemType = utils.getSystemType(system.system_type_ID, props.systemTypes);

    return {
        ...system,
        system_type_name: systemType?.system_type_name,
        system_type_description: systemType?.description,
        system_type_importance: systemType?.importance,
    };
});
const hoveredSubsector = ref<Subsector | null>(null);
const selectedSubsector = ref<Subsector | null>(null);
const tooltipSubsector = computed(() => {
    const subsector = hoveredSubsector.value ?? selectedSubsector.value;
    if (!subsector) return null;
    let leadingFactionBlock = null;
    if (subsector.ownership) {
        leadingFactionBlock = utils.getBlockFaction(subsector.ownership.currentFaction_ID, props.factions);
    }

    return {
        ...subsector,
        currentFactionBlock: leadingFactionBlock,
        selected: (selectedSubsector && selectedSubsector.value?.subsector_ID === hoveredSubsector.value?.subsector_ID) ? true : false
    }
})

const scale = ref(1);
const x = ref(0);
const y = ref(0);

let framePending = false

const minScale = 0.30;
const maxScale = 5;
const zoomFactor = 1.15;

const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
const sessionStorageMapKey = 'campaign_map_state';

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

// function zoomIn() {
//     scale.value = Math.min(maxScale, scale.value * zoomFactor);
//     storeMapState();
// }
// function zoomOut() {
//     scale.value = Math.max(minScale, scale.value / zoomFactor);
//     storeMapState();
// }

function startDrag(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging.value = true;

    dragStartX = event.clientX;
    dragStartY = event.clientY;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function drag(event: PointerEvent) {
    if (!dragging.value) return;

    if (framePending) {
        return;
    }

    if (Math.abs(event.clientX - dragStartX) > 3 || Math.abs(event.clientY - dragStartY) > 3) {
        // actual dragging happened
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } else {
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

function refreshView() {
    props.refreshFunction();
}

function resetView() {
    scale.value = 1;
    centerImage();
}

function onRegionEnter(subsector_ID: number) {
    const subsector = props.sector.subsectors.find(a => a.subsector_ID === subsector_ID);
    subsector && (hoveredSubsector.value = subsector);
}

function onRegionLeave() {
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

function deselectAll() {
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
    <div ref="viewport" class="map-viewport" :class="{ dragging, loading }" @click="deselectAll();"
        @pointerdown="startDrag" @pointermove="drag" @pointerup="stopDrag" @pointercancel="stopDrag">

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
                        :hoveredSubsector="hoveredSubsector" :selectedSubsector="selectedSubsector" :selectSubsector="selectSubsector"
                        @pointerenter="onRegionEnter(subsector.subsector_ID)" @pointerleave="onRegionLeave()" />
                </svg>
            </Transition>

            <!-- Map interactive points -->
            <div class="system-container">
                <MapSystem v-for="system in systems" :system="system" :selectedSystem="selectedSystem"
                    :selectSystem="selectSystem" :factions="factions" :mapScale="scale"
                    @pointerenter="onSystemEnter(system)" @pointerleave="onSystemLeave()" />
            </div>
        </div>

        <div class="map-controls" @pointerdown.stop>
            <button @click.stop="refreshView" class="map-control-button" alt="Refresh data">
                <img src="../assets/icons/refresh.svg">
            </button>
            <button @click.stop="resetView" class="map-control-button" alt="Center view">
                <img src="../assets/icons/center.svg">
            </button>
            <!-- <span>{{ Math.round(scale * 100) }}%</span> -->
            <!-- <span>{{ scale }}</span> -->
        </div>

    </div>

    <!-- TODO: flesh out tooltip. 
        details for system type, importance, details on ownership / controls points, ... -->
    <Transition>
        <div v-if="hoveredSystem || selectedSystem || hoveredSubsector || selectedSubsector" class="map-tooltip"
            :class="{ 'map-tooltip-selected': selectedSystem }">

            <template v-if="tooltipSystem">
                <div class="map-tooltip-icon-container">
                    <img :src="tooltipSystem.typeIconUrl" style="max-width: 80px;">
                </div>
                <strong>
                    {{ tooltipSystem.system_name }}
                </strong>
                <article>
                    <details>
                        <summary>{{ tooltipSystem.system_type_name }}</summary>
                        {{ tooltipSystem.system_type_description }}
                        Importance: {{ tooltipSystem.system_type_importance }}
                    </details>
                    <p>
                        {{ tooltipSystem.description }}
                    </p>
                </article>

                <div v-if="tooltipSystem.ownership">
                    <br>
                    <article>
                        <span v-if="tooltipSystem.ownership.currentFaction_ID !== 100">Currently under control of
                        </span>
                        <span v-else>Currently </span>
                        <details>
                            <summary>{{ getFactionNameByID(tooltipSystem.ownership.currentFaction_ID) }}</summary>
                            <li v-for="[factionId, power] in
                                Object.entries(tooltipSystem?.ownership.factionPower ?? {})
                                    .sort(([, a], [, b]) => b - a)" :key="factionId">
                                Faction ID: {{ factionId }} Control: {{ power }}
                            </li>
                        </details>
                    </article>
                    <div class="map-tooltip-icon-container">
                        <img :src="tooltipSystem.factionIconUrl" style="max-width: 80px;">
                    </div>
                </div>
            </template>

            <template v-else-if="tooltipSubsector">
                <strong>
                    {{ tooltipSubsector?.subsector_name }} Subsector ({{ tooltipSubsector?.subsector_ID }})
                </strong>
                <article v-if=tooltipSubsector?.ownership>
                    <p>
                        Faction control: {{ tooltipSubsector.currentFactionBlock?.faction_name }}
                    </p>
                    <p>
                        <li v-for="[factionId, power] in
                            Object.entries(tooltipSubsector?.ownership.factionPower ?? {})
                                .sort(([, a], [, b]) => b - a)" :key="factionId">
                            Faction ID: {{ factionId }} Control: {{ power }}
                        </li>
                    </p>
                </article>
                <p>
                    {{ tooltipSubsector?.description }}
                </p>
            </template>
        </div>
    </Transition>
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

.map-tooltip {
    position: absolute;
    z-index: 5;
    top: 110px;
    left: 10px;
    min-width: 15vw;
    max-width: 15vw;
    padding: 12px;
    border: 1px solid var(--color-text);
    border-radius: 6px;
    background: var(--tooltip-background);
    pointer-events: none;
    cursor: default;

    strong {
        font-size: 18px;
    }

    p {
        margin-bottom: 0;
    }

    article {
        padding: 5px;
        backdrop-filter: brightness(150%);

        details>summary {
            cursor: pointer;
        }
    }

    .map-tooltip-icon-container {
        display: flex;
        justify-content: center;
    }

    &.map-tooltip-selected {
        pointer-events: all;
    }
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
        min-width: 36px;
        min-height: 36px;
        cursor: pointer;
        background: inherit;
        color: inherit;


        &::after {
            content: attr(alt);
            position: absolute;
            top: 40px;
            padding: 5px;
            width: 100px;
            border: 1px solid var(--color-text);
            border-radius: 6px;
            background: var(--tooltip-background);
            transition: opacity 0.4s ease;
            transition-delay: 250ms;
            opacity: 0;
        }

        &:hover:after {
            opacity: 1;
        }

        img {
            height: 20px;
        }
    }
}
</style>