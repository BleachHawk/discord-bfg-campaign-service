<script lang="ts">
export interface SubSector {
    id: string;
    name: string;
    points: [number, number][];
    description: string;
}

export interface System {
    id: string;
    name: string;
    x: number;
    y: number;
    areaId: string;
    description: string;
    type?: string;
    currentFaction?: string;
}
</script>