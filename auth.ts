// Follow this pattern to import other Firebase services
// import { } from 'firebase/<service>';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp } from 'firebase/app';

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

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2DGbqtksrFhzVdfPXOWzPq451PeOdghM",
  authDomain: "umoc-outing-club.firebaseapp.com",
  databaseURL: "https://umoc-outing-club-default-rtdb.firebaseio.com",
  projectId: "umoc-outing-club",
  storageBucket: "umoc-outing-club.appspot.com",
  messagingSenderId: "440739076585",
  appId: "1:440739076585:web:cbca8efbb5f917c95e9378",
  measurementId: "G-36204C7X0H"
};

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);

/*
  Set of validation functions
*/

function validateEmailAndPassword(email: string, password: string) {

  const reEmail = /\S+@\S+\.\S+/;
  const rePass = /^(?=(.*[a-z]){1,})(?=(.*[A-Z]){1,})(?=(.*[0-9]){1,})(?=(.*[!@#$%^&*()\-_+.]){1,}).{8,}$/;
  
  if (!reEmail.test(email)) {
    throw new Error("Email is bad format.");
  }
  if (!rePass.test(password)) {
    throw new Error("Password is bad format. Needs to be at least 8 characters with at least 1 lowercase, 1 uppercase, 1 number, and 1 special character.");
  }
}

function validateUserInputs(user: User) {
  const reName = /^[a-z ,.'-]+$/i;
  const rePerm = /^[0-2]$/;
  const rePhone = /^(\d{1,2})?\d{10}$/;
  const reSPIRE = /^[0-9]{8}$/

  if (!reName.test(user.name)) {
    throw new Error("Name is bad format. Name can only be letters, along with (,.'-) as permitted special characters.");
  }
  if (!rePerm.test(user.permLvl.toString())) {
    throw new Error("Permission level is not 0, 1, or 2.");
  }
  if (!rePhone.test(user.phoneNum.toString())) {
    throw new Error("Phone number is not a 10-12 digit integer.");
  }
  if (user.waiver == null) {
    throw new Error("Waiver value is missing. Please set it to true or false.");
  }
  if (user.SPIRE_ID != null) {
    if(!reSPIRE.test(user.SPIRE_ID.toString())) {
      throw new Error("SPIRE ID is not an 8-digit integer.");
    }
  }
}

export async function handleSignIn(email : string, password: string) {
  try {
    validateEmailAndPassword(email, password);
    // Sign in with email and pass.
    const authUser = await signInWithEmailAndPassword(auth, email, password)
    return authUser.user.uid;
  }
  catch (error) {
    // Handle Errors here.
    throw error;
  } 
}

/**
 * Handles the sign up button press.
 */
export async function handleSignUp(user: User, email: string, password: string) {
  try {
    validateEmailAndPassword(email, password);
    validateUserInputs(user);
    const authUser = await createUserWithEmailAndPassword(auth, email, password);
    return authUser.user.uid;
  }
  catch (error) {
    throw error;
  }
}

export async function signOutUser() {
  signOut(auth).then(() => {
    // Sign-out successful.
  }).catch((error) => {
    throw error;
  });
}

