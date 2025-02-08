const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {
  log,
  info,
  debug,
  warn,
  error,
  write,
} = require("firebase-functions/logger");

const express = require("express");
const api = express();
const cors = require("cors");
const ethers = require("ethers");

const util = require("./util");

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};

module.exports.mentionCreated = async function (event, minter) {
    log("tokenCreated", event);
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const mention = snapshot.data();
    // if there a mention with status processing right now?
    const db = getFirestore();
    const mentionsRef = db.collection('mentions');
    const query = mentionsRef.where('status', '==', "processing").limit(1);
    const querySnapshot = await query.get();
    if (!querySnapshot.empty) {
        console.log("There is a mention processing right now");
        return 1;
    }
    const cast = mention.cast;
    // update status to minting
    await snapshot.ref.update({
        "status": "processing"
    });
    // process cast
    const result = await util.processMention(cast, minter);
    var updates = {
        "status": "status" in result ? result.status : "processed"
    }
    if ("reason" in result) {
        updates.reason = result.reason;
    }
    await snapshot.ref.update(updates);
    console.log(`Processed 1 mentions`);
    return 1;
} // mentionCreated   

module.exports.tokenCreated = async function (event) {
    log("tokenCreated", event);
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const token = snapshot.data();
    log("tokenCreated", token);
    const poolAddress = await util.getUniswapV3PoolFromEvent(token);
    log("pool", poolAddress);
    const staking = await util.getStakingData(token);
    log("staking", staking);
    snapshot.ref.update({
        "pool_address": poolAddress,
        "staking_address": staking.stakeToken,
        "staking_pool": staking.pool
    });
    return;
} // tokenCreated   

module.exports.mentionCron = async function(minter) {
    const batchSize = 1;
  
    //await sleep(1000 * minter);
  
    const db = getFirestore();
    var query = db.collection('mentions').where('status', '==', "pending").orderBy('created','asc').limit(batchSize);
  
    var doc;
    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log(`Nothing in this queue`);
      return;
    }
    var count = 0;
    snapshot.forEach(async doc => {
      count++;
      if (doc.exists) {
        const mention = doc.data();
        // update status to minting
        await doc.ref.update({
          "status": "processing"
        });
        const cast = mention.cast;
        // process cast
        const result = await util.processMention(cast, minter);
        var updates = {
          "status": "status" in result ? result.status : "processed"
        }
        if ("reason" in result) {
          updates.reason = result.reason;
        }
        await doc.ref.update(updates);
      } else {
        console.log("No such document!");
      } // if doc.exists
    }); // for each doc
    console.log(`Processed ${count} mentions`);
    return 1;
} // mentionCron

api.use(cors({ origin: true })); // enable origin cors

api.get(['/'], async function (req, res) {
  console.log("start GET /testing path", req.path);
  //res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
  //res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.json({ message: 'Hello Stremers' });
  //}
}); // GET /testing

api.get(['/testing'], async function (req, res) {
    console.log("start GET /testing path", req.path);
    //res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    //res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.json({ message: 'Testing: Hello Stremers' });
    //}
}); // GET /testing

api.get(['/api/tokens'], async function (req, res) {
    //const dummyData = {"data":[{"id":56753,"created_at":"2025-02-06T04:28:11.316864+00:00","tx_hash":"0xbb7a6f49621ecb214278ae9b9b18f4c9910aa22283ac6700d4d4123d94d02410","contract_address":"0x0D93b1C9a772889DE25F9f2c008C18f1a1892230","requestor_fid":952760,"name":"Ellesse on Farcaster","symbol":"EOF","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/4f59912c-082a-4238-3154-dfc510995a00/original","pool_address":"0x52c2BA37759fEe7af0C14d27C240C7a494Be6fCF","cast_hash":"0x88bcdd2d1b43302e6df7765282bba9662a8e5377","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56752,"created_at":"2025-02-06T04:25:14.87271+00:00","tx_hash":"0xae1ab48d4e94040742e63e3df3a76ea34eb77102cf8ba88fd7b6f5f7d00e8b60","contract_address":"0x1899CB960D04A2cB1d606fA38b595CA7d35512F6","requestor_fid":893974,"name":"Baby sharks ","symbol":"SHARKS ","img_url":"","pool_address":"0x3De49508a6845e54503FfeeE5917Fc13422C0dA5","cast_hash":"clank.fun deployment","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56751,"created_at":"2025-02-06T04:25:06.05663+00:00","tx_hash":"0x4adc6e5d2dd31c058262546c87888a1dda8f84e7d62070dabfc169507e04f7c5","contract_address":"0x0dF3A408cDa63C18faEE31239d9Ba0594FD54ad7","requestor_fid":956722,"name":"Stone Emoji","symbol":"STONEEMOJI","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/42abbd70-5c8e-4cc7-0bca-2ba39dfc8e00/original","pool_address":"0xBD4577AEf85B9Ba627583508666032B1f48f7802","cast_hash":"0x229a2847ffed37f7acfb159fec1f0de5e818417c","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56750,"created_at":"2025-02-06T04:24:11.302849+00:00","tx_hash":"0xaf30f3bf45a35ccba90026bcd73fc285d4418c0b3a31b5602d28c608158548c0","contract_address":"0x279443158a822F210dB92b5d8e153f8aA47a6D31","requestor_fid":893974,"name":"Oh my venus","symbol":"OMV","img_url":"","pool_address":"0xC047Fb897aB153537336c7bBB506573a39999040","cast_hash":"clank.fun deployment","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56749,"created_at":"2025-02-06T04:22:42.710136+00:00","tx_hash":"0x3a4a7ee900573d9beba2d1c3030d46d34835adc4d4704c28d1ea5a8ba27dcd91","contract_address":"0x07C0110691770222ce5ED8f7aB5022e2ed2f4271","requestor_fid":893974,"name":"c𝚘𝗼ℓ Token","symbol":"c𝚘𝗼ℓ_","img_url":"https://utfs.io/f/vZZGfgLNEH3Lfg7ziori85kz49r6lWBcasGmpXQD1YnhCbgP","pool_address":"0xD8176acaf94D77102e3Dfdc1F7ff9130C4883782","cast_hash":"clank.fun deployment","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56748,"created_at":"2025-02-06T04:21:29.842367+00:00","tx_hash":"0x8fcbbfb621f10e61bd9d30eff2ca276b3c7fc954334eea66f015bf17c30f5870","contract_address":"0x365b101dBb5cf415284F696FE582ED50Ac4C5Ffe","requestor_fid":956722,"name":"Trump Tower","symbol":"TRUMPTOWER","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/ce0fd4eb-9863-4cf7-3d96-8a2d619aac00/original","pool_address":"0xFF9887cDf9B6eA38B7A8f65E2e4F77D4d0d68468","cast_hash":"0x5510743a1128f39543161b9e438a558e483deec3","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56747,"created_at":"2025-02-06T04:20:27.719643+00:00","tx_hash":"0xb464c2949ba79b642702407e89233001e6a9ee20e68c5ab9095db7df42b6776a","contract_address":"0x321d4BaD39e0acE435ea9032e0241d2691A2De43","requestor_fid":945688,"name":"just buy one dollar of this","symbol":"$1","img_url":null,"pool_address":"0xFCC230a187B2162DC9A5bA53f8616c3C9677F782","cast_hash":"0xf6414b24fc8bf709fb3fc8fb49f0917d7ce4f802","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56746,"created_at":"2025-02-06T04:17:37.666019+00:00","tx_hash":"0xff049dfe0903786ca37c74a3b0e5bd0ec801a4bf5c07cc33266c01f2b7e87c12","contract_address":"0x36efE61B402736985c6749aF3b98792f8A824c9C","requestor_fid":311798,"name":"QR Token","symbol":"QRT","img_url":null,"pool_address":"0xc37D5E2EcACce1a5D646fdE2B6728A72ca816a42","cast_hash":"0x3d3734c804c73b2f33ddc62951c4d9256d42a59c","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56745,"created_at":"2025-02-06T04:17:29.269499+00:00","tx_hash":"0x4cd6f67c7cd5f38e05ffb4f4da889bc9ef91943e25e387b2782615b41221ff41","contract_address":"0x03A5b53e59A2d821E6F94585B87e004FfB62d860","requestor_fid":893974,"name":"Whoos!","symbol":"WHOOS!","img_url":"https://utfs.io/f/vZZGfgLNEH3LHBzBBJyvXPTDaop80rNHuCMi6wLSzWkdVO9A","pool_address":"0x867470e2E0646Dd5a0D5c9009C722e9CDCA7D104","cast_hash":"clank.fun deployment","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null},{"id":56744,"created_at":"2025-02-06T04:16:54.84761+00:00","tx_hash":"0x6f8a0c3093b56f5df6f8126332cfad9636201cb12bd95ce541c1da35dc4a995f","contract_address":"0x09dFABCCEdc8f5342CF7361b28A9a8E2EC82a002","requestor_fid":956722,"name":"Meme Economy","symbol":"MECO","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/f9e59ceb-60bc-420a-62ce-030ee3ea8c00/original","pool_address":"0x7a0F59D4FF4Cce87A5eB36522381CcbA63B06E29","cast_hash":"0x5f60bff972ee89739e0852a0e70440924099b07c","type":"clanker_v3","pair":"WETH","presale_id":null,"chain_id":8453,"metadata":null}],"hasMore":true,"total":56458};
    const db = getFirestore();
    const tokensRef = db.collection('tokens');
    const query = tokensRef.orderBy('timestamp', 'desc').limit(100);
    const querySnapshot = await query.get();
    const tokens = [];
    // results as array:
    querySnapshot.forEach((doc) => {
        const token = doc.data();
        token.created_at = token.timestamp.toDate();
        delete token.timestamp;
        tokens.push(token);
    });
    res.json(tokens);
}); // GET /api/tokens

api.get(['/api/test/tokens'], async function (req, res) {
    const dummyData = [{"id":69,"block_number":21601597,"tx_hash":"0x0b8085123baac8cd8ac23c2b0677ce7da67f2aad55f0384a00b36dbb9feff3d9","contract_address":"0x41ec0db638e1ad55445f29dd1dee9498834a1fef","requestor_fid":898439,"name":"Fake Life","symbol":"FAKE","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/a047bd99-93ee-4d0d-4deb-0acbf130b700/original","cast_hash":"0x86e7c28760961157224fe38f2757a0a78af53239","type":"streme_s1","pair":"WETH","presale_id":null,"chain_id":84532,"metadata":null,"tokenFactory":"0x2c28c8539c8d32c3fc040cc73c1cc0cb721ee649","postDeployHook":"0xffff4346904a4da2bf64fa230080982e13a95214","liquidityFactory":"0xe024b49b6ed58752d1898e4b7750dcbc39ebf5c4","postLpHook":"0x0000000000000000000000000000000000000000","poolConfig":{"tick":-230400,"pairedToken":"0x4200000000000000000000000000000000000006","devBuyFee":10000},"staking_pool":"0x6739ae551834ccbef8c3a070f87cc57efc4a8283","staking_address":"0x271c22a40dfb7dd7569b74042f59fbafece7acf2","pool_address":"0x76798ced8d1d96d38197e39c894aa81ba90e7e46","created_at":"2025-02-07T23:38:42.628Z"},{"id":69,"block_number":21601047,"tx_hash":"0xedccb0ab605a65c602ef8c27c09d5f401889b3c1ff61f21c14b4e30326068cf3","contract_address":"0x1f91a281d1337aa2d88e3d96f53adce9f78c9d48","requestor_fid":898439,"name":"Crazy","symbol":"CRAZY","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/419b09a9-9e28-4413-2721-de1279c6b000/original","cast_hash":"0x1f300340bf75d82bf2e8663df29971d9a08fb171","type":"streme_s1","pair":"WETH","presale_id":null,"chain_id":84532,"metadata":null,"tokenFactory":"0x2c28c8539c8d32c3fc040cc73c1cc0cb721ee649","postDeployHook":"0xffff4346904a4da2bf64fa230080982e13a95214","liquidityFactory":"0xe024b49b6ed58752d1898e4b7750dcbc39ebf5c4","postLpHook":"0x0000000000000000000000000000000000000000","poolConfig":{"tick":-230400,"pairedToken":"0x4200000000000000000000000000000000000006","devBuyFee":10000},"staking_pool":"0x445e6c97fe53ced603898db00561729e37106138","staking_address":"0xd8a6af5524b43beee67085d391074564e78c959a","pool_address":"0x556a91d096bb880eb62faba46d385a8724a0bab3","created_at":"2025-02-07T23:20:01.502Z"},{"id":69,"block_number":21599900,"tx_hash":"0x94473ee83c8f393ab66297d0d96e15d2ab426402fc4d9ac62bbd18d1df2e0923","contract_address":"0x1f3405D07bdfb36ae626c39C5DDCAd81b2ec83e8","requestor_fid":898439,"name":"Cats Rule Web3","symbol":"CATS","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/90d124d2-1e11-440c-5bb6-9509570daa00/original","cast_hash":"0xbca25c8c3111fbc7952c4dab8072beb5a3ce892d","type":"streme_s1","pair":"WETH","presale_id":null,"chain_id":84532,"metadata":null,"tokenFactory":"0x2c28c8539C8D32c3FC040cC73c1cC0cb721ee649","postDeployHook":"0xfFff4346904A4da2bF64Fa230080982e13a95214","liquidityFactory":"0xe024B49b6Ed58752D1898E4b7750dcbc39EBF5C4","postLpHook":"0x0000000000000000000000000000000000000000","poolConfig":{"tick":-230400,"pairedToken":"0x4200000000000000000000000000000000000006","devBuyFee":10000},"created_at":"2025-02-07T22:55:43.479Z","staking_pool":"0xD34d9fdb3263EC6dfC27C4B89A52b71E9Cf6F6f1","staking_address":"0x285E003bA86FCEc6CC57997f86de98ebCedD77EC","pool_address":"0xf17183A655979Fc1a26625c75f76687FE5a2D10E"},{"id":69,"block_number":21599094,"tx_hash":"0xc39385bc47e999f2c7f3a41e94aefd2042946484d1bcf2536531aabe53294d36","contract_address":"0x2B73E00a729b6E7d8685FFd976eF3e0D6451b974","requestor_fid":898439,"name":"Six in the City","symbol":"SIX","img_url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/f87e24bb-0830-4a53-c4c6-dc58b89b1a00/original","cast_hash":"0xeea4e6e8e654be3864582581319caee7805b97e1","type":"streme_s1","pair":"WETH","presale_id":null,"chain_id":84532,"metadata":null,"tokenFactory":"0x2c28c8539C8D32c3FC040cC73c1cC0cb721ee649","postDeployHook":"0xfFff4346904A4da2bF64Fa230080982e13a95214","liquidityFactory":"0xe024B49b6Ed58752D1898E4b7750dcbc39EBF5C4","postLpHook":"0x0000000000000000000000000000000000000000","poolConfig":{"tick":-230400,"pairedToken":"0x4200000000000000000000000000000000000006","devBuyFee":10000},"created_at":"2025-02-07T20:51:54.767Z","staking_pool":"0x589AEfeCEF2e8E19ae93F1DD5240cFB2B0aEc8be","staking_address":"0xaC5877F4A1869221e6Ccae965AF1EB40f840D610","pool_address":"0x775EB1DB2c652989Ff515e87fDb0d3423AB54495"},{"id":69,"block_number":21561545,"tx_hash":"0xb4e8ff4b91dccfa9cb709046af61c17c4e1270a6cead1ffb368aa913dd5b95bf","contract_address":"0x250d10e0e64bd11ff168d67d2aefe7fe02ebe6b9","requestor_fid":8685,"name":"First Streme Coin","symbol":"FIRST","img_url":"https://media.tenor.com/NU1f24r_iV4AAAAC/youtube-first.gif","pool_address":"0x1a023d422199ee153ba9cc60d324ae37a0f31a72","type":"streme_s1","pair":"WETH","presale_id":null,"chain_id":84532,"metadata":null,"tokenFactory":"0x2c28c8539c8d32c3fc040cc73c1cc0cb721ee649","postDeployHook":"0xffff4346904a4da2bf64fa230080982e13a95214","liquidityFactory":"0xe024b49b6ed58752d1898e4b7750dcbc39ebf5c4","postLPHook":"0x0000000000000000000000000000000000000000","poolConfig":{"tick":-230400,"pairedToken":"0x4200000000000000000000000000000000000006","devBuyFee":10000},"staking_address":"0x74e3f3671b49c6183bfabcc67bb83625cad290ca","staking_pool":"0xa6703feb51e76322b063025015960dc2fee2d089","cast_hash":"0xf88fd0bdc6170000c75923c0125bb772750b778e","created_at":"2025-02-06T14:34:28.317Z"}];
    res.json(dummyData);
}); // GET /api/test/tokens

api.get(['/token/:address'], async function (req, res) {
    const address = req.params.address;
    const db = getFirestore();
    const tokenRef = db.collection('tokens').doc(address);
    const doc = await tokenRef.get();
    // caching:
    res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    if (!doc.exists) {
        console.log('No such document!');
        res.json({ message: 'No such document!' });
    } else {
        const token = doc.data();
        token.created_at = token.timestamp.toDate();
        delete token.timestamp;
        res.json(token);
    }
}); // GET /token/:address

api.get(['/token/:address/stats'], async function (req, res) {
    const address = req.params.address;
    const stats = await util.getTokenStats(address);
    // cache for 1 minute:
    res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    res.json(stats);
}); // GET /token/:address/stats

api.get(['/token/:address/stats/:userAddress'], async function (req, res) {
    const address = req.params.address;
    const userAddress = req.params.userAddress;
    const stats = await util.getTokenStatsForUser(address, userAddress);
    // cache for 5 minutes:
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.json(stats);
}); // GET /token/:address/stats/:userAddress

api.get(['/token/:address/unipool'], async function (req, res) {
    const address = req.params.address;
    const db = getFirestore();
    const tokenRef = db.collection('tokens').doc(address);
    const doc = await tokenRef.get();
    if (!doc.exists) {
        console.log('No such document!');
        return res.json({ message: 'No such document!' });
    } else {
        const token = doc.data();
        const poolAddress = await util.getUniswapV3PoolFromEvent(token);
        return res.json({ pool_address: poolAddress });
    }
}); // GET /token/:address/unipool

api.get(['/chat'], async function (req, res) {
    console.log("start GET /chat path", req.path);
    //res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    //res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    const message = req.query.message;
    if (message) {
        const responseJson = await util.autonomeChat(message);
        res.json(responseJson);
    } else {
        res.json({ message: 'Hello Stremers' });
    }
}); // GET /chat

api.post('/api/webhook/mention/streme', async function (req, res) {
    console.log("mention streme webhook req.body", JSON.stringify(req.body));
    // TODO: validate the request
    const cast = req.body.data;
    if (!cast) {
      return res.json({"result": "error", "response": "No data"});
    }
    // TODO: change this prior to production launch + edit neynar webook accordingly
    if (cast.author.fid != process.env.FREME_FID) {
        return res.json({"result": "error", "response": "Not a valid cast during streme alpha"});
    }
    // check if this cast has already been added to mentions collection:
    // firestor doc where doc.id is cast.hash
    const db = getFirestore();
    const docRef = db.collection('mentions').doc(cast.hash);
    const doc = await docRef.get();
    if (doc.exists) {
      console.log("cast already processed");
      return res.json({"result": "error", "response": "Cast already processed"});
    }
    // add it to mentions collection:
    const data = {
      "status": "pending",
      "created": FieldValue.serverTimestamp(),
      "cast": cast
    };
    await docRef.set(data);
    return res.json({"result": "ok"});
}); // POST /api/webhook/mention/streme

module.exports.api = api;
