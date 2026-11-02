import type { Faction, SystemType } from "@shared/types/types";

export function getBlockId(factionID: number, factions: Faction[]): number {
    const composite = factions.find(f => f.composite?.includes(factionID));
    return composite ? composite.faction_ID : factionID;
}

export function getBlockFaction(factionID: number, factions: Faction[]): Faction | null {
    const composite = factions.find(f => {
        // if the given factionID is a composite faction, return it
        if (f.faction_ID === factionID) {
            return f;
        }
        // else, look for the composite that included the given factionID
        return f.composite?.includes(factionID);
    });
    return composite ? composite : null;
}

export function getSystemType(systemTypeID: number, types: SystemType[]): SystemType {
    return types.find(
        t => t.system_type_ID === systemTypeID
    )!;
}
