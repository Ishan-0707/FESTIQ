import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signupStudent,
  loginStudent,
  fetchCurrentUser,
  updateStudentProfile,
  logoutStudent
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via HTTP-only cookie
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Session restore notice:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const res = await loginStudent({ email, password });
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const signup = async (studentData) => {
    const res = await signupStudent(studentData);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const updateProfile = async (profileData) => {
    const res = await updateStudentProfile(profileData);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await logoutStudent();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    signup,
    logout,
    updateProfile,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

