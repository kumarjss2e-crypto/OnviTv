import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserMovies, getRecentMovies } from '../services/movieService';
import { getUserSeries, getRecentSeries } from '../services/seriesService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 12 * 2) / 3; // 3 columns, 16px padding, 12px gap
const CARD_H = CARD_W * 1.5;

const TABS = ['Movies', 'Series', 'Downloads'];
const SORTS = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'az', label: 'A → Z' },
  { key: 'year', label: 'Year' },
  { key: 'rating', label: 'Rating' },
];

const getTitle = (item) => item.title || item.name || item.metadata?.name || 'Untitled';
const getPoster = (item) => item.poster || item.logo || item.metadata?.poster || null;
const getYear = (item) => item.year || item.metadata?.year || null;
const getRating = (item) => item.rating || item.metadata?.rating || null;
const getCategory = (item) => item.category || item.metadata?.genre || 'Uncategorized';

const MoviesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('Movies');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recent');
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState([]);

  // Load data when user or tab changes
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (tab === 'Movies') {
          const res = await getUserMovies(user.uid);
          console.log(`[MoviesScreen] Movies loaded:`, { success: res.success, count: res.data?.length || 0 });
          if (res.data && res.data.length > 0) {
            console.log('[MoviesScreen] Sample movie:', res.data[0]);
          }
          setItems(res.success ? res.data || [] : []);
        } else if (tab === 'Series') {
          const res = await getUserSeries(user.uid);
          console.log(`[MoviesScreen] Series loaded:`, { success: res.success, count: res.data?.length || 0 });
          if (res.data && res.data.length > 0) {
            console.log('[MoviesScreen] Sample series:', res.data[0]);
          }
          setItems(res.success ? res.data || [] : []);
        } else {
          // Downloads placeholder: filter from movies/series with downloaded flag if available
          const [mRes, sRes] = await Promise.all([
            getUserMovies(user.uid),
            getUserSeries(user.uid),
          ]);
          const all = [
            ...(mRes.success ? mRes.data || [] : []),
            ...(sRes.success ? sRes.data || [] : []),
          ];
          const downloaded = all.filter((x) => !!x.isDownloaded);
          console.log(`[MoviesScreen] Downloads filtered:`, { total: all.length, downloaded: downloaded.length });
          setItems(downloaded);
        }
      } catch (e) {
        console.error('[MoviesScreen] Load error:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, tab]);

  // Build categories from loaded items
  const categories = useMemo(() => {
    const set = new Set();
    (items || []).forEach((it) => set.add(getCategory(it)));
    return ['All', ...Array.from(set)];
  }, [items]);

  // Apply search, category, sort
  const filtered = useMemo(() => {
    let list = [...(items || [])];
    if (category !== 'All') list = list.filter((it) => getCategory(it) === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((it) => getTitle(it).toLowerCase().includes(q));
    }
    switch (sortKey) {
      case 'az':
        list.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
        break;
      case 'year':
        list.sort((a, b) => (getYear(b) || 0) - (getYear(a) || 0));
        break;
      case 'rating':
        list.sort((a, b) => (getRating(b) || 0) - (getRating(a) || 0));
        break;
      case 'recent':
      default:
        list.sort((a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0));
        break;
    }
    return list;
  }, [items, search, category, sortKey]);

  const renderCard = ({ item }) => {
    const poster = getPoster(item);
    const title = getTitle(item);
    const yr = getYear(item);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => console.log('Open details', title)}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={28} color={colors.text.muted} />
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.cardMeta}>
          {yr ? <Text style={styles.cardMetaText}>{yr}</Text> : null}
          {getRating(item) ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FACC15" />
              <Text style={styles.ratingText}>{getRating(item)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Library</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${tab.toLowerCase()}...`}
            placeholderTextColor={colors.text.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortsWrapRow}>
        {SORTS.map((s) => (
          <TouchableOpacity key={s.key} style={[styles.sortChip, sortKey === s.key && styles.sortChipActive]} onPress={() => setSortKey(s.key)}>
            <Text style={[styles.sortChipText, sortKey === s.key && styles.sortChipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categories */}
      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {categories.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.catChip, category === c && styles.catChipActive]}>
              <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary.purple} />
          <Text style={styles.loadingText}>Loading {tab.toLowerCase()}...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="film-outline" size={56} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>No {tab}</Text>
              <Text style={styles.emptyDesc}>
                {search || category !== 'All'
                  ? 'Try a different search or category'
                  : 'Add a playlist to start watching movies and series'}
              </Text>
              {!search && category === 'All' && (
                <TouchableOpacity
                  style={styles.addPlaylistBtn}
                  onPress={() => navigation.navigate('AddPlaylist')}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.text.primary} />
                  <Text style={styles.addPlaylistText}>Add Playlist</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.neutral.slate900,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRight: {
    width: 36,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.neutral.slate800,
  },
  tabBtnActive: {
    backgroundColor: colors.primary.purple,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
  },
  sortsWrapRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 8,
    marginBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortChipActive: {
    backgroundColor: colors.primary.purple,
  },
  sortChipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: colors.text.primary,
  },
  catRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catChipActive: {
    backgroundColor: colors.primary.purple,
  },
  catChipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: colors.text.primary,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_W,
    marginRight: 0,
  },
  poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.neutral.slate800,
  },
  posterImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 8,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  cardMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    color: colors.text.muted,
    fontSize: 11,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.secondary,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyDesc: {
    color: colors.text.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  addPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  addPlaylistText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default MoviesScreen;
