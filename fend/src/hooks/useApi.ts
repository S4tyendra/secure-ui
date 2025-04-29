import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/context/AuthContext'; // Assuming AuthContext definition
import { toast } from 'sonner'; // Use sonner

// Define a basic structure for expected error details
interface ErrorDetail {
    detail?: string | { msg: string }; // FastAPI often uses 'detail', sometimes an object with 'msg'
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const useApi = (): AxiosInstance => {
    const authContext = useContext<AuthContextType | null>(AuthContext);

    const api = axios.create({
        baseURL: API_BASE_URL,
    });

    api.interceptors.request.use(
        (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
            const token = authContext?.token;
            if (token) {
                config.headers['X-Login'] = token;
            }
            return config;
        },
        (error: AxiosError): Promise<AxiosError> => {
            return Promise.reject(error);
        }
    );

    api.interceptors.response.use(
        (response: AxiosResponse) => response, // Explicitly type response
        (error: AxiosError<ErrorDetail>) => { // Type the error data
            const logout = authContext?.logout;
            if (error.response) {
                const { status, data } = error.response;

                if (status === 401) {
                    toast.error('Session expired. Please log in again.');
                    if (logout) {
                        logout();
                    }
                     // Consider redirecting: window.location.href = '/login';
                } else {
                     let message = 'An API error occurred';
                     if (data?.detail) {
                         if (typeof data.detail === 'string') {
                             message = data.detail;
                         } else if (typeof data.detail === 'object' && data.detail.msg) {
                             message = data.detail.msg;
                         }
                     } else if (error.message) {
                          message = error.message;
                     }
                     toast.error(`Error ${status}: ${message}`);
                }
            } else if (error.request) {
                 toast.error('Network error: Could not reach the server.');
            } else {
                 toast.error(`Request setup error: ${error.message}`);
            }
            return Promise.reject(error);
        }
    );

    return api;
};

export default useApi;