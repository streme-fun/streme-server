/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { getApps, initializeApp } = require("firebase-admin/app");
if (!getApps().length) initializeApp();
global.__base = __dirname + '/';
const {onRequest} = require("firebase-functions/v2/https");
const {onMessagePublished} = require("firebase-functions/v2/pubsub");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {
    onDocumentWritten,
    onDocumentCreated,
    onDocumentUpdated,
    onDocumentDeleted,
    Change,
    FirestoreEvent
  } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const {defineSecret} = require("firebase-functions/params");

// Define the secret parameter
const MINTER_1 = defineSecret("MINTER_1");

var streme = require(__base + 'streme');

exports.api = onRequest({
        timeoutSeconds: 60,
        memory: "1GiB",
    },
    (req, res) => {
        return streme.api(req, res);
}); // api

exports.tokenCreated = onDocumentCreated({
        document: "tokens/{tokenAddress}",
        timeoutSeconds: 60,
        memory: "1GiB",
    },    
    (event) => {
        return streme.tokenCreated(event);
});

exports.mentionCron = onSchedule({
        memory: "1GiB",
        timeoutSeconds: 120,
        schedule: "every 1 minutes",
        secrets: [MINTER_1] 
    }, async (event) => {
        const minter = MINTER_1.value();
        return streme.mentionCron(minter);
});


