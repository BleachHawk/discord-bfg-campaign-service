export interface System {
    subsector_ID: number;
    system_ID: number;
    system_name: string;
    location_x: number;
    location_y: number;
    description: string;
    type: string;
    currentFaction_ID?: number;
    factionPower: Record<number, number>;
    visibleScale: number;
    typeIconUrl: string;
    factionIconUrl: string;
}

export interface Subsector {
    sector_ID: number;
    subsector_ID: number;
    subsector_name: string;
    polygon_points: [number, number][];
    description: string;
    systems: System[];
    factionPower: Record<number, number>;
}

export interface Sector {
    sector_ID: number;
    sector_name: string;
    subsectors: Subsector[]
}

export interface Faction {
    faction_ID: number;
    faction_name: string;
    short_name: string;
}

export interface Battle {
    battle_ID: number;
    campaign_ID: number;
    battle_system: number;
    battle_faction1: number;
    battle_faction2: number;
    battle_points: number;
    battle_player1: string | null;
    battle_player2: string | null;
    battle_victoryPoints1: number;
    battle_victoryPoints2: number;
    battle_report: string | null;
    battle_author: string;
}