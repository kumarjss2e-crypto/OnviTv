import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const ChannelCard = ({ channel, onPress, onFavorite, isFavorited, viewMode = 'grid' }) => {
  const imageUri = channel.logo || channel.tvg_logo || null;
  const channelName = channel.name || 'Untitled Channel';

  if (viewMode === 'list') {
    return (
      <TouchableOpacity 
        style={styles.listCard} 
        onPress={() => onPress(channel)}
        activeOpacity={0.7}
      >
        <View style={styles.listImageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.listImage} />
          ) : (
            <View style={[styles.listImage, styles.placeholderImage]}>
              <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
            </View>
          )}
        </View>
        
        <View style={styles.listInfo}>
          <Text style={styles.listChannelName} numberOfLines={1}>
            {channelName}
          </Text>
          {channel.category && (
            <Text style={styles.listCategory} numberOfLines={1}>
              {channel.category}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onFavorite(channel)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? colors.accent.red : colors.text.muted}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // Grid view
  return (
    <TouchableOpacity 
      style={styles.gridCard} 
      onPress={() => onPress(channel)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.channelImage} />
        ) : (
          <View style={[styles.channelImage, styles.placeholderImage]}>
            <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
          </View>
        )}
        
        <TouchableOpacity
          style={styles.gridFavoriteButton}
          onPress={() => onFavorite(channel)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? colors.accent.red : colors.text.primary}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={2}>
          {channelName}
        </Text>
        {channel.category && (
          <Text style={styles.category} numberOfLines={1}>
            {channel.category}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid view styles
  gridCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.neutral.slate700,
    position: 'relative',
  },
  channelImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate700,
  },
  gridFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    padding: 12,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: colors.text.muted,
  },

  // List view styles
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  listImageContainer: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  listInfo: {
    flex: 1,
    marginRight: 12,
  },
  listChannelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  listCategory: {
    fontSize: 13,
    color: colors.text.muted,
  },
  favoriteButton: {
    padding: 8,
  },
});

export default ChannelCard;
