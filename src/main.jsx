import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom';
import './index.css'
import App from './App'

import fbconfig from './firebase/FirebaseConfig';
import { initializeApp } from "firebase/app";
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
const app = initializeApp(fbconfig);

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Navbar />
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
