import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/login';
import { useEffect, useState } from 'react';
import Layout from './components/layout/layout';
import { ThemeProvider } from "@/components/theme-provider"

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState({ email: '', expires: '', role: '' } as { email: string, expires: string, role: 'admin' | 'faculty' | 'student' | '' })

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/login');
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      try {

      } catch {
        if (location.pathname !== '/admin-auth' && !location.pathname.startsWith('/login')) {
          navigate(location.pathname === '/' ? '/login' : `/login?next=${location.pathname}`);
        }
      }
    };

    checkAuth();
  }, [location.pathname, navigate]);


  return (
    <Layout
      usrData={userData}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-auth" element={<div>Admin Auth</div>} />
        <Route path="/another-route" element={<div>Another Route</div>} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
