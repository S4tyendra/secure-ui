import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert

const LoginForm = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { request, loading, error, setError } = useApi(); // Get setError to clear previous errors

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors before new attempt

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      // On successful login, call the callback function passed from the parent
      if (data && data.token) {
         // Pass token and user info (if available) to the parent component
        onLoginSuccess(data.token, { username: data.username });
      } else {
          // Handle cases where login might succeed but token is missing (shouldn't happen with spec)
          setError("Login successful, but no token received.");
      }
    } catch (err) {
      // Error is already set by useApi hook, no need to setError here unless customizing message
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <h2 className="text-2xl font-bold text-center mb-4">Login</h2>
       {error && (
         <Alert variant="destructive" className="mb-4">
           <AlertTitle>Login Failed</AlertTitle>
           <AlertDescription>
             {error}
           </AlertDescription>
         </Alert>
       )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium mb-1">Username</label>
          <Input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium mb-1">Password</label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;