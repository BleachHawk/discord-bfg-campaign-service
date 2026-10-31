
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import {
  sectors,
  subsectors,
  systemTypes,
  systems,
  campaigns,
  factions,
  battles,
} from "./schema.ts";
import * as schema from "./schema.ts";

const dbFile = process.env.DB_FILE_NAME;
if (!dbFile) {
  console.error("No db file name in .env");
}
export const client = createClient({
  url: dbFile!,
  authToken: process.env.TURSO_TOKEN!
});

export const db = drizzle(client, { schema });

// -------------------------
// CAMPAIGNS
// -------------------------

export async function getCampaigns() {
  return db.select().from(campaigns);
}

export async function getCampaignById(id: number) {
  const [result] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.campaign_ID, id))
    .limit(1);

  return result;
}

export async function getCampaignByDiscord(discord: string) {
  const [result] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.campaign_discord, discord))
    .limit(1);

  return result;
}

export async function getCampaignDetails(id: number) {
    const [campaign, factionList, systemTypeList] = await Promise.all([
        db.query.campaigns.findFirst({
            where: eq(campaigns.campaign_ID, id),
            with: {
                sector: {
                    with: {
                        subsectors: {
                            with: {
                                systems: true,
                            },
                        },
                    },
                },
                battles: true,
            },
        }),
        db.select().from(factions),
        db.select().from(systemTypes),
    ]);

    if (!campaign) return undefined;

     return {
        ...campaign,
        factions: factionList.map(faction => ({
            ...faction
        })),
        systemTypes: systemTypeList.map(systemType => ({
            ...systemType
        })),
    };
}

// -------------------------
// SECTORS
// -------------------------

export async function getSectors() {
  return db.select().from(sectors);
}

export async function getSectorById(id: number) {
  const [result] = await db
    .select()
    .from(sectors)
    .where(eq(sectors.sector_ID, id))
    .limit(1);

  return result;
}

// -------------------------
// SUBSECTORS
// -------------------------

export async function getSubsectors() {
  return db.select().from(subsectors);
}

export async function getSubsectorsBySectorId(
  sectorId: number,
) {
  return db
    .select()
    .from(subsectors)
    .where(eq(subsectors.sector_ID, sectorId));
}

export async function getSubsectorById(id: number) {
  const [result] = await db
    .select()
    .from(subsectors)
    .where(eq(subsectors.subsector_ID, id))
    .limit(1);

  return result;
}

// -------------------------
// SYSTEMS
// -------------------------

export async function getSystem() {
  return db.select().from(systems);
}

export async function getSystemsBySubsectorId(
  subsectorId: number,
) {
  return db
    .select()
    .from(systems)
    .where(eq(systems.subsector_ID, subsectorId));
}

export async function getSystemById(id: number) {
  const [result] = await db
    .select()
    .from(systems)
    .where(eq(systems.system_ID, id))
    .limit(1);

  return result;
}

export async function getSystemByName(name: string) {
  const [result] = await db
    .select()
    .from(systems)
    .where(eq(systems.system_name, name))
    .limit(1);

  return result;
}

// -------------------------
// FACTIONS
// -------------------------

export async function getFactions() {
  return db.select().from(factions);
}

export async function getFactionById(id: number) {
  const [result] = await db
    .select()
    .from(factions)
    .where(eq(factions.faction_ID, id))
    .limit(1);

  return result;
}

export async function getFactionByName(name: string) {
  const [result] = await db
    .select()
    .from(factions)
    .where(eq(factions.faction_name, name))
    .limit(1);

  return result;
}

// -------------------------
// BATTLES
// -------------------------

export async function getBattles() {
  return db.select().from(battles);
}

export async function getBattlesByCampaignId(
  campaignId: number,
) {
  return db
    .select()
    .from(battles)
    .where(eq(battles.campaign_ID, campaignId));
}

export async function getBattleById(id: number) {
  const [result] = await db
    .select()
    .from(battles)
    .where(eq(battles.battle_ID, id))
    .limit(1);

  return result;
}