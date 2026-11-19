import { ref, type Ref } from "vue";
import type { Subsector, System } from '@shared/types/types';

/**
 * System type visibility and scale modifiers.
 * 
 * TODO: make these configurable? (and store in localStorage) in a small dropdown menu at the top left
 * visibility is the map zoom scale at which they show their label
 * display is their own scale
 */
export const SYSTEM_TYPE_VISIBILITY: Record<number, { visibility: number; size: number }> = {
    1: { visibility: 0.4, size: 1.4 }, // hive
    2: { visibility: 0.4, size: 1.4 }, // forge
    3: { visibility: 0.4, size: 1.4 }, // dock
    4: { visibility: 0.5, size: 1.3 }, // fortress
    5: { visibility: 0.5, size: 1.3 }, // shrine
    6: { visibility: 0.5, size: 1.3 }, // industrial
    7: { visibility: 0.6, size: 1.2 }, // civilised
    8: { visibility: 0.7, size: 1.1 }, // mining
    9: { visibility: 0.7, size: 1.1 }, // agri
    // mining_asteroid: { visibility: 0.7, display: 1.1 },
    10: { visibility: 0.8, size: 1.0 }, // knight
    11: { visibility: 0.8, size: 1.0 }, // research
    12: { visibility: 1.0, size: 0.9 }, // feudal
    13: { visibility: 1.1, size: 0.9 }, // penal
    14: { visibility: 1.1, size: 0.9 }, // feral
    // dead: { visibility: 1.1, display: 0.9 }
};

/**
 * Session storage key for the map state.
 */
export const SESSION_STORAGE_MAP_STATE_KEY = 'campaign_map_state';

/**
 * Class for holding the map dragging state.
 */
export class Dragging {
    mode: boolean = false; // dragging mode
    active: Ref<boolean> = ref(false); // actually dragging happening
    dragFrame: number | null = null; // the requested animation frame
    dragStartX: number = 0; // start x
    dragStartY: number = 0; // start y
    lastMouseX: number = 0; // last mouse x
    lastMouseY: number = 0; // last mouse y
    pendingPointerX: number = 0; // the newest pending X point
    pendingPointerY: number = 0; // the newest pending Y point
}

/**
 * Class for holding hover / selected states for Systems and Subsectors.
 */
export class MapObjectInteraction {
    hoveredSystem: Ref<System | null> = ref(null);
    selectedSystem: Ref<System | null> = ref(null);
    hoveredSubsector: Ref<Subsector | null> = ref(null);
    selectedSubsector: Ref<Subsector | null> = ref(null);
};