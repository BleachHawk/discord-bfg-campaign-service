import express from "express";
import * as dbQueries from "./db/queries";

const app = express();
const port = process.env.PORT || 3001;

app.get("/campaign", async (req, res) => {
	const campaign = await dbQueries.getCampaignDetails(parseInt(process.env.CAMPAIGN_ID!));
	console.log("campaign sent");
	res.send(campaign);
});

app.get("/battles", async (req, res) => {
	const battles = await dbQueries.getBattlesByCampaignId(parseInt(process.env.CAMPAIGN_ID!));
	console.log("battles sent");
	res.send(battles);
});

app.get("/factions", async (req, res) => {
	const factions = await dbQueries.getFactions();
	console.log("factions sent");
	res.send(factions);
});

app.use(express.static('public'));

app.listen(port, () => {
	console.log(`Listening on port ${port}...`);
});