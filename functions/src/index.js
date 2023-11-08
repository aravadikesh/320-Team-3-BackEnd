"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.webApi = void 0;
//import libraries
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const bodyParser = require("body-parser");
//initialize firebase in order to access its services
admin.initializeApp(functions.config().firebase);
//initialize express server
const app = express();
const main = express();
//add the path to receive request and set json as bodyParser to process the body 
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));
//initialize the database and the collection 
const db = admin.firestore();
const userCollection = 'users';
//define google cloud function name
exports.webApi = functions.https.onRequest(main);
// Create new user
app.post('/createUser', async (req, res) => {
    try {
        const user = Object.assign({ email: req.body['email'], name: req.body['firstName'] + ' ' + req.body['lastName'], permLvl: req.body['permLevel'], phoneNum: req.body['contactNumber'], SPIRE_ID: req.body['id'], waiver: req.body['waiver'] }, req.body // Include any additional properties sent by the client
        );
        const newDoc = await db.collection(userCollection).add(user);
        res.status(201).send(`Created a new UMOC user: ${newDoc.id}`);
    }
    catch (error) {
        res.status(400).send(`User should contain email, name, permissionLevel, contactNumber, id, and waiver fields, along with any additional properties.`);
    }
});
// Get all users
app.get('/users', async (req, res) => {
    try {
        const userQuerySnapshot = await db.collection(userCollection).get();
        const users = [];
        userQuerySnapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                data: doc.data()
            });
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).send(error);
    }
});
// Get a single user by firebase ID
app.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    db.collection(userCollection).doc(userId).get()
        .then(user => {
        if (!user.exists)
            throw new Error('User not found');
        res.status(200).json({ id: user.id, data: user.data() });
    })
        .catch(error => res.status(500).send(error));
});
// Get a user by email or SPIRE_ID
app.get('/users/:identifier', (req, res) => {
    const identifier = req.params.identifier;
    // Check if the identifier is a valid number 
    if (typeof (identifier) == 'number') {
        // It's a number, so we'll search by SPIRE_ID
        const spireId = parseInt(identifier);
        db.collection(userCollection)
            .where('SPIRE_ID', '==', spireId)
            .get()
            .then((querySnapshot) => {
            if (querySnapshot.empty) {
                res.status(404).send('User not found');
            }
            else {
                const user = querySnapshot.docs[0]; // Assuming there is only one matching user
                res.status(200).json({ id: user.id, data: user.data() });
            }
        })
            .catch((error) => res.status(500).send(error));
    }
    else {
        // It's not a number, so we'll search by email
        db.collection(userCollection)
            .where('email', '==', identifier)
            .get()
            .then((querySnapshot) => {
            if (querySnapshot.empty) {
                res.status(404).send('User not found');
            }
            else {
                const user = querySnapshot.docs[0]; // Assuming there is only one matching user
                res.status(200).json({ id: user.id, data: user.data() });
            }
        })
            .catch((error) => res.status(500).send(error));
    }
});
// Delete a user
app.delete('/users/:userId', (req, res) => {
    db.collection(userCollection).doc(req.params.userId).delete()
        .then(() => res.status(204).send("Document successfully deleted!"))
        .catch(function (error) {
        res.status(500).send(error);
    });
});
// Update a user
app.put('/users/:userId', async (req, res) => {
    await db.collection(userCollection).doc(req.params.userId).set(req.body, { merge: true })
        .then(() => res.json({ id: req.params.userId }))
        .catch((error) => res.status(500).send(error));
});
sourceMappingURL=index.js.map