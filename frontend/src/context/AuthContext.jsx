import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [extraProfile, setExtraProfile] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await API.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            setExtraProfile(res.data.extraProfile);
            setDonorProfile(res.data.donorProfile);
          }
        } catch (err) {
          console.error('Auth verification failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setExtraProfile(res.data.extraProfile);
      setDonorProfile(res.data.donorProfile);
    }
    return res.data;
  };

  const adminLogin = async (email, password) => {
    const res = await API.post('/auth/admin/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const register = async (formData) => {
    const res = await API.post('/auth/register', formData);
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setExtraProfile(res.data.extraProfile);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setExtraProfile(null);
    setDonorProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      extraProfile,
      donorProfile,
      loading,
      login,
      adminLogin,
      register,
      logout,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
