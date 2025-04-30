import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useApi, { setAuthToken } from '@/hooks/useApi'; // Removed clearAuthToken, middleware handles pre-load state
import LoginForm from '@/components/Auth/LoginForm';
import SignupForm from '@/components/Auth/SignupForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react'; // Loading spinner icon

export default function LoginPage() {
  const router = useRouter();
  const { request, loading: apiLoading, error: apiError, setError: setApiError } = useApi();
  const [isFirstTime, setIsFirstTime] = useState(null); // null: checking, true: first time, false: not first time
  const [pageLoading, setPageLoading] = useState(true); // Combined loading state for initial check

  // Check first time setup status on mount
  useEffect(() => {
    const checkFirstTime = async () => {
      setPageLoading(true);
      setApiError(null); // Clear previous errors
      try {
        // Middleware should prevent logged-in users from reaching here,
        // so we don't need to check isLoggedIn state explicitly.
        // We also don't need to clear tokens here, as middleware handles redirection based on cookie.
        const firstTimeResult = await request('/auth/firsttime');
        setIsFirstTime(firstTimeResult);
      } catch (err) {
        console.error("Failed to check first time status:", err);
        // Let the API error state handle display
        setIsFirstTime(false); // Assume not first time if check fails to show login form
      } finally {
        setPageLoading(false);
      }
    };
    checkFirstTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle successful login
  const handleLoginSuccess = (token, user) => {
    setAuthToken(token); // Set token in localStorage
    setApiError(null); // Clear login errors
    // Middleware should handle redirect *from* login if token is set,
    // but we push explicitly here for faster UX after action.
    router.push('/dashboard');
  };

  // Handle successful signup (which acts as first login)
  const handleSignupSuccess = async (userData) => {
    setApiError(null);
    // After signup, attempt auto-login
    try {
      // Use the useApi hook instance to handle loading/error state for this specific request
      const loginData = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: userData.username, password: userData.password }), // Password needs to be available from SignupForm state
      });
      handleLoginSuccess(loginData.token, { username: loginData.username });
    } catch (loginErr) {
      console.error("Auto-login after signup failed:", loginErr);
      setApiError("Signup successful, but auto-login failed. Please log in manually.");
      setIsFirstTime(false); // Show login form after failed auto-login
    }
  };

  const renderForm = () => {
    if (isFirstTime === true) {
      return (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Admin Account</CardTitle>
          </CardHeader>
          <CardContent>
            {apiError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Signup Error</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
            <SignupForm onSignupSuccess={handleSignupSuccess} apiLoading={apiLoading} setApiError={setApiError} />
          </CardContent>
        </Card>
      );
    }

    if (isFirstTime === false) {
      return (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            {apiError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
            <LoginForm onLoginSuccess={handleLoginSuccess} apiLoading={apiLoading} setApiError={setApiError} />
          </CardContent>
        </Card>
      );
    }

    // Fallback if isFirstTime is still null after loading (shouldn't happen often)
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Head>
        <title>Login - Secure UI</title>
        <meta name="description" content="Secure UI Login" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex w-full flex-1 flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-8">Secure UI</h1>
        {pageLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Checking setup...</span>
          </div>
        ) : (
          renderForm()
        )}
        {/* Display general API error during initial check if form isn't rendered yet */}
        {apiError && isFirstTime === null && !pageLoading && (
           <Alert variant="destructive" className="mt-4 w-full max-w-md">
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{apiError}</AlertDescription>
           </Alert>
        )}
      </main>
    </div>
  );
}
