// Importa las funciones necesarias de los SDKs de Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Configuración de tu app web de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAo3qX3GBeBt91NrjMiET_ZjA1_TDvB9Hs",
  authDomain: "proyecto1-d6fb7.firebaseapp.com",
  databaseURL: "https://proyecto1-d6fb7.firebaseio.com",
  projectId: "proyecto1-d6fb7",
  storageBucket: "proyecto1-d6fb7.firebasestorage.app",
  messagingSenderId: "167077290909",
  appId: "1:167077290909:web:919defbbc85b771d858574",
  measurementId: "G-LPSK0FZ7JM"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
