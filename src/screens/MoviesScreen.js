import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const MoviesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 Movies & Series</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
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
