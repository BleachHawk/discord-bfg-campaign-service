import type { Campaign, CampaignPhase, Faction, SystemType } from '@shared/types/types';
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

export function getFactionNameByID(factionID: number | undefined | null, factions: Faction[]): string {
    const faction = factions.find(fac => fac.faction_ID === factionID);
    return faction ? faction.faction_name : '';
}

export function getTypeIconUrl(typeID: number | undefined, systemTypes: SystemType[]): string {
    if (!typeID) return '';
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

export function getIconByName(name: string): string {
    return icons[name] ?? '';
}

export function convertDateToString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function retrievePhase(campaignData: Campaign, timestamp: Date) {
    const startDate = campaignData.campaign_startDate;
    const phases: CampaignPhase[] = campaignData.campaignPhases;

    if (!campaignData || !startDate) {
        return undefined;
    }
    // const currentDate: Date = new Date();

    // Parse date as local calendar date, avoiding UTC conversion issues.
    const [year, month, day] = startDate.split("-").map(Number);
    if (!year || !month || !day) {
        return undefined;
    }

    const start = new Date(year, month - 1, day);

    if (timestamp < start) {
        return {
            campaign_phase_ID: 0,
            name: 'In Preparation',
            runtime: '',
            startdate: convertDateToString(start),
            objective: '',
            description: 'The Campaign has not yet started.',
            battle_size: '',
            campaign_ID: campaignData.campaign_ID
        };
    }

    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const end = new Date(start);

        switch (phase!.runtime) {
            case "day":
                end.setDate(end.getDate() + 1);
                break;

            case "week":
                end.setDate(end.getDate() + 7);
                break;

            case "month":
                end.setMonth(end.getMonth() + 1);
                break;

            case "year":
                end.setFullYear(end.getFullYear() + 1);
                break;
        }

        phase!.startdate = convertDateToString(start);
        phase!.enddate = convertDateToString(end);

        if (timestamp < end) {
            return phase;
        }

        // Next phase starts when this one ends.
        start.setTime(end.getTime());
    }

    // Campaign has progressed beyond its defined phases.
    // TODO:
    return {
        campaign_phase_ID: 0,
        name: 'End',
        runtime: '',
        objective: '', // tell everyone who won?
        description: 'The Campaign has concluded.',
        battle_size: '',
        campaign_ID: campaignData.campaign_ID
    };
}

export function getPhase(campaignData: Campaign, timestamp: number): CampaignPhase | undefined {
    return retrievePhase(campaignData, new Date(timestamp));
}

export function getCurrentPhase(campaignData: Campaign): CampaignPhase | undefined {
    return retrievePhase(campaignData, new Date());
}