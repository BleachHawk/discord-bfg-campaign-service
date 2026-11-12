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

export function isInSameBlock(factionId1: number, factionId2: number, factions: Faction[]): boolean {
    if (factionId1 === factionId2) {
        return true;
    }
    const faction1 = factions[factionId1];
    if (faction1?.composite && faction1?.composite.includes(factionId2)) {
        return true;
    }
    const faction2 = factions[factionId2];
    if (faction2?.composite && faction2?.composite.includes(factionId1)) {
        return true;
    }
    return false;
}

export function getSystemType(systemTypeID: number, types: SystemType[]): SystemType {
    return types.find(
        t => t.system_type_ID === systemTypeID
    )!;
}

/**
 * Get the number of control points earned by the given battle victory point difference.
 * Depending on the victory margins:
 * 1–250 difference in victory points = marginal victory = +1 control point
 * 251–600 difference in victory points = decisive victory = +2 control points
 * 601+ difference in victory points = massacre / total annihilation = +3 control points
 * @param vpDifference the difference in victory points.
 * @returns the number of control points
 */
export function getControlPoints(vpDifference: number): number {
	if (vpDifference <= 250) return 1;
	if (vpDifference <= 600) return 2;
	return 3;
}
