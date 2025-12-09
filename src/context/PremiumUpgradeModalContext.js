import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import PremiumUpgradeScreen from '../screens/PremiumUpgradeScreen';

const PremiumUpgradeModalContext = createContext();

export const usePremiumUpgradeModal = () => {
  const context = useContext(PremiumUpgradeModalContext);
  if (!context) {
    throw new Error('usePremiumUpgradeModal must be used within PremiumUpgradeModalProvider');
  }
  return context;
};

export const PremiumUpgradeModalProvider = ({ children }) => {
  console.log('[PremiumUpgradeModalProvider] ✅ PROVIDER INITIALIZED - NEW VERSION RUNNING');
  
  const [isVisible, setIsVisible] = useState(false);
  const [navigation, setNavigation] = useState(null);
  let hasShownOnce = false;

  const showModal = useCallback((nav) => {
    console.log('[PremiumUpgradeModalProvider] showModal called');
    
    // Prevent showing twice in same session
    if (hasShownOnce) {
      console.log('[PremiumUpgradeModalProvider] Already shown once, skipping');
      return;
    }

    console.log('[PremiumUpgradeModalProvider] Showing modal for first time');
    hasShownOnce = true;
    setNavigation(nav);
    setIsVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    console.log('[PremiumUpgradeModalProvider] Closing modal');
    setIsVisible(false);
  }, []);

  const handleClose = () => {
    console.log('[PremiumUpgradeModalProvider] handleClose triggered');
    closeModal();
  };

  return (
    <PremiumUpgradeModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      
      {/* Modal at app level - never unmounts */}
      {isVisible && (
        <Modal
          visible={true}
          transparent={false}
          animationType="slide"
          onRequestClose={handleClose}
          hardwareAccelerated={true}
        >
          <SafeAreaView style={styles.container}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <PremiumUpgradeScreen
              navigation={navigation}
              onSkip={handleClose}
              onUpgrade={handleClose}
              isModal={true}
            />
          </SafeAreaView>
        </Modal>
      )}
    </PremiumUpgradeModalContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
  },
});
