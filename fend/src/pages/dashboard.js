import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useApi, { getAuthToken, clearAuthToken } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';

// Placeholder for actual dashboard components
// import NginxSitesList from '@/components/Nginx/SitesList';
// import NginxLogsList from '@/components/Nginx/LogsList';

export default function Dashboard() {
  const router = useRouter();
  const { request, loading, error } = useApi(); // Use API hook for dashboard data later
  const [currentUser, setCurrentUser] = useState(null);

  // Check authentication on load
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/'); // Redirect to login if no token
      return;
    }

    // Fetch user details if needed (optional for now)
    const fetchUser = async () => {
        try {
            // Assuming /users/me endpoint exists and returns user info
            const userData = await request('/auth/users/me');
            setCurrentUser(userData);
        } catch (err) {
             console.error("Failed to fetch user details:", err);
             // Handle error - maybe logout or show limited dashboard
             // If the token is invalid, the API hook might throw, or we might get a 401/403
             // For now, let's clear the potentially invalid token and redirect
             clearAuthToken();
             router.push('/');
        }
    };

    fetchUser();

  }, [router, request]); // Add request to dependency array

  const handleLogout = () => {
    clearAuthToken();
    router.push('/');
  };

  // Don't render anything until authentication check is complete or user is fetched
   if (!currentUser && loading) {
       return <div>Loading user data...</div>; // Or a proper loader
   }

   // If user fetch failed but we didn't redirect yet (e.g., network error)
   if (error) {
       return <div>Error loading dashboard: {error} <Button onClick={handleLogout}>Go to Login</Button></div>;
   }

  // If redirecting or user check failed and redirected
   if (!currentUser && !loading) {
       return null; // Avoid flash of content before redirect
   }


  return (
    <div>
      <Head>
        <title>Secure UI - Dashboard</title>
        <meta name="description" content="Secure UI Management Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
           <h1>Dashboard</h1>
           {currentUser && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Welcome, {currentUser.username}!</span>
                <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
             </div>
            )}
        </div>

        {/* TODO: Add Dashboard Content Here */}
        <p>This is where the Nginx site management, log viewing, etc., will go.</p>
        {/* Example placeholders:
        <NginxSitesList />
        <NginxLogsList />
        */}

      </main>
    </div>
  );
}