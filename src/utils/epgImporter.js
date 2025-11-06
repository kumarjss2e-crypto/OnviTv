import { fetchEPGFromProvider, parseXMLTV, upsertEPGBatch } from '../services/epgService';
import { getUserChannels } from '../services/channelService';
import { Timestamp } from 'firebase/firestore';

/**
 * Import EPG data from XMLTV URL
 * @param {string} xmltvUrl - URL to XMLTV file
 * @param {string} userId - User ID to map channels
 * @returns {Promise<{success: boolean, imported: number, error?: string}>}
 */
export const importEPGFromXMLTV = async (xmltvUrl, userId) => {
  try {
    console.log('📥 Fetching EPG from:', xmltvUrl);
    
    // 1. Fetch XMLTV data
    const xmlText = await fetchEPGFromProvider(xmltvUrl);
    console.log('✅ EPG data fetched');
    
    // 2. Parse XMLTV
    const programs = parseXMLTV(xmlText);
    console.log(`✅ Parsed ${programs.length} programs`);
    
    if (programs.length === 0) {
      return { success: false, imported: 0, error: 'No programs found in XMLTV' };
    }
    
    // 3. Get user's channels to map epgChannelId to channelId
    const channelsResult = await getUserChannels(userId);
    if (!channelsResult.success) {
      console.warn('⚠️ Could not load channels for mapping, proceeding with epgChannelId only');
    }
    
    const channelMap = {};
    if (channelsResult.success) {
      channelsResult.data.forEach(ch => {
        if (ch.epgChannelId) {
          channelMap[ch.epgChannelId] = ch.id;
        }
      });
      console.log(`✅ Mapped ${Object.keys(channelMap).length} channels`);
    }
    
    // 4. Map programs to channels
    const mappedPrograms = programs.map(p => ({
      ...p,
      channelId: channelMap[p.epgChannelId] || null,
    }));
    
    const programsWithChannelId = mappedPrograms.filter(p => p.channelId).length;
    console.log(`✅ ${programsWithChannelId} programs mapped to channels`);
    console.log(`⚠️ ${mappedPrograms.length - programsWithChannelId} programs without channel mapping`);
    
    // 5. Import to Firestore
    console.log('📤 Importing to Firestore...');
    const result = await upsertEPGBatch(mappedPrograms);
    
    if (result.success) {
      console.log(`✅ Successfully imported ${result.written} EPG entries`);
      return { success: true, imported: result.written };
    } else {
      return { success: false, imported: 0, error: 'Failed to write to Firestore' };
    }
  } catch (error) {
    console.error('❌ EPG import error:', error);
    return { success: false, imported: 0, error: error.message };
  }
};

/**
 * Generate sample EPG data for testing (creates 24 hours of programs)
 * @param {Array} channels - Array of channel objects
 * @returns {Array} Array of EPG program objects
 */
export const generateSampleEPG = (channels) => {
  const programs = [];
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const programTemplates = [
    { title: 'Morning News', duration: 60, category: 'News' },
    { title: 'Breakfast Show', duration: 120, category: 'Entertainment' },
    { title: 'Daily Talk', duration: 60, category: 'Talk Show' },
    { title: 'Midday News', duration: 30, category: 'News' },
    { title: 'Afternoon Movie', duration: 120, category: 'Movies' },
    { title: 'Sports Update', duration: 30, category: 'Sports' },
    { title: 'Evening News', duration: 60, category: 'News' },
    { title: 'Prime Time Drama', duration: 60, category: 'Drama' },
    { title: 'Late Night Show', duration: 90, category: 'Entertainment' },
    { title: 'Night News', duration: 30, category: 'News' },
  ];
  
  channels.forEach(channel => {
    let currentTime = new Date(startOfDay);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    let templateIndex = 0;
    
    while (currentTime < endOfDay) {
      const template = programTemplates[templateIndex % programTemplates.length];
      const endTime = new Date(currentTime.getTime() + template.duration * 60 * 1000);
      
      programs.push({
        channelId: channel.id,
        epgChannelId: channel.epgChannelId || `epg-${channel.id}`,
        programTitle: template.title,
        description: `${template.title} - ${channel.name}`,
        startTime: Timestamp.fromDate(currentTime),
        endTime: Timestamp.fromDate(endTime),
        duration: template.duration * 60,
        category: template.category,
        icon: '',
        rating: '',
        isCatchupAvailable: false,
      });
      
      currentTime = endTime;
      templateIndex++;
    }
  });
  
  return programs;
};

/**
 * Import sample EPG data for testing
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, imported: number}>}
 */
export const importSampleEPG = async (userId) => {
  try {
    console.log('📥 Generating sample EPG data...');
    
    // Get user's channels
    const channelsResult = await getUserChannels(userId);
    if (!channelsResult.success || channelsResult.data.length === 0) {
      return { success: false, imported: 0, error: 'No channels found' };
    }
    
    const channels = channelsResult.data.slice(0, 50); // Limit to 50 channels
    console.log(`✅ Found ${channels.length} channels`);
    
    // Generate sample programs
    const programs = generateSampleEPG(channels);
    console.log(`✅ Generated ${programs.length} sample programs`);
    
    // Import to Firestore
    console.log('📤 Importing to Firestore...');
    const result = await upsertEPGBatch(programs);
    
    if (result.success) {
      console.log(`✅ Successfully imported ${result.written} sample EPG entries`);
      return { success: true, imported: result.written };
    } else {
      return { success: false, imported: 0, error: 'Failed to write to Firestore' };
    }
  } catch (error) {
    console.error('❌ Sample EPG import error:', error);
    return { success: false, imported: 0, error: error.message };
  }
};

/**
 * Clear all EPG data (use with caution!)
 * @returns {Promise<{success: boolean, deleted: number}>}
 */
export const clearAllEPG = async () => {
  try {
    const { clearOldEPG } = await import('../services/epgService');
    // Clear EPG older than 0 days (all EPG)
    const result = await clearOldEPG(0);
    console.log(`✅ Cleared ${result.deleted} EPG entries`);
    return result;
  } catch (error) {
    console.error('❌ EPG clear error:', error);
    return { success: false, deleted: 0, error: error.message };
  }
};

export default {
  importEPGFromXMLTV,
  generateSampleEPG,
  importSampleEPG,
  clearAllEPG,
};
