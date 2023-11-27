// import libraries
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from "cors";
import { Request, Response } from 'express';
import { handleSignUp, handleSignIn } from '../../auth';

//initialize firebase in order to access its services
admin.initializeApp(functions.config().firebase);

//initialize express server
const app = express();
app.use(cors({ origin: true }));

//initialize the database and the collection 
const db = admin.firestore();
exports.app = functions.https.onRequest(app);

const userCollection = "users"
const gearCollection = "gear"
const logCollection = 'checkOuts'

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
            possession: req.body['possession'],
        };
        const userUID = await handleSignUp(user, user.email, req.body['password']);
        await db.collection(userCollection).doc(userUID).set(user);
        res.status(200).send(`Created a new user: ${userUID}`);
    } catch (error) {
        res.status(400).send("" + error);
    }
});

// Login a user
app.get('/api/loginUser', async (req, res) => {
    try {
        const input = {
            email: req.body['email'],
            password: req.body['password']
        };

        const userUID = await handleSignIn(input.email, input.password);

        db.collection(userCollection)
            .doc(userUID)
            .get()
            .then((user) => {
                if (!user.exists) {
                    throw new Error('User not found');
                }
                res.status(200).send(`Signed in user: ${user.data()}`);
            });
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
            function(doc) {
                users.push({
                    id: doc.id,
                    data:doc.data()
                });
            }
        );
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send(error);
        res.status(400).send(`User should contain email, name, permissionLevel, contactNumber, id, waiver, and possession fields, along with any additional properties.`);
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
        if (!user.exists) {
            throw new Error('User not found');
        }
        res.status(200).json({ id: user.id, data: user.data() });
      })
      .catch((error) => res.status(500).send(error));
  }
});

// Get user by Email/SPIRE ID
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

// Get gear possessed by user by Email/SPIRE ID
app.get('/api/getGearByUser/:identifier', async (req: Request, res: Response) => {
    try {
      const identifier: string | undefined = req.params.identifier as string | undefined;
  
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
              return res.status(200).json({ id: user.id, data: user.data().possession });
          }
        } else if (reEmail.test(identifier)) {
          const querySnapshot = await db.collection(userCollection)
            .where('email', '==', identifier)
            .get();
  
        if (querySnapshot.empty) {
          return res.status(404).send('User not found');
        } else {
          const user = querySnapshot.docs[0]; // Assuming there is only one matching user
          return res.status(200).json({ id: user.id, data: user.data().possession });
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

/*
    Authentication of Leader is remaining
    TBD if we need to add gear to user accounts of not

    NOTE: checkOut here is a flag variable representing if a checkIn or a checkOut is occurring
*/
app.post('/api/checkGear/:checkOut', async (req, res) => {
    try {
        const check: Check = {
            date: req.body['date'],
            gearID: req.body['gearID'],
            userSPIRE_ID: req.body['userID'],
            leadSPIRE_ID: req.body['leaderID'],
            // JWT Token to auth that leader/manager is sending a request
        };

        const flag = req.params.checkOut;
        const gearID = check.gearID;
        const userID = check.userSPIRE_ID;
        const leadId = check.leadSPIRE_ID;

        if (reSPIRE.test(userID) && reSPIRE.test(leadId) && gearUID.test(gearID)) {
            const userSnapshot = await db.collection(userCollection)
                .where('SPIRE_ID', '==', userID)
                .get();
            const leaderSnapshot = await db.collection(userCollection)
                .where('SPIRE_ID', '==', leadId)
                .get();
            const gearSnapshot = await db.collection(gearCollection)
                .where('gearId', '==', gearID)
                .get();

            if (userSnapshot.empty) {
                return res.status(404).send('User not found');
            } else if (leaderSnapshot.empty) {
                return res.status(404).send('Leader not found');
            } else if (gearSnapshot.empty) {
                return res.status(404).send('Gear not found');
            } else {
                // Assuming there is only one matching user, leader, and gear
                const user = userSnapshot.docs[0]; 
                // const leader = leaderSnapshot.docs[0];
                const gear = gearSnapshot.docs[0];

                // Update the status of the checked-out gear 
                await updateUserPossession(gearID, user.id, flag)
                await updateGearStatus(gear.id, flag);
            }
        } else {
            return res.status(400).send('Incorrect specifications received');
        }
        const newDoc = await db.collection(logCollection).add(check);
        return res.status(201).send(`Gear Checked Out: ${gearID} \n Transaction ID : ${newDoc.id}`);
    } catch (error) {
        console.error(error);
        return res.status(500).send(`An unexpected error occurred: ${error}`);
    }    
});

// Helper  function for checkGear : modulates the checkedOut flag for gear
// Note gearId here refers to the firebase ID not the UID we assign for gear
async function updateGearStatus(gearId: string, flag: string): Promise<void> {
    try {
        const gearRef = db.collection(gearCollection).doc(gearId);
        const updateData = { checkedOut: flag === "checkOut" };
        await gearRef.update(updateData);
    } catch (error) {
        console.error(`Error updating gear status: ${error}`);
        throw new Error('Failed to update gear status');
    }
}

// Helper function for checkGear : updates User possession of gear
// Note gearId here refers to the UID we assign for gear
async function updateUserPossession(gearId: string, userId: string, flag: string): Promise<void> {
    try {
        const userRef = db.collection(userCollection).doc(userId);
        const user = await userRef.get();

        if (flag === "checkOut") {
            if (user.exists) {
                const updatedPossession = [...user.data()?.possession || [], gearId];
                await userRef.update({ possession: updatedPossession });
            } else {
                throw new Error('Failed to update gear status');
            }
        } else if (flag === "checkIn") {
            if (user.exists) {
                const possessionArray = user.data()?.possession || [];
                if (possessionArray.includes(gearId)) {
                    const updatedPossession = possessionArray.filter((id: string) => id !== gearId);
                    await userRef.update({ possession: updatedPossession });
                } else {
                    throw new Error(`User does not have gear with ID ${gearId} in possession.`);
                }
            }
        } else {
            throw new Error(`Invalid flag: ${flag}`);
        }
    } catch (error) {
        console.error(`Error updating user possession status: ${error}`);
        throw new Error('Failed to update gear status');
    }
}

// Returns all gear objects
app.get('/api/getAllGear', async (req: Request, res: Response) => {
    const snapshot = await db.collection(gearCollection).get();
    return res.status(201).json(snapshot.docs.map(doc => doc.data()));
});

// Returns all users
app.get('/api/getAllUsers', async (req: Request, res: Response) => {
    const snapshot = await db.collection(userCollection).get()
    return res.status(201).json(snapshot.docs.map(doc => doc.data()));
});


