import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { toast } from 'sonner';
import { UserProfileResponse, UserLogin, UserCreate, LoginResponse } from '@/types/api'; // Define these types later

const AUTH_TOKEN_KEY = 'authToken';
const USER_INFO_KEY = 'userInfo';

export interface AuthContextType {
    token: string | null;
    user: UserProfileResponse | null;
    isFirstTime: boolean | null; // null initially, true/false after check
    isLoading: boolean;
    login: (credentials: UserLogin) => Promise<boolean>;
    logout: () => void;
    signup: (userData: UserCreate) => Promise<boolean>;
    checkFirstTimeSetup: () => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
    const [user, setUser] = useState<UserProfileResponse | null>(() => {
        const storedUser = localStorage.getItem(USER_INFO_KEY);
        try {
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until initial checks are done
    const api = useApi(); // Get API instance with interceptors

    const storeTokenAndUser = (newToken: string, newUserInfo: UserProfileResponse) => {
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(newUserInfo));
        setToken(newToken);
        setUser(newUserInfo);
    };

    const clearTokenAndUser = () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_INFO_KEY);
        setToken(null);
        setUser(null);
    };

    const checkFirstTimeSetup = useCallback(async () => {
        try {
            const response = await api.get<boolean>('/auth/firsttime');
            setIsFirstTime(response.data);
            return response.data;
        } catch (error) {
            toast.error('Failed to check setup status.');
            setIsFirstTime(null); // Indicate error state? Or assume not first time?
            return false;
        }
    }, [api]);

    const fetchCurrentUser = useCallback(async () => {
        if (!token) {
            clearTokenAndUser();
            return;
        }
        try {
            const response = await api.get<UserProfileResponse>('/auth/users/me');
            localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.data)); // Update local storage
            setUser(response.data);
        } catch (error) {
            // Error likely handled by interceptor (401 will trigger logout)
            // If not 401, it means token might be valid but fetching failed.
            console.error("Failed to fetch current user:", error);
            // Keep existing user data for now unless it was a 401 handled by interceptor
        }
    }, [api, token]);


    const login = async (credentials: UserLogin): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await api.post<LoginResponse>('/auth/login', credentials);
            const newToken = response.data.token;
            // Fetch user details after successful login to store them
            const userResponse = await api.get<UserProfileResponse>('/auth/users/me', {
                 headers: { 'X-Login': newToken } // Use the new token immediately
            });
            storeTokenAndUser(newToken, userResponse.data);
            toast.success(`Welcome back, ${userResponse.data.username}!`);
            await checkFirstTimeSetup(); // Re-check first time status after login
            setIsLoading(false);
            return true;
        } catch (error) {
             // Error handled by interceptor, but we return false here
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        clearTokenAndUser();
        setIsFirstTime(null); // Reset first time status on logout
        toast.success('Logged out successfully.');
         // Optional: Force navigation
         // window.location.href = '/login';
    };

    const signup = async (userData: UserCreate): Promise<boolean> => {
         setIsLoading(true);
        try {
             // The create_user endpoint returns UserResponse, not LoginResponse.
             // It doesn't automatically log the user in.
            await api.post('/admin/create_user', userData);
            toast.success(`User ${userData.username} created successfully! Please log in.`);
            await checkFirstTimeSetup(); // Re-check first time status
            setIsLoading(false);
            return true; // Indicate signup API call success
        } catch (error) {
            // Error handled by interceptor
            setIsLoading(false);
            return false;
        }
    };


    // Initial check on component mount
    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            const isSetupNeeded = await checkFirstTimeSetup();
            if (token && !isSetupNeeded) { // Only fetch user if token exists and it's not first time
                await fetchCurrentUser();
            } else if (!token && !isSetupNeeded) {
                 // No token and not first time setup -> definitely logged out
                 clearTokenAndUser();
            }
             // If it IS first time setup, don't clear token yet, signup page might need it if implemented differently
            setIsLoading(false);
        };
        initializeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]); // Rerun only if token changes externally


    return (
        <AuthContext.Provider value={{ token, user, isFirstTime, isLoading, login, logout, signup, checkFirstTimeSetup, fetchCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};