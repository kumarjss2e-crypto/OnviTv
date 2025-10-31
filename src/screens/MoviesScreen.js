import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MoviesScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Ionicons name="film" size={32} color={colors.primary.purple} />
        <Text style={styles.title}>Movies & Series</Text>
      </View>
      <Text style={styles.subtitle}>Coming Soon</Text>
      <Text style={styles.description}>
        Browse and watch movies and TV series from your playlists
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary.purple,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
  },
});

export default MoviesScreen;
