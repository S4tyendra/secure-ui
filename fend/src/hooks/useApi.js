import { useState, useCallback, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
let authToken = null; // In-memory token storage

export const setAuthToken = (token) => {
  authToken = token;
  // Optionally persist to localStorage/sessionStorage if needed
  // localStorage.setItem('authToken', token);
};

export const getAuthToken = () => {
  // Optionally retrieve from localStorage/sessionStorage if persisted
  // return authToken || localStorage.getItem('authToken');
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  // Optionally clear from localStorage/sessionStorage
  // localStorage.removeItem('authToken');
};

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Effect to load token from storage on initial load (if implemented)
  // useEffect(() => {
  //   const storedToken = localStorage.getItem('authToken');
  //   if (storedToken) {
  //     authToken = storedToken;
  //   }
  // }, []);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const currentToken = getAuthToken();
    if (currentToken) {
      headers['X-Login'] = currentToken;
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
        throw new Error(errorData.detail?.[0]?.msg || errorData.message || `HTTP error! Status: ${response.status}`);
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
      setError(err.message || 'An unexpected error occurred.');
      throw err; // Re-throw the error so calling component can handle it
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, request, setError };
};

export default useApi;