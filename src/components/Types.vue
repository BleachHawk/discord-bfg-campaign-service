<script lang="ts">

export interface System {
    subsector_ID: number;
    system_ID: number;
    system_name: string;
    location_x: number;
    location_y: number;
    description: string;
    type?: string;
    currentFaction?: string;
}

export interface Subsector {
    sector_ID: number;
    subsector_ID: number;
    subsector_name: string;
    polygon_points: [number, number][];
    description: string;
    systems: System[];
}

export interface Sector {
    sector_ID: number;
    sector_name: string;
    subsectors: Subsector[]
}

</script>