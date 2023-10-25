/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

//import libraries
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";

//initialize firebase inorder to access its services
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
export const webApi = functions.https.onRequest(main);

/**
 * user
 */
export interface User {
    email: string;
    name: string;
    /**
     * 0 for user, 1 for leader, 2 for locker manager
     */
    permLvl: number;
    phoneNum: number;
    SPIRE_ID?: number;
    /**
     * false for expired, true for signed and valid
     */
    waiver: boolean;
    [property: string]: any;
}

/**
 * gear
 */
export interface Gear {
    /**
     * The catagories this item falls under; sport, gender,size?
     */
    category: string[];
    checkedOut: boolean;
    gearFields: ExtraFields;
    /**
     * Tag: format is 3 letters 3 numbers
     */
    id: string;
    leaderFields: LeaderFields;
    managerFields: ManagerFields;
    /**
     * Generic name, ex: climbinghelmet
     */
    name: string;
    /**
     * Url to image
     */
    photo: string;
    [property: string]: any;
}

/**
 * extraFields
 */
export interface ExtraFields {
    brand: string;
    color: string;
    notes?: string;
    size?: string;
    [property: string]: any;
}

/**
 * leaderFields
 */
export interface LeaderFields {
    leaderNotes?: string;
    /**
     * can be anyone
     */
    whoHasThis: User;
    /**
     * must be a leader
     */
    whoLentThis: User;
    [property: string]: any;
}

/**
 * managerFields
 */
export interface ManagerFields {
    "created (date)": string;
    "lastUpdated (date)": string;
    managerNotes: string;
    price: number;
    [property: string]: any;
}


// Create new user
app.post('/users', async (req, res) => {
    try {
        const user: User = {
            email: req.body['email'],
            name: req.body['firstName'] + ' ' + req.body['lastName'], // Might have to be changed to only post the fullName
            permLvl: req.body['permLevel'],
            phoneNum: req.body['contactNumber'],
            SPIRE_ID: req.body['id'],
            waiver: req.body['waiver'],
            ...req.body  // Include any additional properties sent by the client
        }

        const newDoc = await db.collection(userCollection).add(user);
        res.status(201).send(`Created a new user: ${newDoc.id}`);
    } catch (error) {
        res.status(400).send(`User should contain email, name, permissionLevel, contactNumber, id, and waiver fields, along with any additional properties.`);
    }
});

// Get all users
app.get('/users', async (req, res) => {
    try {
        const userQuerySnapshot = await db.collection(userCollection).get();
        const users: any[] = [];
        userQuerySnapshot.forEach(
            (doc)=>{
                users.push({
                    id: doc.id,
                    data:doc.data()
                });
            }
        );
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a single user by firebase ID
app.get('/users/:userId', (req,res) => {
    const userId = req.params.userId; 
    db.collection(userCollection).doc(userId).get()
    .then(user => {
        if(!user.exists) throw new Error('User not found');
        res.status(200).json({id:user.id, data:user.data()})})
    .catch(error => res.status(500).send(error));     
});

// Get a user by email or SPIRE_ID
app.get('/users/:identifier', (req, res) => {
    const identifier : number | string = req.params.identifier;
    
    // Check if the identifier is a valid number 
    if (typeof(identifier) == 'number') {
        // It's a number, so we'll search by SPIRE_ID
        const spireId = parseInt(identifier);

        db.collection(userCollection)
            .where('SPIRE_ID', '==', spireId)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    res.status(404).send('User not found');
                } else {
                    const user = querySnapshot.docs[0]; // Assuming there is only one matching user
                    res.status(200).json({ id: user.id, data: user.data() });
                }
            })
            .catch((error) => res.status(500).send(error));
    } else {
        // It's not a number, so we'll search by email
        db.collection(userCollection)
            .where('email', '==', identifier)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    res.status(404).send('User not found');
                } else {
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
    .then(()=>res.status(204).send("Document successfully deleted!"))
    .catch(function (error) {
            res.status(500).send(error);
    });
})

// Update a user
app.put('/users/:userId', async (req, res) => {
    await db.collection(userCollection).doc(req.params.userId).set(req.body,{merge:true})
    .then(()=> res.json({id:req.params.userId}))
    .catch((error)=> res.status(500).send(error))
});

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript

// // export const helloWorld = onRequest((request, response) => {
// //   logger.info("Hello logs!", {structuredData: true});
// //   response.send("Hello from Firebase!");
// // });
