import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import Slide from '@mui/material/Slide';

import './index.css'
import App from './App'

import fbconfig from './firebase/FirebaseConfig';
import { initializeApp } from "firebase/app";
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
const app = initializeApp(fbconfig);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          TransitionComponent={SlideTransition}
          preventDuplicate
        >
          <Navbar />
          <App />
        </SnackbarProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
