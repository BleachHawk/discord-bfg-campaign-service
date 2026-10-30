import express from "express";
import * as dbQueries from "./db/queries";
import type { Faction, Subsector, System } from "../shared/types/types.ts";
import * as utils from "../shared/utils/utils.ts";

const app = express();
const port = process.env.PORT || 3001;



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