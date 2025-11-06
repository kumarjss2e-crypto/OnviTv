import { firestore } from '../config/firebase';
import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';

// Download EPG feed (XMLTV or JSON) with retry logic. Returns raw string for XML, JSON object for JSON.
export const fetchEPGFromProvider = async (url, retries = 3, timeout = 30000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching EPG (attempt ${attempt}/${retries}):`, url);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
          'User-Agent': 'OnviTV/1.0',
        },
      });
      
      clearTimeout(timeoutId);
      
      // Check if response status is valid
      if (res.status === 0) {
        throw new Error('Network request failed. Please check your internet connection.');
      }
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await res.json();
        console.log('✅ EPG JSON fetched successfully');
        return data;
      }
      
      const text = await res.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Received empty EPG data from server');
      }
      
      console.log('✅ EPG XMLTV fetched successfully');
      return text;
      
    } catch (error) {
      lastError = error;
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        console.error(`Attempt ${attempt} timed out after ${timeout}ms`);
        lastError = new Error(`Request timed out after ${timeout / 1000} seconds. The EPG server may be slow or unreachable.`);
      } else if (error.message.includes('Network request failed')) {
        console.error(`Attempt ${attempt} failed: Network error`);
      } else {
        console.error(`Attempt ${attempt} failed:`, error.message);
      }
      
      // Don't retry on certain errors
      if (error.message.includes('404') || error.message.includes('403') || error.message.includes('401')) {
        console.error('Server error - not retrying');
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  console.error('❌ All EPG fetch attempts failed');
  throw new Error(
    lastError?.message || 'Failed to fetch EPG data after multiple attempts. Please check the URL and your internet connection.'
  );
};

// Parse XMLTV content to normalized program objects
export const parseXMLTV = (xmlText) => {
  const parser = new XmldomParser();
  const docNode = parser.parseFromString(xmlText, 'text/xml');
  const programmes = Array.from(docNode.getElementsByTagName('programme'));

  const toTs = (val) => {
    // XMLTV time format example: 20240101T120000Z or 20240101120000 +0000
    if (!val) return null;
    const cleaned = val.replace(/\s/g, '').replace(/([\+\-]\d{4})$/, 'Z');
    const isoLike = cleaned
      .replace(/^(\d{4})(\d{2})(\d{2})[T ]?(\d{2})(\d{2})(\d{2})?/, (m, y, mo, d, h, mi, s='00') =>
        `${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    const d = new Date(isoLike);
    return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  };

  const textContent = (el, tag) => {
    const node = el.getElementsByTagName(tag)[0];
    return node && node.textContent ? node.textContent.trim() : '';
  };

  return programmes.map((p) => {
    const channelIdAttr = p.getAttribute('channel') || '';
    const startAttr = p.getAttribute('start') || '';
    const endAttr = p.getAttribute('stop') || '';

    const title = textContent(p, 'title');
    const desc = textContent(p, 'desc');
    const category = textContent(p, 'category');

    const iconEl = p.getElementsByTagName('icon')[0];
    const icon = iconEl ? (iconEl.getAttribute('src') || '') : '';

    const startTime = toTs(startAttr);
    const endTime = toTs(endAttr);

    let duration = null;
    if (startTime && endTime) {
      duration = endTime.seconds - startTime.seconds;
      if (duration < 0) duration = null;
    }

    return {
      channelId: null, // to be mapped using epgChannelId -> channels collection
      epgChannelId: channelIdAttr || null,
      programTitle: title || '',
      description: desc || '',
      startTime,
      endTime,
      duration,
      category: category || '',
      icon: icon || '',
      rating: '',
      isCatchupAvailable: false,
    };
  }).filter(p => p.startTime && p.endTime);
};

// Upsert EPG items in batches. If channelId is not provided, items can still be stored using epgChannelId.
export const upsertEPGBatch = async (programs, batchSize = 400) => {
  if (!Array.isArray(programs) || programs.length === 0) return { success: true, written: 0 };
  const epgCol = collection(firestore, 'epg');
  let written = 0;

  for (let i = 0; i < programs.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const slice = programs.slice(i, i + batchSize);

    slice.forEach((item) => {
      // Create deterministic doc id to avoid duplicates: epgChannelId|channelId|start
      const keyChannel = (item.channelId || '') + '|' + (item.epgChannelId || '');
      const keyStart = item.startTime instanceof Timestamp ? item.startTime.seconds : Math.floor((item.startTime?.toDate?.() || new Date()).getTime()/1000);
      const docId = `${keyChannel}|${keyStart}`;

      const ref = doc(epgCol, docId);
      batch.set(ref, {
        ...item,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    written += slice.length;
  }

  return { success: true, written };
};

// Get EPG for a channel within a time window
export const getEPGForChannel = async (channelId, startTs, endTs) => {
  const epgCol = collection(firestore, 'epg');
  const q = query(
    epgCol,
    where('channelId', '==', channelId),
    where('startTime', '>=', startTs),
    where('startTime', '<', endTs),
    orderBy('startTime', 'asc'),
  );
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return { success: true, data: items };
};

// Get EPG by epgChannelId within a time window (fallback when channelId isn't set)
export const getEPGByEpgChannelId = async (epgChannelId, startTs, endTs) => {
  const epgCol = collection(firestore, 'epg');
  const q = query(
    epgCol,
    where('epgChannelId', '==', epgChannelId),
    where('startTime', '>=', startTs),
    where('startTime', '<', endTs),
    orderBy('startTime', 'asc'),
  );
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return { success: true, data: items };
};

// Cleanup old EPG entries where endTime is older than cutoff
export const clearOldEPG = async (olderThanDays = 7) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffTs = Timestamp.fromDate(cutoff);

  const epgCol = collection(firestore, 'epg');
  const q = query(epgCol, where('endTime', '<=', cutoffTs));
  const snap = await getDocs(q);

  if (snap.empty) return { success: true, deleted: 0 };

  let deleted = 0;
  const batch = writeBatch(firestore);
  snap.forEach((d) => {
    batch.delete(d.ref);
    deleted += 1;
  });
  await batch.commit();
  return { success: true, deleted };
};

export default {
  fetchEPGFromProvider,
  parseXMLTV,
  upsertEPGBatch,
  getEPGForChannel,
  clearOldEPG,
};
