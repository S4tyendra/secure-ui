import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert

const SignupForm = ({ onSignupSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { request, loading, error, setError } = useApi(); // Get setError

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    // Basic client-side validation (optional, server validates too)
    if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
    }
    if (!username || !email || !password) {
        setError("All fields are required.");
        return;
    }

    try {
      // Call the create user endpoint
      // Note: The first user creation doesn't require X-Login header according to spec
      const createdUser = await request('/admin/create_user', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      // On successful signup, call the callback function from the parent
      if (createdUser && createdUser.id) {
         // Pass necessary details back, including the password for auto-login attempt
        onSignupSuccess({ username, password, email, id: createdUser.id });
      } else {
           setError("Signup successful, but user data was not returned as expected.");
      }
    } catch (err) {
      // Error is set by useApi hook
      console.error('Signup failed:', err);
       // You might want to check err.message for specific backend validation errors
       // setError(err.message || "An error occurred during signup.");
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <h2 className="text-2xl font-bold text-center mb-4">Create Initial Admin User</h2>
       {error && (
         <Alert variant="destructive" className="mb-4">
           <AlertTitle>Signup Failed</AlertTitle>
           <AlertDescription>
             {error}
           </AlertDescription>
         </Alert>
       )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-username" className="block text-sm font-medium mb-1">Username</label>
          <Input
            id="signup-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            required
            minLength={3}
            maxLength={50}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium mb-1">Email</label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium mb-1">Password</label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 8 characters)"
            required
            minLength={8}
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating User...' : 'Create User'}
        </Button>
      </form>
    </div>
  );
};

export default SignupForm;