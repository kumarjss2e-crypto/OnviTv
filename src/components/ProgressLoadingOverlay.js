/**
 * Progress Loading Overlay Component
 * Reusable component for displaying ingestion progress
 * Can be overlaid on any content screen
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Progress Loading Overlay
 * Shows ingestion progress with cancel capability
 */
export const ProgressLoadingOverlay = ({
  visible = false,
  progress = 0,
  itemsSaved = 0,
  itemsTotal = 0,
  parsingState = 'idle',
  eta = 0,
  onCancel = null,
}) => {
  const isLoading = visible && parsingState === 'parsing';

  const statusText = useMemo(() => {
    switch (parsingState) {
      case 'parsing':
        return 'Loading content...';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Complete!';
      case 'error':
        return 'Error loading content';
      default:
        return 'Idle';
    }
  }, [parsingState]);

  const progressPercentage = Math.round(progress);

  return (
    <Modal
      visible={isLoading}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.overlay} />
        <View style={styles.contentContainer}>
          {/* Status Text */}
          <Text style={styles.statusText}>{statusText}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercentage}%`,
                },
              ]}
            />
          </View>

          {/* Progress Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Progress</Text>
              <Text style={styles.statValue}>{progressPercentage}%</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Loaded</Text>
              <Text style={styles.statValue}>
                {itemsSaved}/{itemsTotal}
              </Text>
            </View>

            {eta > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{Math.ceil(eta / 1000)}s</Text>
              </View>
            )}
          </View>

          {/* Cancel Button */}
          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="pause" size={20} color={colors.background.primary} />
              <Text style={styles.cancelButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

/**
 * Compact Progress Bar Component
 * Minimal progress indicator for headers/toolbars
 */
export const CompactProgressBar = ({
  visible = false,
  progress = 0,
  parsingState = 'idle',
}) => {
  if (!visible || parsingState !== 'parsing') return null;

  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactBarBackground}>
        <Animated.View
          style={[
            styles.compactBarFill,
            {
              width: `${Math.round(progress)}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.compactText}>{Math.round(progress)}%</Text>
    </View>
  );
};

/**
 * Inline Progress Banner
 * Shows as a banner above content
 */
export const ProgressBanner = ({
  visible = false,
  progress = 0,
  itemsSaved = 0,
  itemsTotal = 0,
  parsingState = 'idle',
  onDismiss = null,
}) => {
  if (!visible || parsingState !== 'parsing') return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerLeft}>
          <Ionicons name="cloud-download" size={20} color={colors.primary} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Loading content</Text>
            <Text style={styles.bannerSubtitle}>
              {itemsSaved}/{itemsTotal} items
            </Text>
          </View>
        </View>

        <View style={styles.bannerRight}>
          <Text style={styles.bannerProgress}>{Math.round(progress)}%</Text>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss}>
              <Ionicons name="close" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bannerProgressBar}>
        <View
          style={[
            styles.bannerProgressFill,
            {
              width: `${Math.round(progress)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Modal Overlay Styles
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  contentContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },

  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },

  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  statsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 8,
  },

  statItem: {
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },

  cancelButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Compact Progress Bar Styles
  compactContainer: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.background.tertiary,
  },

  compactBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },

  compactBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  compactText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 30,
    textAlign: 'right',
  },

  // Banner Styles
  bannerContainer: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    overflow: 'hidden',
  },

  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerTextContainer: {
    marginLeft: 12,
  },

  bannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  bannerSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },

  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  bannerProgress: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },

  bannerProgressBar: {
    height: 3,
    backgroundColor: colors.background.tertiary,
    overflow: 'hidden',
  },

  bannerProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});

export default ProgressLoadingOverlay;
