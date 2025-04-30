import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AxiosError } from 'axios'; // Import AxiosError
import useApi from '@/hooks/useApi';
import { toast } from 'sonner';
import { UserProfileResponse, UserLogin, UserCreate, LoginResponse, ApiErrorData } from '@/types/api';

const AUTH_TOKEN_KEY = 'authToken';
const USER_INFO_KEY = 'userInfo';

export interface AuthContextType {
    token: string | null;
    user: UserProfileResponse | null;
    isFirstTime: boolean | null;
    isLoading: boolean;
    login: (credentials: UserLogin) => Promise<boolean>;
    logout: () => void;
    signup: (userData: UserCreate) => Promise<boolean>;
    checkFirstTimeSetup: () => Promise<boolean | null>;
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
        } catch (parseError) {
            console.error("Error parsing stored user info:", parseError);
            localStorage.removeItem(USER_INFO_KEY);
            return null;
        }
    });
    const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const api = useApi();

    const storeTokenAndUser = (newToken: string, newUserInfo: UserProfileResponse) => {
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(newUserInfo));
        setToken(newToken);
        setUser(newUserInfo);
    };

    const clearTokenAndUser = useCallback(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_INFO_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const checkFirstTimeSetup = useCallback(async (): Promise<boolean | null> => {
        try {
            const response = await api.get<boolean>('/auth/firsttime');
            setIsFirstTime(response.data);
            return response.data;
        } catch (error) {
            console.error("API Error checking first time setup:", error);
            // Toast handled by interceptor now
            setIsFirstTime(null);
            return null;
        }
    }, [api]);

    const fetchCurrentUser = useCallback(async () => {
        if (!token) {
            clearTokenAndUser();
            return;
        }
        try {
            const response = await api.get<UserProfileResponse>('/auth/users/me');
            localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.data));
            setUser(response.data);
        } catch (error) {
             // Errors (including 401) handled by interceptor
             console.error("Error fetching current user (interceptor may have handled toast/logout):", error);
        }
    }, [api, token, clearTokenAndUser]);


    const login = async (credentials: UserLogin): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await api.post<LoginResponse>('/auth/login', credentials);
            const newToken = response.data.token;
            const userResponse = await api.get<UserProfileResponse>('/auth/users/me', {
                 headers: { 'X-Login': newToken }
            });
            storeTokenAndUser(newToken, userResponse.data);
            toast.success(`Welcome back, ${userResponse.data.username}!`);
            await checkFirstTimeSetup();
            setIsLoading(false);
            return true;
        } catch (error) {
            // Error handled by interceptor (toast shown there)
            console.error("Login failed:", error);
            setIsLoading(false);
            return false;
        }
    };

    const logout = useCallback(() => {
        clearTokenAndUser();
        setIsFirstTime(null);
        toast.info('You have been logged out.');
    }, [clearTokenAndUser]);

    // Reconfigure interceptor inside useEffect to use the latest logout function
    useEffect(() => {
        const errorInterceptor = api.interceptors.response.use(
            (response) => response,
            (error: AxiosError<ApiErrorData>) => { // Use specific types
                if (error.response?.status === 401) {
                    if (!error.config?.url?.endsWith('/auth/login')) {
                        toast.error('Session expired. Please log in again.');
                        logout(); // Call the stable logout function from closure
                    } else {
                         toast.error('Login failed: Invalid username or password.');
                    }
                } else {
                     let message = 'An API error occurred';
                     const errorData = error.response?.data;
                     if (errorData?.detail) {
                         if (typeof errorData.detail === 'string') {
                             message = errorData.detail;
                         } else if (Array.isArray(errorData.detail)) {
                             // Handle validation errors (potentially multiple)
                             message = errorData.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
                         } else if (typeof errorData.detail === 'object' && errorData.detail !== null && 'msg' in errorData.detail && typeof errorData.detail.msg === 'string') {
                              // Safely check for object, non-null, 'msg' property, and string type
                              message = errorData.detail.msg;
                         }
                     } else if (errorData?.message) { // Check for custom 'message' field
                          message = errorData.message;
                     } else if (error.message) {
                          message = error.message;
                     }
                     console.error("API Error:", error.response?.status, message, error);
                     if (error.response?.status !== 401) {
                        toast.error(`Error: ${message}`);
                     }
                }
                 return Promise.reject(error);
            }
        );
        return () => {
             api.interceptors.response.eject(errorInterceptor);
        };
    }, [api, logout]); // Dependency on api and logout


    const signup = async (userData: UserCreate): Promise<boolean> => {
         setIsLoading(true);
        try {
            await api.post('/admin/create_user', userData);
            toast.success(`User ${userData.username} created successfully! Please log in.`);
            await checkFirstTimeSetup();
            setIsLoading(false);
            return true;
        } catch (error) {
            // Error handled by interceptor
            console.error("Signup failed:", error);
            setIsLoading(false);
            return false;
        }
    };


    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            const isSetupNeeded = await checkFirstTimeSetup();
            if (token && isSetupNeeded === false) {
                await fetchCurrentUser();
            } else if (!token && isSetupNeeded === false) {
                 clearTokenAndUser();
            } else if (token && isSetupNeeded === true) {
                clearTokenAndUser();
            }
            setIsLoading(false);
        };
        initializeAuth();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]); // Rerun only if token changes externally, other fns are stable


    return (
        <AuthContext.Provider value={{ token, user, isFirstTime, isLoading, login, logout, signup, checkFirstTimeSetup, fetchCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};