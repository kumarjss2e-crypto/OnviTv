/**
 * Parsing Progress Modal
 * Shows real-time progress during playlist parsing
 * 
 * Displays:
 * - Parse phase (M3U/Xtream parsing)
 * - Items parsed/saved count
 * - Progress percentage
 * - Batch information for Xtream
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';

const ParsingProgressModal = ({
  visible = false,
  playlistName = 'Playlist',
  progress = {},
}) => {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [visible, animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  // Progress extraction with fallbacks for different service reporting styles
  const {
    phase = 'parsing',
    itemsProcessed = progress.itemsSaved || progress.itemsProcessed || 0,
    totalItems = progress.itemsTotal || progress.totalItems || 0,
    percentComplete = progress.progress || progress.percentComplete || 0,
    currentCategory = progress.currentCategory || '',
    totalCategories = progress.totalCategories || 0,
    batchNumber = progress.batchNumber || progress.batchesProcessed || 0,
    totalBatches = progress.totalBatches || 0,
  } = progress;

  // Calculate percentage if not explicitly provided
  let displayPercent = percentComplete;
  if (displayPercent === 0 && totalItems > 0) {
    displayPercent = Math.round((itemsProcessed / totalItems) * 100);
  }

  // Handle phase specific display
  const hasCategoryProgress = totalCategories > 0;
  const hasItemCounts = totalItems > 0;
  let displayPhaseText = 'Processing Content...';
  
  if (phase === 'fetching_categories') {
    displayPhaseText = 'Fetching Playlist Metadata...';
  } else if (phase === 'saving' || phase === 'parsing') {
    displayPhaseText = `Saving Content... (${itemsProcessed}/${totalItems})`;
  }

  // Use category progress if available and in parsing phase
  if (hasCategoryProgress && (phase === 'parsing' || phase === 'live_channels')) {
    const currentCat = typeof currentCategory === 'number' ? currentCategory : batchNumber;
    displayPercent = totalCategories > 0 
      ? Math.round((currentCat / totalCategories) * 100)
      : displayPercent;
    displayPhaseText = `Processing Categories... (${currentCat}/${totalCategories})`;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.title}>{displayPhaseText}</Text>
          <Text style={styles.subtitle}>{playlistName}</Text>

          {/* Loading spinner */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator
              size="large"
              color={colors.primary.purple}
              style={styles.spinner}
            />
          </View>

          {/* Progress info */}
          <View style={styles.infoContainer}>
            {/* Parsing phase - M3U */}
            {phase === 'parsing' && hasItemCounts && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Items Parsed:</Text>
                  <Text style={styles.infoValue}>{itemsProcessed}</Text>
                </View>
                {totalItems > 0 && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Items:</Text>
                      <Text style={styles.infoValue}>{totalItems}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Progress:</Text>
                      <Text style={styles.infoValue}>{percentComplete}%</Text>
                    </View>
                  </>
                )}
              </>
            )}

            {/* Parsing phase - Xtream */}
            {phase === 'parsing' && hasCategoryProgress && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category:</Text>
                  <Text style={styles.infoValue}>{currentCategory}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Progress:</Text>
                  <Text style={styles.infoValue}>
                    {Math.round((batchNumber / totalCategories) * 100)}%
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Items Found:</Text>
                  <Text style={styles.infoValue}>{itemsProcessed || 0}</Text>
                </View>
              </>
            )}

            {/* Save phase */}
            {phase === 'saving' && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Items Saved:</Text>
                  <Text style={styles.infoValue}>{itemsProcessed || 0}</Text>
                </View>
                {totalItems > 0 && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Items:</Text>
                      <Text style={styles.infoValue}>{totalItems}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Progress:</Text>
                      <Text style={styles.infoValue}>{percentComplete || 0}%</Text>
                    </View>
                  </>
                )}
                {totalBatches > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Batch:</Text>
                    <Text style={styles.infoValue}>
                      {batchNumber} / {totalBatches}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Progress bar */}
          {displayPercent >= 0 && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(displayPercent, 100)}%`,
                  },
                ]}
              />
            </View>
          )}

          {/* Status text */}
          <Animated.View style={{ opacity }}>
            <Text style={styles.statusText}>
              {phase === 'parsing' ? 'Fetching content...' : 'Saving to device...'}
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  spinnerContainer: {
    height: 80,
    justifyContent: 'center',
    marginBottom: 16,
  },
  spinner: {
    alignSelf: 'center',
  },
  infoContainer: {
    width: '100%',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.purple,
    textAlign: 'right',
    flex: 1,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: colors.neutral.slate700,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.purple,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ParsingProgressModal;
