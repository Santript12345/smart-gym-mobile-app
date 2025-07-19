// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ✅ Type-safe Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA__DWH1BvUh0xRu_PtMqyChMzgNMxnXYE",
  authDomain: "smart-gym-app-4be95.firebaseapp.com",
  projectId: "smart-gym-app-4be95",
  storageBucket: "smart-gym-app-4be95.appspot.com",
  messagingSenderId: "183754804013",
  appId: "1:183754804013:web:af874e546cd611502021a4",
  measurementId: "G-EZ30VRK9S5",
  databaseURL: "https://smart-gym-app-4be95-default-rtdb.firebaseio.com/",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export typed Firebase services
export const db = getDatabase(app);
export const auth = getAuth(app);
export default app;
