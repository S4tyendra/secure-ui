import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Remove Navigate import
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { UserCreate } from '@/types/api'; // Import UserCreate type

const SignupPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const auth = useContext(AuthContext) as AuthContextType;
    const navigate = useNavigate();

    // Redirect if not first time setup or if loading
    useEffect(() => {
        if (!auth.isLoading && auth.isFirstTime === false) {
            toast.error("Setup already complete. Redirecting to login.");
            navigate('/login', { replace: true });
        }
    }, [auth.isLoading, auth.isFirstTime, navigate]);

    const validateForm = (): boolean => {
        if (!username || username.length < 3) {
            toast.error("Username must be at least 3 characters long.");
            return false;
        }
        // Basic email regex (consider a more robust one or library)
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Please enter a valid email address.");
            return false;
        }
        if (!password || password.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return false;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        const signupData: UserCreate = { username, email, password };
        const success = await auth.signup(signupData);
        setIsSubmitting(false);
        if (success) {
            // Redirect to login page after successful signup
            navigate('/login');
        }
        // Error toasts are handled within the signup function/API hook
    };

    // Render loading or null if redirecting might happen
    if (auth.isLoading || auth.isFirstTime === false) {
        return <div className="flex items-center justify-center h-screen">Loading setup status...</div>;
        // Or return null if the redirect effect handles it quickly enough
    }

    // Render only if isFirstTime is explicitly true
    if (auth.isFirstTime !== true) {
         return <div className="flex items-center justify-center h-screen">Checking setup status...</div>; // Fallback
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">First Time Setup</CardTitle>
                    <CardDescription>Create the initial administrator account.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isSubmitting}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default SignupPage;