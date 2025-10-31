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
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch user profile from Firestore with a small delay
        // to ensure the profile has been created
        setTimeout(async () => {
          const result = await getUserProfile(firebaseUser.uid);
          if (result.success) {
            setUserProfile(result.data);
          }
        }, 500);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
