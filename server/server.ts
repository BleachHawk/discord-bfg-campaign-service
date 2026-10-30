import express from "express";
import * as dbQueries from "./db/queries";

const app = express();
const port = process.env.PORT || 3001;

// function determineOwnership(
//     location: System | Subsector,
//     factions: Faction[]
// ) {
//     const factionPower = location.factionPower;

//     const leadingFaction = Object.entries(factionPower)
//         .map(([id, points]) => ({
//             faction_ID: Number(id),
//             points
//         }))
//         .sort((a, b) => b.points - a.points)[0];

//     if (!leadingFaction) {
//         location.currentFaction_ID = null;
//         location.current_ID = null;
//         return;
//     }

//     const blockPower: Record<number, number> = {};

//     Object.entries(factionPower).forEach(([id, points]) => {
//         const faction = factions.find(
//             f => f.faction_ID === Number(id)
//         );

//         if (!faction) return;

//         blockPower[faction.powerBlock_ID] =
//             (blockPower[faction.powerBlock_ID] ?? 0) + points;
//     });

//     const leadingBlock = Object.entries(blockPower)
//         .map(([id, points]) => ({
//             block_ID: Number(id),
//             points
//         }))
//         .sort((a, b) => b.points - a.points)[0];

//     if (!leadingBlock) return;

//     const faction = factions.find(
//         f => f.faction_ID === leadingFaction.faction_ID
//     );

//     if (faction?.powerBlock_ID === leadingBlock.block_ID) {
//         location.currentFaction_ID = leadingFaction.faction_ID;
//         location.current_ID = null;
//     } else {
//         location.currentFaction_ID = null;
//         location.current_ID = leadingBlock.block_ID;
//     }
// }

// function getControlPoints(difference: number): number {
//     if (difference <= 0) return 0;
//     if (difference <= 250) return 1;
//     if (difference <= 600) return 2;
//     return 3;
// }

// function processBattles(campaign: Campaign) {

//     // Process battles for each system
//     campaign.sector.subsectors.forEach(subsector => {

//         // Reset control points
//         subsector.factionPower = {};

//         subsector.systems.forEach(system => {

//             system.factionPower = {};

//             const systemBattles = campaign.battles.filter(
//                 battle => battle.battle_system === system.system_ID
//             );

//             systemBattles.forEach(battle => {

//                 const difference = Math.abs(
//                     battle.battle_victoryPoints1 -
//                     battle.battle_victoryPoints2
//                 );

//                 const points = getControlPoints(difference);

//                 if (points === 0) return;

//                 // Determine winning faction
//                 const winningFaction =
//                     battle.battle_victoryPoints1 > battle.battle_victoryPoints2
//                         ? battle.battle_faction1
//                         : battle.battle_faction2;

//                 if (winningFaction === null) return;

//                 system.factionPower[winningFaction] =
//                     (system.factionPower[winningFaction] ?? 0) + points;

//             });

//             // Add system control points to subsector
//             Object.entries(system.factionPower).forEach(([factionId, points]) => {
//                 const id = Number(factionId);

//                 subsector.factionPower[id] =
//                     (subsector.factionPower[id] ?? 0) + points;
//             });

//         });

//         // Determine ownership
//         determineOwnership(subsector);

//         // Determine ownership of individual systems
//         subsector.systems.forEach(system => {
//             determineOwnership(system);
//         });

//     });
// }

app.get("/campaign", async (req, res) => {
	const campaign = await dbQueries.getCampaignDetails(parseInt(process.env.CAMPAIGN_ID!));

	if (!campaign) {
		res.status(404).json({
			error: "Campaign not found"
		});
		return;
	}

	// process the battles
	// depending on the victory margins:
	// 1–250 difference in victory points = marginal victory = +1 control point
	// 251–600 difference in victory points = decisive victory = +2 control points
	// 601+ difference in victory points = massacre / total annihilation = +3 control points
	// add up the control points per faction. the factions are part of power blocks (composite factions)
	// if a faction has most control points and its power block is leading, set this faction ID as currentFaction_ID
	// if a power block is leading but a faction from another power block has most control points, 
	// the power block is owning it, set this faction block as current_ID
	// additionally, set all the control points in the system.factionPower record and in the subsector.factionPower record
	// processBattles(campaign);

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