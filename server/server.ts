import express from "express";
import * as dbQueries from "./db/queries.ts";
import type { Campaign, Faction, Subsector, System } from "../shared/types/types.ts";
import * as utils from "../shared/utils/utils.ts";

const app = express();
const port = process.env.PORT || 3001;

type Territory = System | Subsector;

/**
 * Determines and assigns ownership of a territory based on the control points
 * accumulated by individual factions and their respective composite faction
 * blocks.
 *
 * Ownership is determined in two stages:
 *
 * 1. **Composite block scoring**
 *    - Each faction's control points are attributed to its composite block,
 *      if it belongs to one and the points are added together to
 *      calculate that block's combined power.
 *    - The block with the highest combined power becomes the leading block.
 *    - If multiple blocks share the highest combined score, the territory
 *      is considered contested and `currentFaction_ID` is set to `100` (contested).
 *
 * 2. **Individual faction scoring**
 *    - The individual control point totals of all factions are compared.
 *    - If multiple factions share the highest individual score, the territory
 *      is considered contested and `currentFaction_ID` is set to `100` (contested).
 *    - If the faction with the highest individual score belongs to the
 *      leading block, that individual faction is assigned ownership.
 *    - Otherwise, the leading composite block takes ownership, even if a
 *      single faction belonging to another block has a higher individual
 *      score. This ensures that combined block power takes precedence over
 *      individual faction strength.
 *
 * If no faction has accumulated any control points, the territory has no
 * owner and `currentFaction_ID` is set to `undefined`.
 *
 * The resulting `currentFaction_ID` therefore represents:
 * - An individual faction ID, if that faction controls the territory.
 * - A composite faction ID, if its combined power controls the territory.
 * - `100`, if the territory is contested.
 * - `undefined`, if the territory has no controlling faction.
 *
 * @param territory - The system or subsector whose ownership is being determined.
 *                    Its `factionPower` property contains the individual control
 *                    point totals for each faction.
 * @param factions - All factions participating in the campaign, including their
 *                   composite block definitions. A composite faction's
 *                   `composite` property contains the IDs of its member factions.
 *
 * @returns Nothing. Updates `territory.currentFaction_ID` directly.
 */
function determineOwnership(
	territory: Territory,
	factions: Faction[]
): void {
	if (!territory.ownership || !territory.ownership.factionPower) {
		return;
	}
	const factionPower = territory.ownership.factionPower;
	const entries = Object.entries(factionPower)
		.map(([factionID, points]) => ({
			factionID: Number(factionID),
			points
		}))
		.filter(faction => faction.points > 0);
	if (entries.length === 0) {
		return;
	}

	// Sum the points of all factions belonging to the same block.
	const blockPower: Record<number, number> = {};
	for (const { factionID, points } of entries) {
		const blockID = utils.getBlockId(factionID, factions);
		blockPower[blockID] = (blockPower[blockID] ?? 0) + points;
	}

	// Identify the block with the highest combined score.
	const highestBlockPoints = Math.max(...Object.values(blockPower));

	const leadingBlocks = Object.entries(blockPower)
		.filter(([, points]) => points === highestBlockPoints)
		.map(([blockID]) => Number(blockID));

	// A tie between blocks means contested territory.
	if (leadingBlocks.length !== 1) {
		console.log('contested territory: ' + JSON.stringify(territory));
		territory.ownership.currentFaction_ID = 100;
		return;
	}

	const leadingBlockID = leadingBlocks[0];

	// Identify the faction with the highest individual score.
	const highestFactionPoints = Math.max(
		...entries.map(faction => faction.points)
	);
	const leadingFactions = entries.filter(
		faction => faction.points === highestFactionPoints
	);

	
	if (leadingFactions.length < 1) {
		return;
	}
	else if (leadingFactions.length > 1) {
		// A tie between individual factions means contested territory.
		territory.ownership.currentFaction_ID = 100;
		return;
	}

	const leadingFaction = leadingFactions[0];

	// if the strongest individual faction belongs to the winning block,
	// that faction controls the territory.
	if (utils.getBlockId(leadingFaction!.factionID, factions) === leadingBlockID) {
		territory.ownership.currentFaction_ID = leadingFaction!.factionID;
	} else if (leadingBlockID) {
		// otherwise, the leading block takes precedence.
		territory.ownership.currentFaction_ID = leadingBlockID;
	}
}

/**
 * Process all the campaign battles and determine the ownership of systems and subsectors.
 * @param campaign the campaign object
 */
function processBattles(campaign: Campaign): void {
	// Reset all systems and subsectors
	for (const subsector of campaign.sector.subsectors) {
		subsector.ownership = undefined;
		for (const system of subsector.systems) {
			system.ownership = undefined;
		}
	}

	// Process each battle
	for (const battle of campaign.battles) {
		const vpDifference = Math.abs(
			battle.battle_victoryPoints1 - battle.battle_victoryPoints2
		);
		if (vpDifference < 1) {
			return;
		}
		const controlPoints = utils.getControlPoints(vpDifference);

		// Find the system where the battle took place
		const system = campaign.sector.subsectors
			.flatMap(subsector => subsector.systems)
			.find(system => system.system_ID === battle.battle_system);

		if (!system) {
			continue;
		}

		// TODO: handle same victory points

		// find the winning faction
		const winningFaction =
			battle.battle_victoryPoints1 > battle.battle_victoryPoints2
				? battle.battle_faction1
				: battle.battle_faction2;

		// Award control points to the winning faction
		if (!system.ownership) {
			system.ownership = {
				factionPower: {},
				currentFaction_ID: 0
			};
		}
		system.ownership.factionPower![winningFaction] =
			(system.ownership.factionPower![winningFaction] ?? 0) + controlPoints;

		console.log('winning faction: ' + campaign.factions.find(f => f.faction_ID === winningFaction)?.short_name + "; " + controlPoints + ' in ' + system?.system_name);
	}

	// Process ownership for every system and subsector
	for (const subsector of campaign.sector.subsectors) {
		if (!subsector.ownership) {
			subsector.ownership = {
				factionPower: {},
				currentFaction_ID: 0
			};
		}

		// Aggregate system control points into the subsector
		subsector.ownership.factionPower = {};

		for (const system of subsector.systems) {
			if (!system.ownership) {
				continue;
			}
			// Determine ownership of the system
			determineOwnership(system, campaign.factions);

			for (const [factionID, points] of Object.entries(system.ownership!.factionPower!)) {
				const id = Number(factionID);
				const systemType = utils.getSystemType(system.system_type_ID, campaign.systemTypes);
				const factionBlockId = utils.getBlockId(id, campaign.factions);

				// for subsector ownership, incorporate the system importance, if the faction block is currently holding the system
				// const modifier = utils.isInSameBlock(system.ownership?.currentFaction_ID, id, campaign.factions) ? systemType.importance : 1;

				// for subsector ownership, incorporate the system importance, if a single faction (not faction block) is currently holding the system
				// let modifier = 1;
				// if (id === system.ownership?.currentFaction_ID) {
				// 	console.log('faction: ' + id + ' is holding the system ' + system.system_name + '. Apply system importance for subsector control.');
				// 	modifier = systemType.importance;
				// }

				// apply modifier for all control point entries
				const modifier = systemType.importance;

				// TODO: if a faction block holds >50% of all control points on a system, give another bonus

				subsector.ownership.factionPower[factionBlockId] = Math.round((subsector.ownership.factionPower[factionBlockId] ?? 0) + points * modifier);
			}
		}

		// Determine ownership of the subsector
		determineOwnership(subsector, campaign.factions);
	}
}

app.get("/campaign", async (req, res) => {
	const campaign = await dbQueries.getCampaignDetails(parseInt(process.env.CAMPAIGN_ID!));

	if (!campaign) {
		res.status(404).json({
			error: "Campaign not found"
		});
		return;
	}
	processBattles(campaign as Campaign);

	console.log("campaign sent");
	res.send(campaign);
});

app.get("/battles", async (req, res) => {
	const battles = await dbQueries.getBattlesByCampaignId(parseInt(process.env.CAMPAIGN_ID!));
	if (!battles) {
		res.status(404).json({
			error: "Battles not found"
		});
		return;
	}
	console.log("battles sent");
	res.send(battles);
});

app.get("/factions", async (req, res) => {
	const factions = await dbQueries.getFactions();
	if (!factions) {
		res.status(404).json({
			error: "Factions not found"
		});
		return;
	}
	console.log("factions sent");
	res.send(factions);
});

app.use(express.static('public'));

app.listen(port, () => {
	console.log(`Listening on port ${port}...`);
});