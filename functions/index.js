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

var streme = require(__base + 'streme');

exports.api = onRequest({
        timeoutSeconds: 60,
        memory: "1GiB",
    },
    (req, res) => {
        return streme.api(req, res);
}); // api

exports.mentionCreated = onDocumentCreated("mentions/{castId}", {
        timeoutSeconds: 20,
        memory: "1GiB",
    },    
    (event) => {
        return streme.mentionCreated(event);
});

exports.mentionUpdated = onDocumentUpdated("mentions/{castId}", {
    timeoutSeconds: 20,
    memory: "1GiB",
},    
(event) => {
    // this hook for testing only
    return streme.mentionCreated(event);
});

exports.tokenCreated = onDocumentCreated("tokens/{tokenAddress}", {
        timeoutSeconds: 20,
        memory: "1GiB",
    },    
    (event) => {
        return streme.tokenCreated(event);
});

exports.mentionCron = onSchedule("every 1 minutes", async (event) => {
    const minter = 1;
    return streme.mentionCron(minter);
});


