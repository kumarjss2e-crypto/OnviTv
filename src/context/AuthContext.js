import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from '../services/authService';
import { getUserProfile } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async () => {
    if (user) {
      const result = await getUserProfile(user.uid);
      if (result.success) {
        setUserProfile(result.data);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const handleAuthStateChange = async (firebaseUser) => {
      try {
        if (!mounted) return;

        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Fetch user profile from Firestore with a small delay
          // to ensure the profile has been created
          timeoutId = setTimeout(async () => {
            if (!mounted) return;
            try {
              const result = await getUserProfile(firebaseUser.uid);
              if (result && result.success && mounted) {
                setUserProfile(result.data);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
            }
          }, 500);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    try {
      console.log('onAuthStateChanged function:', typeof onAuthStateChanged);
      const unsubscribe = onAuthStateChanged(handleAuthStateChange);
      console.log('Auth listener setup successful, unsubscribe type:', typeof unsubscribe);
      
      return () => {
        mounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      console.error('onAuthStateChanged type:', typeof onAuthStateChanged);
      setLoading(false);
      return () => {
        mounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
