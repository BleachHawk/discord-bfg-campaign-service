<script lang="ts">
import type { Faction, SystemType } from '@shared/types/types';
import * as utils from '@shared/utils/utils';

let icons: { [k: string]: string; } = {};

export function initIcons() {
    // find all the icons and map them to their names
    icons = Object.fromEntries(
        Object.entries(import.meta.glob('/src/assets/icons/*.svg', {
            eager: true,
            query: '?url',
            import: 'default'
        })).map(([path, url]) => [
            path.split('/').pop()!.replace('.svg', ''),
            url
        ])
    );
}

export function getFactionNameByID(currentFaction_ID: number | undefined, factions: Faction[]): string {
    const faction = factions.find(fac => fac.faction_ID === currentFaction_ID);
    return faction ? faction.faction_name : '';
}

export function getTypeIconUrl(typeID: number, systemTypes: SystemType[]): string {
    const type = utils.getSystemType(typeID, systemTypes);
    let url = '';
    if (type) {
        url = icons[type.short_name] ?? '';
    }
    return url;
};

export function getLatinNumberIconUrl(ID: number | undefined): string {
    let url = '';
    if (ID) {
        url = icons['latin_' + ID] ?? '';
    }
    return url;
}

export function getFactionIconUrl(currentFactionID: number | undefined, factions: Faction[]): string {
    if (!currentFactionID) {
        return '';
    } else {
        const key = factions.find(fac => fac.faction_ID === currentFactionID)?.short_name;
        const url = key ? icons[key] : '';
        return url ?? '';
    }
};
</script>