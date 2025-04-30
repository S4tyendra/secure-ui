import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router'; // Import useRouter
import useApi, { setAuthToken, clearAuthToken } from '@/hooks/useApi'; // Import token functions
import LoginForm from '@/components/Auth/LoginForm';
import SignupForm from '@/components/Auth/SignupForm';
import { Button } from '@/components/ui/button'; // For potential logout/dashboard redirect
// TODO: Import Loading component (e.g., Skeleton)

export default function Home() {
  const router = useRouter(); // Initialize router
  const { request, loading, error, setError } = useApi();
  const [isFirstTime, setIsFirstTime] = useState(null); // null: checking, true: first time, false: not first time
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state
  const [currentUser, setCurrentUser] = useState(null); // Store user details

  // Check first time setup status
  useEffect(() => {
    const checkFirstTime = async () => {
      // Only check if not already logged in
       if (!isLoggedIn) {
            clearAuthToken(); // Ensure no stale token from previous sessions
            try {
                const firstTimeResult = await request('/auth/firsttime');
                setIsFirstTime(firstTimeResult);
                setError(null); // Clear previous errors on successful check
            } catch (err) {
                console.error("Failed to check first time status:", err);
                // Assume not first time if check fails, let login handle actual auth errors
                setIsFirstTime(false);
                // Keep the error state set by useApi hook to display it
            }
       }
    };
    checkFirstTime();
    // We only want this to run once on mount ideally, unless request changes
  }, [request, isLoggedIn]); // Rerun if isLoggedIn changes (e.g., after logout)

  // Handle successful login
  const handleLoginSuccess = (token, user) => {
    setAuthToken(token);
    setIsLoggedIn(true);
    setCurrentUser(user);
    setIsFirstTime(false); // Logged in means it's not first time anymore
    setError(null); // Clear login errors
    router.push('/dashboard'); // Redirect to dashboard
  };

  // Handle successful signup (which acts as first login)
  const handleSignupSuccess = async (userData) => {
    // After successful signup, attempt to log in automatically
    // This assumes the signup endpoint returns credentials or we can use the submitted ones
    // For now, let's just refresh the state - ideally, we'd log the user in.
    // We might need to call the login endpoint immediately after signup.
    // Let's fetch the token by calling login endpoint after successful signup
    try {
        const loginData = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: userData.username, password: userData.password }), // Assuming you have password from signup form state
        });
         handleLoginSuccess(loginData.token, { username: loginData.username }); // Store token and basic user info
         // Redirect happens within handleLoginSuccess now
     } catch (loginErr) {
         console.error("Auto-login after signup failed:", loginErr);
         setError("Signup successful, but auto-login failed. Please log in manually.");
         setIsFirstTime(false); // Move to login form even if auto-login fails
         // No redirect here, stay on index to show login form with error
     }
  };

  // Logout is handled on the dashboard page now
  /*
  const handleLogout = () => {
    clearAuthToken();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsFirstTime(null); // Reset first time check state to trigger re-check
    setError(null);
  };
  */


  const renderContent = () => {
      // If logged in state is somehow set before redirect, show loading or null
      if (isLoggedIn) {
          // Or redirect immediately if detected
          // router.push('/dashboard'); // Can cause hydration issues if done here directly
          return <div>Redirecting...</div>; // Show a brief message during redirect
      }

    // Initial loading state or error during first time check
    if (loading && isFirstTime === null) {
      // TODO: Replace with a proper loading indicator (e.g., Shadcn Skeleton)
      return <div>Loading initial setup status...</div>;
    }

    // Display error from first time check if it happened
     if (error && isFirstTime === false) {
       // If error occurred during check, show it above the login form
       return (
          <div>
             <p style={{ color: 'red' }}>Error checking setup: {error}</p>
             <LoginForm onLoginSuccess={handleLoginSuccess} />
           </div>
        );
    }


    // Show Signup form if it's the first time
    if (isFirstTime === true) {
      // Pass the necessary props to SignupForm
      return <SignupForm onSignupSuccess={handleSignupSuccess} />;
    }

    // Default to Login form if not first time and not logged in
     if (isFirstTime === false && !isLoggedIn) {
        // Pass the necessary props to LoginForm
        return <LoginForm onLoginSuccess={handleLoginSuccess} />;
     }

     // Fallback or unexpected state
     return <div>Something went wrong. Please refresh.</div>;
  };

  return (
    <div style={{ padding: '20px' }}>
      <Head>
        <title>Secure UI</title>
        <meta name="description" content="Secure UI Management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Secure UI</h1>
        {renderContent()}
      </main>
    </div>
  );
}
