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

