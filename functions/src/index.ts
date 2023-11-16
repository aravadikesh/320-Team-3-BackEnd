/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import libraries
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from "cors";
import { Request, Response } from 'express';
import { handleSignUp } from '../../auth';

//initialize firebase in order to access its services
admin.initializeApp(functions.config().firebase);

//initialize express server
const app = express();
app.use(cors({ origin: true }));
const main = express();

//initialize the database and the collection 
const db = admin.firestore();
exports.app = functions.https.onRequest(app);

const userCollection = "users"
const gearCollection = "gear"
const logCollection = 'checkOuts'

//define google cloud function name
export const webApi = functions.https.onRequest(main);

// regex comparison values
const reEmail = /\S+@\S+\.\S+/;
const reSPIRE = /^[0-9]{8}$/
const gearUID = /[A-Z]{3}\d{3}/
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
    possession: string[];
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

/**
 * transaction
 */
export interface Check {
    date: string;
    gearID: string;
    userSPIRE_ID: string;
    leadSPIRE_ID: string;
}

/*
    Logic Required:
        Sign Up :
            Create User 
            Authenticate Password
            Sign In User
        Sign In :
            Authenticate Details
            Sign In User
        Get All Gear :
            Simply Return List
        Check Out :
            Validate Input IDs 
            Validate Gear ID
            Validate JWT i.e., Auth level
            Update Gear Status
            Update Check Log
            Update Customer Possession Log
        Check In :
            Validate IDs
            Update Gear Status
            Update Check Log
            Update Custoemr Possession Log
        Upload CSV :
            TODO : Inbar
        Get User By ID : Complete
            
*/

// Create new user
app.post('/api/createUser', async (req, res) => {
    try {
        const user: User = {
            email: req.body['email'],
            name: req.body['name'], // Might have to be changed to only post the fullName
            permLvl: req.body['permLvl'],
            phoneNum: req.body['phoneNum'],
            SPIRE_ID: req.body['SPIRE_ID'],
            waiver: req.body['waiver'],
            possession: req.body['possession']
        };
        const userUID = await handleSignUp(user, user.email, "testPassword");
        await db.collection(userCollection).doc(userUID).set(user);
        res.status(200).send(`Created a new user: ${userUID}`);
    } catch (error) {
        res.status(400).send("" + error);
    }
});

// Get all users
app.get('/api/getAllusers', async (req, res) => {
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
app.get('/api/getUser', (req: Request, res: Response) => {
  const userId: string | undefined = req.query.userId as string | undefined; 
  if (!userId) {
    return res.status(400).json({ error: 'userId parameter is required' });
  } else {
    return db.collection(userCollection)
      .doc(userId)
      .get()
      .then((user) => {
        if (!user.exists) throw new Error('User not found');
        res.status(200).json({ id: user.id, data: user.data() });
      })
      .catch((error) => res.status(500).send(error));
  }
});

app.get('/api/getUserById', async (req: Request, res: Response) => {
  try {
    const identifier: string | undefined = req.query.identifier as string | undefined;

    if (!identifier) {
      return res.status(400).json({ error: 'Correct Identifier parameter is required' });
    }

    if (reSPIRE.test(identifier)) {
        const querySnapshot = await db.collection(userCollection)
            .where('SPIRE_ID', '==', identifier)
            .get();
        
        if (querySnapshot.empty) {
            return res.status(404).send('User not found');
        } else {
            const user = querySnapshot.docs[0]; // Assuming there is only one matching user
            return res.status(200).json({ id: user.id, data: user.data() });
        }
    } else if (reEmail.test(identifier)) {
      const querySnapshot = await db.collection(userCollection)
        .where('email', '==', identifier)
        .get();

      if (querySnapshot.empty) {
        return res.status(404).send('User not found');
      } else {
        const user = querySnapshot.docs[0]; // Assuming there is only one matching user
        return res.status(200).json({ id: user.id, data: user.data() });
      }
    }
  } catch (error) {
    return res.status(500).send(error);
  }

  // Default return statement to satisfy TypeScript
  return res.status(500).send('An unexpected error occurred');
});

// get Gear by UID
app.get('/api/getGearById', async (req: Request, res: Response) => {
  try {
  const identifier: string | undefined = req.query.identifier as string | undefined;

  if (!identifier) {
      return res.status(400).json({ error: 'Correct Identifier parameter is required' });
  }

  if (gearUID.test(identifier)) {
      const querySnapshot = await db.collection(gearCollection)
          .where('gearId', '==', identifier)
          .get();
      
      if (querySnapshot.empty) {
          return res.status(404).send('Gear not found with identifier: ' + identifier);
      } else {
          const gear = querySnapshot.docs[0]; // Assuming there is only one matching piece of gear
          return res.status(200).json({ id: gear.id, data: gear.data() });
      }
  } 
  } catch (error) {
  return res.status(500).send(error);
  }

  // Default return statement to satisfy TypeScript
  return res.status(500).send('An unexpected error occurred');
});

// Delete a user
app.delete('/api/users/:userId', (req, res) => {
    db.collection(userCollection).doc(req.params.userId).delete()
    .then(()=>res.status(204).send("Document successfully deleted!"))
    .catch(function (error) {
            res.status(500).send(error);
    });
})

// Update a user
app.put('/api/users/:userId', async (req, res) => {
    await db.collection(userCollection).doc(req.params.userId).set(req.body,{merge:true})
    .then(()=> res.json({id:req.params.userId}))
    .catch((error)=> res.status(500).send(error))
});

app.post('/api/checkOutGear', async (req, res) => {
    try {
        const check: Check = {
            date: req.body['date'],
            gearID: req.body['name'], 
            userSPIRE_ID: req.body['id'],
            leadSPIRE_ID: req.body['waiver']
            //JWT Token to auth that leader/manager is sending request
        }

        // Logic : send put request to change status of gear, 

        const newDoc = await db.collection(logCollection).add(check);
        res.status(201).send(`Gear Checked Out: ${newDoc.id}`);
    } catch (error) {
        res.status(400).send(`You messed up.`);
    }
});

app.get('/api/getAllGear', async (req: Request, res: Response) => {
    const snapshot = await db.collection(gearCollection).get()
    return res.status(201).json(snapshot.docs.map(doc => doc.data()));
});
