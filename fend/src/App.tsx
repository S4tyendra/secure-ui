import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import LoginPage from './pages/login';
import SignupPage from './pages/SignupPage'; // To be created
import DashboardLayout from './components/layout/DashboardLayout'; // To be created/updated
import NginxSitesPage from './pages/nginx/NginxSitesPage'; // To be created
import NginxLogsPage from './pages/nginx/NginxLogsPage'; // To be created
import NginxConfPage from './pages/nginx/NginxConfPage'; // To be created
import { Progress } from "@/components/ui/progress"; // Or any loading component

// Higher-order component for protected routes
const ProtectedRoute = () => {
    const auth = useContext(AuthContext) as AuthContextType;

    if (auth.isLoading) {
        return <div className="flex items-center justify-center h-screen"><Progress value={50} className="w-[60%]" /></div>; // Or a better spinner
    }

    if (!auth.token || !auth.user) {
        // Not authenticated, redirect to login
        return <Navigate to="/login" replace />;
    }

    // Authenticated, render the nested routes
    return <Outlet />;
};

// Component for handling initial routing based on first-time setup
const InitialRouteHandler = () => {
     const auth = useContext(AuthContext) as AuthContextType;

     if (auth.isLoading) {
         return <div className="flex items-center justify-center h-screen"><Progress value={50} className="w-[60%]" /></div>;
     }

     if (auth.isFirstTime === true) {
         // Needs setup, redirect to signup
         return <Navigate to="/signup" replace />;
     }

     if (auth.isFirstTime === false && !auth.token) {
         // Setup done, but not logged in, redirect to login
         return <Navigate to="/login" replace />;
     }

      if (auth.isFirstTime === false && auth.token) {
          // Setup done and logged in, redirect to dashboard (or intended route)
          // Assuming '/nginx/sites' is the main dashboard view for now
          return <Navigate to="/nginx/sites" replace />;
      }

      // Fallback loading state or handle null isFirstTime state if necessary
      return <div className="flex items-center justify-center h-screen"><Progress value={50} className="w-[60%]" /></div>;
};

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} /> {/* Signup only accessible if isFirstTime is true, logic within component */}

                    {/* Handle root path redirection */}
                    <Route path="/" element={<InitialRouteHandler />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                         <Route element={<DashboardLayout />}> {/* Layout for authenticated routes */}
                              {/* Add specific authenticated routes here */}
                              <Route path="/nginx/sites" element={<NginxSitesPage />} />
                              <Route path="/nginx/logs" element={<NginxLogsPage />} />
                              <Route path="/nginx/conf" element={<NginxConfPage />} />
                              {/* Add other dashboard/protected routes */}
                               {/* Redirect base authenticated path to sites page */}
                               <Route index element={<Navigate to="/nginx/sites" replace />} />
                         </Route>
                    </Route>

                    {/* Catch-all for undefined routes (optional) */}
                    <Route path="*" element={<Navigate to="/" replace />} /> {/* Or a 404 page */}
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
