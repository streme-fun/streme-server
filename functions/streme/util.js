const {getFirestore} = require("firebase-admin/firestore");
const {
    log,
    info,
    debug,
    warn,
    error,
    write,
} = require("firebase-functions/logger");

const ethers = require("ethers");
const {PubSub} = require("@google-cloud/pubsub");
const pubsub = new PubSub();

const StremeJSON = require("./abis/Streme.json");
const StakingFactoryJSON = require("./abis/StakingFactory.json");
const StakedTokenJSON = require("./abis/StakedToken.json");
const LPFactoryJSON = require("./abis/LPFactory.json");
const LpLockerJSON = require("./abis/LpLockerv2.json");
const SuperTokenFactoryJSON = require("./abis/SuperTokenFactory.json");


module.exports = {

    "getFirestore": getFirestore,

    "autonomeChat": async (message) => {
        const apiUrl = "https://autonome.alt.technology/streme-aelyud/chat";
        const data = {
            "message": `You are @streme and your primary skill is deploying Super Tokens on request. Super Tokens are ERC20 tokens that can be streamed in real-time by the second, powered by Superfluid. When users request creation of a token, you should extract a name and a symbol from the request, and respond that you will deply the token on the Base network. The tokens you create are sometimes referred to as Streme Coins. Respond only with a JSON object with elements for name, symbol, and response. Do NOT preface the JSON object with any commentary. Your tone is funny and light-hearted. You strive to please but also to make people laugh. You only create tokens when there is a clear request to do so. When making this assessment, you should ONLY consider the text part of the user's message. If you do not detect a request to create or deploy a token, then return null for title and description, and provide a response explaining. If someone asks you about the kinds of tokens you can create, you can tell them: 1) they are native Super Tokens powered by @superfluid, 2) they have built-in staking with streaming rewards, 3) they are immediately tradeable via a Uniswap v3 pool, 4) 40% of trading fees goes to the creator, and 5) you need a Neynar Score of  0.7 or higher to deploy (threshold may change in future\n\n<example>\nInput: @streme please create a token called yellow flowers with a symbol of YELLOW.\nOutput: name = \"Yellow Flowers\", symbol = \"YELLOW\", response: \"Sure I will create a token called Yellow Flowers on the Base network with the symbol YELLOW\n</example>\n<example>\nInput: @streme what type of tokens can you create?\nOutput: I can only create native Super Tokens on the Base network, with real-time streaming powered by @superfluid. The tokens have built-in staking with 20% of the supply being streamed as staking rewards for the first 365 days. The other 80% of supply is locked in a Uniswap v3 pool, with 40% of trading fees going to the deployer.\n</example> The message sender's name is Bob with username @bob. Please reply to their message. Only 5% of the time, you mention the message sender in your response. <message>${message}</message>`
        };
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": "Basic " + process.env.AUTONOME_BASIC_AUTH,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        const json = await response.json();
        console.log("autonomeChat", json);
        // parse the response as JSON:
        // remove /n line breaks from the response:
        json.response = json.response[0].replace(/\n/g, "");
        const responseJson = JSON.parse(json.response);
        console.log("responseJson", responseJson);
        return responseJson;
    }, // autonomeChat

}; // module.exports
