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

    "chain": "baseSepolia",

    "season": 1,

    "getAddresses": () => {
        const util = module.exports;
        var addr = {};
        if (util.chain == "baseSepolia") {
            addr.streme = process.env.STREME;
            addr.stakingFactory = process.env.STAKING_FACTORY;
            addr.lpFactory = process.env.LP_FACTORY;
            addr.superTokenFactory = process.env.SUPER_TOKEN_FACTORY;
            addr.lpLocker = process.env.LP_LOCKER;
            addr.uniswapV3Factory = process.env.UNISWAP_V3_FACTORY;
            addr.weth = process.env.WETH;
            addr.gdaForwarder = process.env.GDA_FORWARDER;
        } else if (util.chain == "base") {
            // TODO: add addresses for base chain
        }
        return addr;
    }, // getAddresses

    "getProvider": () => {
        const util = module.exports;
        if (util.chain == "baseSepolia") {
            return new ethers.providers.JsonRpcProvider(process.env.API_URL_BASESEPOLIA);
        } else if (util.chain == "base") {
            return new ethers.providers.JsonRpcProvider(process.env.API_URL_BASE);
        }
    }, // getProvider

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

    "getImageFromCast": async (embeds) => {
        const util = module.exports;
        var imageEmbed;
        var contentType;
        var foundImage = false;
        for (var i = 0; i < embeds.length; i++) {
            const embed = embeds[i];
            if ("url" in embed) {
                const url = embed.url;
                // confirm this is an image
                if ("metadata" in embed && "content_type" in embed.metadata && embed.metadata.content_type.includes("image")) {
                    contentType = embed.metadata.content_type;
                    foundImage = true;
                    imageEmbed = embed;
                } else if ("metadata" in embed && "_status" in embed.metadata && embed.metadata._status == "PENDING") {
                    // use fetch to to send HEAD request to url to get content-type:
                    const response = await fetch(url, {method: 'HEAD'});
                    const headers = response.headers;
                    const contentType = headers.get('content-type');
                    if (contentType && contentType.includes("image")) {
                        foundImage = true;
                        imageEmbed = embed;
                    }
                } // if image
            } // if url in embed
            // break loop if image found
            if (foundImage) {
                break;
            }
        } // for i (embeds)
        if (!foundImage) {
            return "";
        } else {
            return imageEmbed.url;
        }
    }, // getImageFromCast

    "deployToken": async (name, symbol, deployer, cast) => {
        const util = module.exports;
        const addr = util.getAddresses();
        const provider = util.getProvider();
        const keys = util.getKeys();
        const random = Math.floor(Math.random() * keys.length);
        const key = keys[random];
        const signer = new ethers.Wallet(key, provider);
        const streme = new ethers.Contract(addr.streme, StremeJSON.abi, signer);
        const poolConfig = {
            "tick": -230400,
            "pairedToken": addr.weth,
            "devBuyFee": 10000
        };
        const tokenConfig = {
            "_name": name,
            "_symbol": symbol,
            "_supply": ethers.parseEther("100000000000"), // 100 billion
            "_fee": 10000,
            "_salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "_deployer": deployer,
            "_fid": cast.author.fid,
            "_image": util.getImageFromCast(cast.embeds),
            "_castHash": cast.hash,
            "_poolConfig": poolConfig
        };
        var salt, tokenAddress;
        console.log(tokenConfig["_symbol"], tokenConfig["_deployer"], addr.tokenFactory, addr.pairedToken);
        const result = await streme.generateSalt(tokenConfig["_symbol"], tokenConfig["_deployer"], addr.tokenFactory, addr.pairedToken);
        salt = result[0];
        tokenAddress = result[1];
        console.log("Salt: ", salt);
        tokenConfig["_salt"] = salt;
        console.log(addr.tokenFactory, addr.postDeployFactory, addr.lpFactory, ethers.ZeroAddress, tokenConfig);
        await streme.deployToken(addr.tokenFactory, addr.postDeployFactory, addr.lpFactory, ethers.ZeroAddress, tokenConfig);
        console.log("Token Address: ", tokenAddress);
        // add to firestore + triggers to fecth event data for staking + uniswap pool
        return tokenAddress;
    }, // deployToken


}; // module.exports
