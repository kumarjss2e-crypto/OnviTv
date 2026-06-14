
const generateSimpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const parseExtInf = (line) => {
  const result = {
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle: null,
    name: null
  };

  const lastCommaIndex = line.lastIndexOf(',');
  if (lastCommaIndex > 0) {
    result.name = line.substring(lastCommaIndex + 1).trim();
  }

  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
  if (tvgIdMatch) result.tvgId = tvgIdMatch[1];

  const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
  if (tvgNameMatch) result.tvgName = tvgNameMatch[1];

  const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
  if (tvgLogoMatch) result.tvgLogo = tvgLogoMatch[1];

  const groupTitleMatch = line.match(/group-title="([^"]*)"/);
  if (groupTitleMatch) result.groupTitle = groupTitleMatch[1];

  if (!result.name) {
    result.name = result.tvgName || 'Unknown Channel';
  }

  return result;
};

const detectContentType = (item) => {
  const group = (item.groupTitle || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (group.includes('series') || group.includes('tv show') || name.includes('s0') || name.includes('s1') || name.includes('season')) {
    return 'series';
  }
  if (group.includes('movie') || group.includes('film')) {
    return 'movie';
  }
  return 'channel';
};

export const parseM3UContent = (content) => {
  console.log('[M3UParser] parseM3UContent starting');
  
  const items = [];
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);

  let i = 0;
  if (lines[0]?.startsWith('#EXTM3U')) {
    i = 1;
  }

  while (i < lines.length) {
    if (lines[i].startsWith('#EXTINF:')) {
      const extInf = parseExtInf(lines[i]);
      i++;

      while (i < lines.length && lines[i].startsWith('#')) {
        i++;
      }

      if (i < lines.length && lines[i]) {
        const streamUrl = lines[i].trim();
        
        const item = {
          name: extInf.name || 'Unknown',
          streamUrl: streamUrl,
          url: streamUrl,
          tvgId: extInf.tvgId,
          tvgName: extInf.tvgName || extInf.name,
          tvgLogo: extInf.tvgLogo,
          logo: extInf.tvgLogo,
          groupTitle: extInf.groupTitle || 'Uncategorized',
          contentType: detectContentType(extInf),
          type: detectContentType(extInf)
        };
        
        item.id = `m3u-${generateSimpleHash(streamUrl + item.name)}`;
        items.push(item);
        
        console.log('[M3UParser] Added item:', item.name);
        i++;
      }
    } else {
      i++;
    }
  }

  console.log('[M3UParser] parseM3UContent done, parsed', items.length, 'items');
  return items;
};

export const parseM3U = async (m3uUrl) => {
  try {
    console.log('[M3UParser] parseM3U starting with URL:', m3uUrl);

    const response = await fetch(m3uUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const content = await response.text();
    
    const items = parseM3UContent(content);
    
    console.log('[M3UParser] parseM3U complete, returning', items.length, 'items');
    
    return {
      success: true,
      items: items,
      error: null
    };
  } catch (error) {
    console.error('[M3UParser] parseM3U failed:', error);
    return {
      success: false,
      items: [],
      error: error.message
    };
  }
};

export default {
  parseM3U,
  parseM3UContent
};
