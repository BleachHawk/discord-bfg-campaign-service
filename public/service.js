function getData() {
    // const url = request.url;
    // const method = request.method;
    // const credentials = request.credentials;
    const requestCampaign = new Request("/campaign");
    fetch(requestCampaign)
        .then(async (response) => {
            const data = await response.json();
            const campaign_data_string = JSON.stringify(data);
            document.getElementById('campaign_name').textContent = data.campaign_name;
            document.getElementById('campaign_info').textContent = campaign_data_string;
        });

    const requestBattleLog = new Request("/battles");
    fetch(requestBattleLog)
        .then(async (response) => {
            const data = await response.json();
            console.log(JSON.stringify(data));
            document.getElementById('battles_info').textContent = data.campaign_name;
        });
}

getData();