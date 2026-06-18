import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  // Bypass localtunnel warning page
  axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      // Temporarily disabled auto-login so the app starts on the login page
      /*
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      */
    } catch (e) {
      console.log('Error loading auth data', e);
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = res.data;
      
      setToken(token);
      setUser(user);
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      return true;
    } catch (e) {
      console.error('Login error', e);
      throw e;
    }
  };

  const register = async (name, email, password) => {
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password });
      return await login(email, password); // Auto login after register
    } catch (e) {
      console.error('Register error', e);
      throw e;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
