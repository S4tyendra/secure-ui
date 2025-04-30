import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
// Use localStorage for token storage
const AUTH_TOKEN_KEY = 'authToken';

// Helper function to set item in localStorage
const setLocalStorageItem = (key, value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

// Helper function to get item from localStorage
const getLocalStorageItem = (key) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

// Helper function to remove item from localStorage
const removeLocalStorageItem = (key) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};


export const setAuthToken = (token) => {
  if (token) {
    setLocalStorageItem(AUTH_TOKEN_KEY, token); // Set localStorage item
  } else {
    removeLocalStorageItem(AUTH_TOKEN_KEY); // Remove localStorage item if token is null/undefined
  }
};

export const getAuthToken = () => {
  return getLocalStorageItem(AUTH_TOKEN_KEY); // Get localStorage item
};

export const clearAuthToken = () => {
  removeLocalStorageItem(AUTH_TOKEN_KEY); // Remove localStorage item
};

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const currentToken = getAuthToken(); // Now reads from localStorage
    console.log("Current Token:", currentToken);
    if (currentToken) {
      // Send token in x-login header
      headers['x-login'] = currentToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData;
        try {
            // Try to parse JSON error response from backend
            errorData = await response.json();
        } catch (parseError) {
            // If parsing fails, use status text
             errorData = { message: response.statusText || `HTTP error! Status: ${response.status}` };
        }
         console.error("API Error Response:", errorData);
        // Use optional chaining and provide a default message
        const detailMsg = errorData.detail?.[0]?.msg;
        const message = errorData.message;
        const defaultMsg = `HTTP error! Status: ${response.status}`;
        throw new Error(detailMsg || message || defaultMsg);
      }

      // Handle responses with no content (e.g., 204 No Content)
       if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null; // Or return an empty object/true depending on context
       }

      // Handle text responses (like logs)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/plain')) {
          return await response.text();
      }

      // Default to JSON parsing
      return await response.json();

    } catch (err) {
      console.error('API Request Failed:', err);
      // Ensure err.message exists, provide a fallback
      setError(err.message || 'An unexpected error occurred.');
      throw err; // Re-throw the error so calling component can handle it
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies remain the same

  return { loading, error, request, setError };
};

export default useApi;