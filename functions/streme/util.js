const {getFirestore, FieldValue} = require("firebase-admin/firestore");
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

    "chainId": () => {
        const util = module.exports;
        if (util.chain == "baseSepolia") {
            return 84532;
        } else if (util.chain == "base") {
            return 8453;
        }
    }, // chainId

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

    "autonomeChat": async (cast) => {
        const apiUrl = "https://autonome.alt.technology/streme-aelyud/chat";
        const data = {
            "message": `You are @streme and your primary skill is deploying Super Tokens on request. Super Tokens are ERC20 tokens that can be streamed in real-time by the second, powered by Superfluid. When users request creation of a token, you should extract a name and a symbol from the request, and respond that you will deply the token on the Base network. The tokens you create are sometimes referred to as Streme Coins. Respond only with a JSON object with elements for name, symbol, and response. Do NOT preface the JSON object with any commentary. Your tone is funny and light-hearted. You strive to please but also to make people laugh. You only create tokens when there is a clear request to do so. When making this assessment, you should ONLY consider the text part of the user's message. If you do not detect a request to create or deploy a token, then return null for title and description, and provide a response explaining. If someone asks you about the kinds of tokens you can create, you can tell them: 1) they are native Super Tokens powered by @superfluid, 2) they have built-in staking with streaming rewards, 3) they are immediately tradeable via a Uniswap v3 pool, 4) 40% of trading fees goes to the creator, and 5) you need a Neynar Score of  0.7 or higher to deploy (threshold may change in future\n\n<example>\nInput: @streme please create a token called yellow flowers with a symbol of YELLOW.\nOutput: name = \"Yellow Flowers\", symbol = \"YELLOW\", response: \"Sure I will create a token called Yellow Flowers on the Base network with the symbol YELLOW\n</example>\n<example>\nInput: @streme what type of tokens can you create?\nOutput: I can only create native Super Tokens on the Base network, with real-time streaming powered by @superfluid. The tokens have built-in staking with 20% of the supply being streamed as staking rewards for the first 365 days. The other 80% of supply is locked in a Uniswap v3 pool, with 40% of trading fees going to the deployer.\n</example> The message sender's name is ${cast.author.display_name} with username @${cast.author.username}. Please reply to their message. Only 5% of the time, you mention the message sender in your response. <message>${cast.text}</message>`
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

    "deployToken": async (name, symbol, deployer, cast, minter) => {
        const util = module.exports;
        const addr = util.getAddresses();
        const provider = util.getProvider();
        const keys = util.getKeys();
        var random = Math.floor(Math.random() * keys.length);
        if (minter) {
            random = minter;
        }
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
        const tx = await (await streme.deployToken(addr.tokenFactory, addr.postDeployFactory, addr.lpFactory, ethers.ZeroAddress, tokenConfig)).wait();
        const txnHash = tx.transactionHash;
        const blockNumber = tx.blockNumber;
        console.log("Token Address: ", tokenAddress);
        // add to firestore:
        const data = 
        {
            "id": 69,
            "created_at": FieldValue.serverTimestamp(),
            "block_number": blockNumber,
            "tx_hash": txnHash,
            "contract_address": tokenAddress,
            "requestor_fid": cast.author.fid,
            "name": name,
            "symbol": symbol,
            "img_url": tokenConfig["_image"],
            "pool_address": "",
            "cast_hash": cast.hash,
            "type": "streme_s" + util.season,
            "pair": "WETH",
            "presale_id": null,
            "chain_id": util.chainId(),
            "metadata": null,
            "tokenFactory": addr.tokenFactory,
            "postDeployHook": addr.stakingFactory,
            "liquidityFactory": addr.lpFactory,
            "postLpHook": ethers.ZeroAddress,
            "poolConfig": poolConfig,
        };
        const pool = await util.getUniswapV3Pool(tokenAddress, addr.weth, tokenConfig["_fee"]);
        data["pool_address"] = pool;
        // add channel if it exists
        if ("channel" in cast && cast.channel && "id" in cast.channel) {
            data.channel = cast.channel.id;
        }
        const db = getFirestore();
        const tokensRef = db.collection("tokens").doc(tokenAddress);
        const tokenDoc = await tokensRef.set(data);
        // TODO: triggers to fetch event data for staking
        return tokenAddress;
    }, // deployToken

    "getUniswapV3Pool": async (token) => {
        return new Promise(async (resolve, reject) => {
            const tokenA = token.contract_address;
            const tokenB = token.poolConfig.paired_token ? token.poolConfig.paired_token : process.env.WETH;
            const fee = token.poolConfig.devBuyFee ? token.poolConfig.devBuyFee : 10000;
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();
            const abi = [ "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)" ];
            const uniswapV3Factory = new ethers.Contract(addr.uniswapV3Factory, abi, provider);
            const poolAddress = await uniswapV3Factory.getPool(tokenA, tokenB, fee);
            resolve(poolAddress);
        }); // return new Promise
    }, // getUniswapV3Pool

    "getStakingData": async (token) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();
            const stakingFactory = new ethers.Contract(addr.stakingFactory, StakingFactoryJSON.abi, provider);
            // get data from StakedTokenCreated event
            // TODO: update contract to add indexed to depositToken
            const filter = stakingFactory.filters.StakedTokenCreated();
            const logs = await provider.getLogs(filter, {fromBlock: token.block_number, toBlock: token.block_number});
            console.log("logs", logs);
            var stakeToken = '';
            var pool = '';
            for (var i = 0; i < logs.length; i++) {
                const log = logs[i];
                const parsedLog = stakingFactory.interface.parseLog(log);
                console.log("parsedLog", parsedLog);
                if (parsedLog.values.depositToken == token.contract_address) {
                    stakeToken = parsedLog.values.stakeToken;
                    pool = parsedLog.values.pool;
                }
            }
            resolve({"stakeToken": stakeToken, "pool": pool});
        }); // return new Promise
    }, // getStakingData

    "sendCast": async function(cast) {
        const util = module.exports;
        return new Promise(async function(resolve, reject) {
            var response = await fetch(`https://api.neynar.com/v2/farcaster/cast`, { 
                method: 'POST', 
                headers: {
                    'Accept': 'application/json', 
                    'Content-Type': 'application/json',
                    'Api_key': process.env.NEYNAR_API_KEY
                },
                body: JSON.stringify(cast)
            });
            var castResult = await response.json();
            console.log("neynar POST cast", JSON.stringify(castResult));
            return resolve(castResult);
        }); // return new Promise
    }, // sendCast

    "verifiedAddress": async function(user) {
        const util = module.exports;
        return new Promise(async function(resolve, reject) {
            var address;
            if (user) {
                // get last verified eth address
                if ("verified_addresses" in user) {
                    if ("eth_addresses" in user.verified_addresses) {
                        address = user.verified_addresses.eth_addresses[user.verified_addresses.eth_addresses.length-1];
                    } // if eth_addresses
                } // if verified_addresses
            } // if user
            //console.log("address", address);
            return resolve(address);
        }); // return new Promise
    }, // verifiedAddress

    "processMention": async function (cast, minter) {
        console.log("processMention started", cast.hash);
        const util = module.exports;
        const db = getFirestore();
        return new Promise(async function(resolve, reject) {
            const sendCastEnabled = false;
            // check if user qualifies. neynar score?
            var allowed = false;
            const allowList = [
                process.env.FREME_FID
            ];
            // is cast.author.fid in allowList?
            if (allowList.includes(cast.author.fid)) {
                allowed = true;
            }
            if ("allowed" in cast && cast.allowed) {
                allowed = true;
            }
            if (!allowed) {
                const minScore = 0.7;
                if ("experimental" in cast.author && "neynar_user_score" in cast.author.experimental && cast.author.experimental.neynar_user_score < minScore) {
                    // respond with error that user does not qualify
                    if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": `Sorry, you do not qualify to deploy Streme coins. Your Neynar score of ${cast.author.experimental.neynar_user_score} is too low.`,
                            "signer_uuid": process.env.STREME_UUID,
                        });
                    }
                    //return res.json({"result": "error", "response": "User does not qualify"});
                    console.log(`user does not qualify, username: ${cast.author.username}, neynar_user_score: ${cast.author.experimental.neynar_user_score}`);
                    return resolve({"status": "error", "reason": "User does not qualify due to neynar_user_score"});
                } // if minScore
            } // if !allowed
        
            const banList = [
                6969669, // nobody
            ];
            // is cast.author.fid in banList?
            if (banList.includes(cast.author.fid)) {
                // respond with error that user is banned
                if (sendCastEnabled) {
                    await util.sendCast({
                        "parent": cast.hash,
                        "text": `Seems like somehow you got banned https://y.yarn.co/d9b730de-cb98-4aad-b955-c813a2f7ee5e_text.gif`,
                        "signer_uuid": process.env.STEME_UUID,
                    });
                }
                return resolve({"status": "error", "reason": "User is banned"});
            }
        
            // check if this cast has already been processed
            // query for doc in tokens collection where cast_hash == cast.hash:
            const query = db.collection("tokens").where("cast_hash", "==", cast.hash);
            const docRef = await query.get();
            var doc;
            docRef.forEach((doc) => {
                console.log("doc", doc.id, "=>", doc.data());
                doc = doc;
            });
            //var doc = await docRef.get();
            if (doc.exists) {
                console.log("doc exists, mention already processed");
                return resolve({"status": "error", "reason": "Token already created"});
            }
                    
            // send cast to Autonome for processing
            const ai = await util.autonomeChat(cast);
        
            if (!ai.name || !ai.symbol) {
                // respond with error that token cannot be created
                if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": ai.response,
                            "signer_uuid": process.env.FREME_UUID,
                    });
                }
                //return res.json({"result": "error", "response": ai.response});
                console.log("ai.name not found");
                return resolve({"status": "error", "reason": "token creation intent not found"});
            }
        
            var creatorAddress = await util.verifiedAddress(cast.author);
            if (!creatorAddress) {
                // respond with error that NFT cannot be created
                if (sendCastEnabled) {
                    await util.sendCast({
                        "parent": cast.hash,
                        "text": `Sorry, you must verify your Ethereum address to launch Streme coins.`,
                        "signer_uuid": process.env.FREME_UUID,
                    });
                }
                console.log("creatorAddress not found");
                return resolve({"status": "error", "reason": "creatorAddress not found"});
            }
        
            
            // deploy token
            const doDeploy = true;
            if (doMint) {
                const tokenAddress = await util.deployToken(ai.name, ai.symbol, creatorAddress, cast, minter);
                console.log("deployed", tokenAddress);
                if (!tokenAddress) {
                    // respond with error that token cannot be created
                    if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": `Sorry, there was an error creating your token.`,
                            "signer_uuid": process.env.STREME_UUID,
                        });
                    } // if sendCastEnabled
                    console.log("deploy not successful");
                    return resolve({"status": "error", "reason": "deploy txn failed"});
                } // if !minted
                await util.logDeploy({
                    "token": tokenAddress,  
                    "creator": data.fid,
                });
            } // if doMint
            if (sendCastEnabled) {
                // add frame embed to this cast
                const frameURL = `https://streme.fun/token/${tokenAddress}`;
                await util.sendCast({
                    "parent": cast.hash,
                    "text": ai.response + `\n\nHere's your Streme coin:`,
                    "signer_uuid": process.env.STREME_UUID,
                    "embeds": [
                        {
                            "url": frameURL,
                        }
                    ]
                });
            } // if sendCastEnabled
            return resolve({"status": "processed"});
        }); // return promise
    }, // processMention



}; // module.exports
