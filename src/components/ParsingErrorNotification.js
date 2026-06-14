/**
 * Parsing Error Notification Component
 * Displays when a playlist fails to parse with helpful guidance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import parsingProgressService from '../services/parsingProgressService';

const ParsingErrorNotification = () => {
  const [error, setError] = useState(null);
  const [slideAnim] = React.useState(new Animated.Value(0));

  useEffect(() => {
    const handleParsingError = ({ playlistId, error }) => {
      setError({
        playlistId,
        message: error?.message || String(error),
      });

      // Auto-dismiss after 8 seconds
      const timeout = setTimeout(() => {
        dismissError();
      }, 8000);

      return () => clearTimeout(timeout);
    };

    parsingProgressService.on('parsingError', handleParsingError);

    return () => {
      parsingProgressService.removeListener('parsingError', handleParsingError);
    };
  }, []);

  const dismissError = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setError(null);
      slideAnim.setValue(0);
    });
  };

  if (!error) return null;

  const isCorsError = error.message?.includes('CORS') || 
                      error.message?.includes('Failed to fetch') ||
                      error.message?.includes('web browser');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons 
            name="alert-circle" 
            size={20} 
            color={colors.error} 
            style={styles.icon}
          />
          <Text style={styles.title}>Playlist Parse Failed</Text>
          <TouchableOpacity onPress={dismissError} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.message}>{error.message}</Text>

        {isCorsError && Platform.OS === 'web' && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>💡 Try these solutions:</Text>
            <Text style={styles.suggestion}>• Use M3U playlists instead of Xtream</Text>
            <Text style={styles.suggestion}>• Download the mobile app (iOS/Android)</Text>
            <Text style={styles.suggestion}>• Enable a CORS browser extension</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 2,
    borderBottomColor: colors.error,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 10 : 5,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  suggestions: {
    backgroundColor: colors.bg,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 3,
    paddingLeft: 4,
  },
});

export default ParsingErrorNotification;
