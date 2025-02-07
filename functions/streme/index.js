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

module.exports.mentionCreated = async function (event) {
    var snapshot = event.data;
    if ("after" in snapshot) {
        snapshot = snapshot.after;
    }
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    // TODO: do we need this at all if we are doing the queue via cron?
    return;
} // mentionCreated   

module.exports.tokenCreated = async function (event) {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const token = snapshot.data();
    const poolAddress = await util.getUniswapV3Pool(token);
    const staking = await util.getStakingData(token);
    snapshot.ref.update({
        "pool_address": poolAddress,
        "staking_address": staking.stakeToken,
        "staking_pool": staking.pool
    });
    return;
} // tokenCreated   

module.exports.mentionCron = async function(context, minter) {
    const batchSize = 1;
  
    await sleep(1000 * minter);
  
    var query = db.collection('mentions').where('status', '==', "pending").orderBy('created','asc').limit(batchSize);
  
    var doc;
    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log(`Nothing in this queue, Minter ${minter}`);
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
    console.log(`Processed ${count} mentions, Minter ${minter}`);
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
