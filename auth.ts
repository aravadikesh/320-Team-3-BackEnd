// Follow this pattern to import other Firebase services
// import { } from 'firebase/<service>';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
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

// const db = getFirestore(app);

// // Get a list of cities from your database
// async function getCities(db) {
//   const citiesCol = collection(db, 'cities');
//   const citySnapshot = await getDocs(citiesCol);
//   const cityList = citySnapshot.docs.map(doc => doc.data());
//   return cityList;
// }

/*
  Set of validation functions
*/

function validateUser(user : User, email: string, password: string): boolean {

  const reEmail = /\S+@\S+\.\S+/;
  const rePass = /.{8,}/;
  const reName = /^[a-z ,.'-]+$/i;
  const rePerm = /^[0-2]$/;
  const rePhone = /^(\d{1,2})?\d{10}$/;
  const reSPIRE = /^[0-9]{8}$/
  
  if (!reEmail.test(email)) {
    console.log("bad email");
    alert('Email is fucked')
  }

  if (!rePass.test(password)) {
    console.log("bad password");
    alert('Password is fucked');
    return false;
  }

  if (!reName.test(user.name)) {
    console.log("bad name");
    alert('Why does your name have a number in it');
    return false;
  } 

  if (!rePerm.test(user.permLvl.toString())) {
    console.log("bad permLvl");
    alert('Why is your permLvl so high/low/illegal');
    return false;
  }

  if (!rePhone.test(user.phoneNum.toString())) {
    console.log("bad phoneNum");
    alert('Why is your phone number messed up');
    return false;
  }

  if (user.waiver == null) {
    console.log("no waiver");
    alert('waiver info unavailable');
    return false;
  }

  if (user.SPIRE_ID != null) {
    if(!reSPIRE.test(user.SPIRE_ID.toString())) {
      console.log("bad SPIRE");
      alert('SPIRE ID is fucked');
      return false;
    }
  }

  return true;
}

function validateEmail(email: string) : boolean {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function validatePassword(email: string) : boolean {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function handleSignIn(email : string, password: string) {
  if (auth.currentUser) {
    auth.signOut();
  } else {
    if (!validateEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!validatePassword) { // might be unnecessary
      alert('Please enter a password.');
      return;
    }
    // Sign in with email and pass.
    signInWithEmailAndPassword(auth, email, password).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      if (errorCode === 'auth/wrong-password') {
        alert('Wrong password.');
      } else {
        alert(errorMessage);
      }
      console.log(error);
      //document.getElementById('quickstart-sign-in').disabled = false;
    });
  }
  //document.getElementById('quickstart-sign-in').disabled = true;
}

/**
 * Handles the sign up button press.
 */
export async function handleSignUp(user: User, email: string, password: string) {
  try {
    if (!validateUser(user, email, password))
      return;
    await createUserWithEmailAndPassword(auth, email, password);
  }
  catch(error) {
    throw error;
  }
}
