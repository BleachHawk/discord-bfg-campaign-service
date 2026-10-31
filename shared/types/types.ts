export interface SystemType {
    system_type_ID: number;
    system_type_name: string;
    short_name: string;
    description: string;
    importance: number;
}

export interface System {
    subsector_ID: number;
    system_ID: number;
    system_name: string;
    location_x: number;
    location_y: number;
    description: string;
    system_type_ID: number;
    currentFaction_ID?: number;
    factionPower?: Record<number, number>;
    scale?: number;
    visibleScale?: number;
    typeIconUrl?: string;
    factionIconUrl?: string;
}

export interface Subsector {
    sector_ID: number;
    subsector_ID: number;
    subsector_name: string;
    polygon_points: [number, number][];
    description: string;
    systems: System[];
    factionPower?: Record<number, number>;
    currentFaction_ID?: number;
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
    composite: number[];
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

export interface Campaign {
    campaign_ID: number;
    campaign_discord: string;
    campaign_name: string;
    campaign_sector_ID: number;
    campaign_startDate: string | null;
    factions: Faction[];
    battles: Battle[];
    sector: Sector;
}