import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { UserLogin } from '@/types/api';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const auth = useContext(AuthContext) as AuthContextType;
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in and setup is complete
    useEffect(() => {
        if (!auth.isLoading && auth.token && auth.isFirstTime === false) {
            // Redirect to dashboard or intended page from 'next' param
            const params = new URLSearchParams(location.search);
            const next = params.get('next') || '/nginx/sites'; // Default to sites page
            navigate(next, { replace: true });
        }
        // If it's first time setup, App.tsx routing handles redirect to /si gnup
    }, [auth.isLoading, auth.token, auth.isFirstTime, navigate, location.search]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!username || !password) {
             // Basic validation, more can be added
             // Toasts for specific errors like 'invalid credentials' handled by API hook/AuthContext
             return;
        }
        setIsSubmitting(true);
        const credentials: UserLogin = { username, password };
        const success = await auth.login(credentials);
        setIsSubmitting(false);

        if (success) {
             // Redirect after successful login handled by useEffect above
             const params = new URLSearchParams(location.search);
             const next = params.get('next') || '/nginx/sites'; // Default to sites page
             navigate(next, { replace: true });
        }
        // Error toasts are handled within the login function/API hook
    };

    // Show loading indicator while checking auth status
    if (auth.isLoading) {
         return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

     // Prevent rendering login form if user is already logged in and redirect is pending
     if (auth.token && auth.isFirstTime === false) {
          return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
     }


    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5 }}
                 className="w-full max-w-md"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Login</CardTitle>
                        <CardDescription>Enter your credentials to access the Secure UI.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                        className="pr-10" // Add padding for the icon
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSubmitting ? 'Logging In...' : 'Login'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
};

export default LoginPage;
