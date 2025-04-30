import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx' // Import AuthProvider
import { Toaster } from "@/components/ui/sonner" // Import Toaster for sonner

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
        <App />
        <Toaster richColors /> {/* Add Toaster here */}
    </AuthProvider>
  </StrictMode>,
)
