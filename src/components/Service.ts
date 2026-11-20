import type { Campaign, CampaignPhase, Faction, SystemType } from '@shared/types/types';
import * as utils from '@shared/utils/utils';

/**
 * The icon (url) map.
 * Consumers can get the svg url for a given icon name.
 */
let icons: { [k: string]: string; } = {};

/**
 * Init all the needed icons.
 */
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

/**
 * Get the faction name by ID.
 * @param factionID the faction ID
 * @param factions the list of all factions
 * @returns the faction name
 */
export function getFactionNameByID(factionID: number | undefined | null, factions: Faction[]): string {
    const faction = factions.find(fac => fac.faction_ID === factionID);
    return faction ? faction.faction_name : '';
}

/**
 * Get the system type icon url by system type ID.
 * @param typeID the system type ID
 * @param systemTypes the list of all system types
 * @returns the url of the system type icon svg
 */
export function getTypeIconUrl(typeID: number | undefined, systemTypes: SystemType[]): string {
    if (!typeID) return '';
    const type = utils.getSystemType(typeID, systemTypes);
    let url = '';
    if (type) {
        url = icons[type.short_name] ?? '';
    }
    return url;
};

/**
 * Get the latin number icon url by number.
 * @param latinNumber the number (I - IV) 
 * @returns the url of the latin number icon svg
 */
export function getLatinNumberIconUrl(latinNumber: number | undefined): string {
    let url = '';
    if (latinNumber) {
        url = icons['latin_' + latinNumber] ?? '';
    }
    return url;
}

/**
 * Get the faction icon url by faction ID
 * @param factionID the faction ID
 * @param factions the list of all faction
 * @returns the url of the faction icon svg
 */
export function getFactionIconUrl(factionID: number | undefined, factions: Faction[]): string {
    if (!factionID) {
        return '';
    } else {
        const key = factions.find(fac => fac.faction_ID === factionID)?.short_name;
        const url = key ? icons[key] : '';
        return url ?? '';
    }
};

/**
 * Get the icon url by name
 * @param name the icon name
 * @returns the url to the given icon name svg
 */
export function getIconUrlByName(name: string): string {
    return icons[name] ?? '';
}

/**
 * Convert the given date to string.
 * @param date the date
 * @returns a date string
 */
export function convertDateToString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Retrieve the campaign phase for given date.
 * @param campaignData the campaign data
 * @param date the date
 * @returns the campaign phase
 */
function retrievePhaseByDate(campaignData: Campaign, date: Date) {
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

    if (date < start) {
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

        if (date < end) {
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

/**
 * Get the campaign phase by timestamp.
 * @param campaignData the campaign data
 * @param timestamp the timestamp
 * @returns the campaign phase for given timestamp
 */
export function getPhase(campaignData: Campaign, timestamp: number): CampaignPhase | undefined {
    return retrievePhaseByDate(campaignData, new Date(timestamp));
}

/**
 * Get the currently active campaign phase.
 * @param campaignData the campaign data
 * @returns the currently active campaign phase
 */
export function getCurrentPhase(campaignData: Campaign): CampaignPhase | undefined {
    return retrievePhaseByDate(campaignData, new Date());
}

export function getPolygonCenter(points: [number, number][]): [number, number] {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    return [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2
    ];
}