import express from "express";
import * as dbQueries from "./db/queries.ts";
import type { Campaign, Faction, Subsector, System } from "../shared/types/types.ts";
import * as utils from "../shared/utils/utils.ts";

const app = express();
const port = process.env.PORT || 3001;

/**
 * Get the number of control points earned by the given battle victory point difference.
 * Depending on the victory margins:
 * 1–250 difference in victory points = marginal victory = +1 control point
 * 251–600 difference in victory points = decisive victory = +2 control points
 * 601+ difference in victory points = massacre / total annihilation = +3 control points
 * @param vpDifference the difference in victory points.
 * @returns the number of control points
 */
function getControlPoints(vpDifference: number): number {
	if (vpDifference <= 250) return 1;
	if (vpDifference <= 600) return 2;
	return 3;
}

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
	territory: System | Subsector,
	factions: Faction[]
): void {
	const factionPower = territory.factionPower;
	if (!factionPower) {
		return;
	}

	const entries = Object.entries(factionPower)
		.map(([factionID, points]) => ({
			factionID: Number(factionID),
			points
		}))
		.filter(faction => faction.points > 0);

	if (entries.length === 0) {
		territory.currentFaction_ID = undefined;
		return;
	}

	// Map each member faction to its composite block.
	const getBlockID = (factionID: number): number => {
		const composite = factions.find(
			faction => faction.composite?.includes(factionID)
		);

		return composite ? composite.faction_ID : factionID;
	};

	// Sum the points of all factions belonging to the same block.
	const blockPower: Record<number, number> = {};

	for (const { factionID, points } of entries) {
		const blockID = getBlockID(factionID);
		blockPower[blockID] = (blockPower[blockID] ?? 0) + points;
	}

	// Identify the block with the highest combined score.
	const highestBlockPoints = Math.max(...Object.values(blockPower));

	const leadingBlocks = Object.entries(blockPower)
		.filter(([, points]) => points === highestBlockPoints)
		.map(([blockID]) => Number(blockID));

	// A tie between blocks means contested territory.
	if (leadingBlocks.length !== 1) {
		console.log('contested territory');
		territory.currentFaction_ID = 100;
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

	// A tie between individual factions means contested territory.
	if (leadingFactions.length < 1) {
		return;
	}
	if (leadingFactions.length > 1) {
		territory.currentFaction_ID = 0;
		return;
	}

	const leadingFaction = leadingFactions[0];

	// If the strongest individual faction belongs to the winning block,
	// that faction controls the territory.
	if (getBlockID(leadingFaction!.factionID) === leadingBlockID) {
		territory.currentFaction_ID = leadingFaction!.factionID;
	} else {
		// Otherwise, the leading block takes precedence.
		territory.currentFaction_ID = leadingBlockID;
	}
}

/**
 * Process all the campaign battles and determine the ownership of systems and subsectors.
 * @param campaign the campaign object
 */
function processBattles(campaign: Campaign): void {
	// Reset all systems and subsectors
	for (const subsector of campaign.sector.subsectors) {
		subsector.currentFaction_ID = undefined;
		for (const system of subsector.systems) {
			system.currentFaction_ID = undefined;
			system.factionPower = {};
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
		const controlPoints = getControlPoints(vpDifference);

		// Find the system where the battle took place
		const system = campaign.sector.subsectors
			.flatMap(subsector => subsector.systems)
			.find(system => system.system_ID === battle.battle_system);

		if (!system) {
			continue;
		}

		const winningFaction =
			battle.battle_victoryPoints1 > battle.battle_victoryPoints2
				? battle.battle_faction1
				: battle.battle_faction2;

		// Award control points to the winning faction
		system.factionPower![winningFaction] =
			(system.factionPower![winningFaction] ?? 0) + controlPoints;

		console.log('winning faction: ' + campaign.factions.find(f => f.faction_ID === winningFaction)?.short_name + "; " + controlPoints + ' in ' + system?.system_name);
	}

	// Process ownership for every system and subsector
	for (const subsector of campaign.sector.subsectors) {
		// Aggregate system control points into the subsector
		subsector.factionPower = {};

		for (const system of subsector.systems) {
			for (const [factionID, points] of Object.entries(system.factionPower!)) {
				const id = Number(factionID);

				subsector.factionPower[id] =
					(subsector.factionPower[id] ?? 0) + points;
			}

			// Determine ownership of the system
			determineOwnership(system, campaign.factions);
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