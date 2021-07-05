const puppy = require("puppeteer");
const fs = require("fs");

let profileUrl = [];
let finalData = [];

async function main(){
    let browser = await puppy.launch({
        headless: false,
        defaultViewport: false,
        args: ["--start-maximized"]
    });

    let tabs = await browser.pages();
    let tab = tabs[0];
    await tab.goto("https://www.cricbuzz.com/cricket-series/3130/indian-premier-league-2020/squads");
    await tab.waitForSelector(".cb-col.cb-col-20 a", {visible: true});
    let teams = await tab.$$(".cb-col.cb-col-100.cb-series-brdr.cb-stats-lft-ancr");
    for(let i = 0; i < teams.length; i++){
        let teamName = await tab.evaluate(function(ele){
            return ele.innerText;
        }, teams[i]);
        finalData.push({"Team Name" : teamName, "playersData" : []});
        await teams[i].click();
        await new Promise(function(resolve, reject){
            setTimeout(resolve, 2000);
        });
        await squad(tab, i);
    }
    for(let i = 0; i < finalData.length; i++){
        for(let j = 0; j < finalData[i].playersData.length; j++){
            let playerUrl = finalData[i].playersData[j].playerUrl;
            let cricData = await careerData(playerUrl, tab);
            finalData[i].playersData[j].BattingCareer = cricData[0];
            finalData[i].playersData[j].BowlingCareer = cricData[1];
        }
    }
    fs.writeFileSync("iplData.json", JSON.stringify(finalData));
    await browser.close();
}

async function squad(tab, idx){
    let players = await tab.$$(".cb-col.cb-col-50");
    for(let i = 0; i < players.length; i++){
        let url = await tab.evaluate(function(ele){
            return ele.getAttribute("href");
        }, players[i]);
        profileUrl.push("https://www.cricbuzz.com" + url);
        finalData[idx]["playersData"].push({playerUrl : "https://www.cricbuzz.com" + url});
    }
    let playersName = await tab.$$(".cb-font-16.text-hvr-underline");
    let playerName = [];
    for(let i = 0; i < playersName.length; i++){
        playerName[i] = await tab.evaluate(function(ele){
            return ele.innerText;
        }, playersName[i]);
    }
    for(let i = 0; i < playerName.length; i++){
        finalData[idx]["playersData"][i]["playerName"] = playerName[i];
        finalData[idx]["playersData"][i]["BattingCareer"] = {};
        finalData[idx]["playersData"][i]["BowlingCareer"] = {};
    }
}  

async function careerData(url, tab){
    let tempData = [];
    await tab.goto(url);
    let tables = await tab.$$(".table.cb-col-100.cb-plyr-thead");
    for(let i = 0; i < tables.length; i++){
        let tableTempData = {};
        let keys = [];
        let headings = await tables[i].$$("thead tr th");
        for(let j = 1; j < headings.length; j++){
            let key = await tab.evaluate(function(ele){
                return ele.innerText;
            }, headings[j]);
            keys.push(key);
        }
        let dataRows = await tables[i].$$("tbody tr");
        for(let j = 0; j < dataRows.length; j++){
            let dataColumns = await dataRows[j].$$("td");
            let matchType = await tab.evaluate(function(ele){
                return ele.textContent;
            } , dataColumns[0]);
            tableTempData[matchType] = {};
            for(let k = 1; k < dataColumns.length; k++){
                let data = await tab.evaluate(function(ele){
                    return ele.textContent;
                }, dataColumns[k]);
                tableTempData[matchType][keys[k-1]] = data;
            }
        }
        tempData.push(tableTempData);
    }
    return tempData;
}

main();