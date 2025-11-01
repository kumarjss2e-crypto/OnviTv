import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserChannels } from '../services/channelService';
import { getEPGForChannel, getEPGByEpgChannelId } from '../services/epgService';
import { Timestamp } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLOT_MINUTES = 30;
const TOTAL_HOURS = 24; // show 24 hours window
const LEFT_COL_WIDTH = 110;
const SLOT_WIDTH = 140; // width per 30-min slot
const ROW_HEIGHT = 64; // must match styles.channelRow/programRow

const generateTimeSlots = () => {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(Math.floor(start.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES, 0, 0);

  const slots = [];
  const totalSlots = (TOTAL_HOURS * 60) / SLOT_MINUTES;
  for (let i = 0; i <= totalSlots; i++) {
    const d = new Date(start.getTime() + i * SLOT_MINUTES * 60 * 1000);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    slots.push({ key: `${i}`, label: `${hh}:${mm}`, date: d });
  }
  return { start, slots };
};

const minutesBetween = (a, b) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

const EPGScreen = () => {
  const { user } = useAuth();
  const { start, slots } = useMemo(() => generateTimeSlots(), []);
  const [channels, setChannels] = useState([]);
  const [programsByChannel, setProgramsByChannel] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const totalGridWidth = SLOT_WIDTH * ((TOTAL_HOURS * 60) / SLOT_MINUTES);
  const now = new Date();
  const leftListRef = useRef(null);
  const rightListRef = useRef(null);
  const isSyncingRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    let isMounted = true;
    try {
      if (isRefresh) setRefreshing(true);
      if (!user) return;
      setLoading(true);
      // 1) Load user's channels
      const chRes = await getUserChannels(user.uid);
      if (!chRes.success) {
        setChannels([]);
        setProgramsByChannel({});
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const list = (chRes.data || []).slice(0, 50); // allow more rows to test scrolling
      if (!isMounted) return;
      setChannels(list);

      // 2) Compute window [start, end]
      const end = new Date(start.getTime() + TOTAL_HOURS * 60 * 60 * 1000);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      // 3) Fetch EPG per channel (in parallel, capped). Try by channelId; if empty and epgChannelId exists, try fallback.
      const results = await Promise.all(
        list.map(async (ch) => {
          try {
            let items = [];
            const epg = await getEPGForChannel(ch.id, startTs, endTs);
            if (epg.success) items = epg.data || [];
            if ((!items || items.length === 0) && ch.epgChannelId) {
              const epg2 = await getEPGByEpgChannelId(ch.epgChannelId, startTs, endTs);
              if (epg2.success) items = epg2.data || [];
            }
            console.log('EPG fetched', { channelId: ch.id, epgChannelId: ch.epgChannelId, count: items.length });
            return { id: ch.id, items };
          } catch (e) {
            console.log('EPG fetch error', ch.id, e?.message);
            return { id: ch.id, items: [] };
          }
        })
      );
      if (!isMounted) return;
      const map = {};
      results.forEach(({ id, items }) => {
        // normalize field names to match previous renderer
        map[id] = items.map((it, idx) => ({
          id: it.id || `${id}_${idx}`,
          title: it.programTitle || it.title || 'Program',
          start: it.startTime?.toDate ? it.startTime.toDate() : new Date(it.startTime),
          end: it.endTime?.toDate ? it.endTime.toDate() : new Date(it.endTime),
        }));
      });
      setProgramsByChannel(map);
      setLoading(false);
      setRefreshing(false);
    } finally {
      isMounted = false;
    }
  }, [user, start]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EPG</Text>
        <Text style={styles.headerSub}>Now • {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <TouchableOpacity
          onPress={() => loadData(true)}
          style={styles.refreshBtn}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <Text style={styles.refreshText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.gridWrapper}>
        {/* Left column: Channels */}
        <View style={styles.leftCol}>
          <View style={styles.timeHeaderLeft} />
          <FlatList
            ref={leftListRef}
            data={channels}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.channelRow}>
                <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
              </View>
            )}
            nestedScrollEnabled
            initialNumToRender={20}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            onScroll={(e) => {
              if (isSyncingRef.current) return;
              isSyncingRef.current = true;
              const offset = e.nativeEvent.contentOffset.y;
              rightListRef.current?.scrollToOffset({ offset, animated: false });
              isSyncingRef.current = false;
            }}
            scrollEventThrottle={16}
            ListEmptyComponent={!loading ? (
              <View style={[styles.channelRow, { justifyContent: 'center' }]}>
                <Text style={styles.channelName}>No channels</Text>
              </View>
            ) : null}
          />
        </View>

        {/* Right: Time axis + program grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rightArea}>
          <View>
            {/* Time header */}
            <View style={[styles.timeHeader, { width: totalGridWidth }]}> 
              {slots.map((s, idx) => (
                <View key={s.key} style={[styles.timeSlot, { width: SLOT_WIDTH }]}> 
                  <Text style={styles.timeLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Program grid */}
            <FlatList
              ref={rightListRef}
              data={channels}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.programRow, { width: totalGridWidth }]}> 
                  {(programsByChannel[item.id] || []).map((p) => {
                    const startMin = minutesBetween(start, p.start);
                    const durMin = minutesBetween(p.start, p.end);
                    const left = (startMin / SLOT_MINUTES) * SLOT_WIDTH;
                    const width = Math.max(SLOT_WIDTH * (durMin / SLOT_MINUTES), SLOT_WIDTH * 0.5);
                    const isNow = now >= p.start && now < p.end;
                    const totalMs = Math.max(1, p.end.getTime() - p.start.getTime());
                    const progMs = Math.max(0, Math.min(totalMs, now.getTime() - p.start.getTime()));
                    const progPct = Math.max(0, Math.min(1, progMs / totalMs));
                    return (
                      <View key={p.id} style={[styles.programBlock, { left, width }, isNow && styles.programBlockCurrent]}> 
                        <Text style={styles.programTitle} numberOfLines={1}>{p.title}</Text>
                        <Text style={styles.programTime} numberOfLines={1}>
                          {p.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {p.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isNow && (
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${(progPct * 100).toFixed(0)}%` }]} />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
              nestedScrollEnabled
              initialNumToRender={20}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              onScroll={(e) => {
                if (isSyncingRef.current) return;
                isSyncingRef.current = true;
                const offset = e.nativeEvent.contentOffset.y;
                leftListRef.current?.scrollToOffset({ offset, animated: false });
                isSyncingRef.current = false;
              }}
              scrollEventThrottle={16}
              ListEmptyComponent={!loading ? (
                <View style={[styles.programRow, { width: totalGridWidth, justifyContent: 'center' }]}> 
                  <Text style={styles.channelName}>No EPG data</Text>
                </View>
              ) : null}
            />

            
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.neutral.slate900,
    borderBottomColor: colors.neutral.slate800,
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSub: {
    marginTop: 4,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  gridWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  leftCol: {
    width: LEFT_COL_WIDTH,
    backgroundColor: colors.neutral.slate900,
    borderRightColor: colors.neutral.slate800,
    borderRightWidth: 1,
  },
  timeHeaderLeft: {
    height: 36,
    borderBottomColor: colors.neutral.slate800,
    borderBottomWidth: 1,
  },
  channelRow: {
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderBottomColor: colors.neutral.slate800,
    borderBottomWidth: 1,
  },
  channelName: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  rightArea: {
    flex: 1,
  },
  timeHeader: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate900,
    borderBottomColor: colors.neutral.slate800,
    borderBottomWidth: 1,
  },
  timeSlot: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightColor: colors.neutral.slate800,
    borderRightWidth: 1,
  },
  timeLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  programRow: {
    height: 64,
    borderBottomColor: colors.neutral.slate800,
    borderBottomWidth: 1,
  },
  programBlock: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: colors.background.card,
    borderColor: colors.neutral.slate700,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  programTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  programTime: {
    marginTop: 2,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  nowLine: {
    position: 'absolute',
    top: 36,
    bottom: 0,
    width: 2,
    backgroundColor: colors.accent.red,
  },
});

export default EPGScreen;

