import express from "express";
import * as dbQueries from "./db/queries";

const app = express();
const port = process.env.PORT || 3001;

// app.get("/", (req, res) => {
// 	res.send("Hello World!");
// 	// res.sendFile('./src/index.html');
// });

app.get("/campaign", async (req, res) => {
	const campaign = await dbQueries.getCampaignDetails(parseInt(process.env.CAMPAIGN_ID!));
	console.log(campaign);
	res.send(campaign);
});

app.get("/battles", async (req, res) => {
	const battles = await dbQueries.getBattlesByCampaignId(parseInt(process.env.CAMPAIGN_ID!));
	console.log(battles);
	res.send(battles);
})

app.listen(port, () => {
	console.log(`Listening on port ${port}...`);
});

app.use(express.static('public'));