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