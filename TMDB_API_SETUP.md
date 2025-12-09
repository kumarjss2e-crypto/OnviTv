# TMDb API Setup Guide

## What is TMDb?

The Movie Database (TMDb) is a free, community-built movie and TV database with rich metadata including:
- High-quality posters and backdrops
- Plot summaries and descriptions
- Cast and crew information
- Ratings and reviews
- Release dates and runtime
- Genre information
- Episode details for TV series

## Getting Your Free API Key

### Step 1: Create TMDb Account
1. Go to https://www.themoviedb.org/
2. Click "Join TMDb" in the top right
3. Fill in your details and create account
4. Verify your email address

### Step 2: Request API Key
1. Log in to your TMDb account
2. Go to Settings → API (https://www.themoviedb.org/settings/api)
3. Click "Request an API Key"
4. Choose "Developer" (free option)
5. Fill in the application form:
   - **Application Name**: OnviTV
   - **Application URL**: Your app URL or GitHub repo
   - **Application Summary**: IPTV player with VOD support
6. Accept the terms and submit

### Step 3: Get Your API Key
1. Once approved (usually instant), you'll see your API Key
2. Copy the **API Key (v3 auth)**
3. Keep it secure!

## Adding API Key to Your App

### Option 1: Environment Variable (Recommended)
1. Create `.env` file in project root:
```env
TMDB_API_KEY=your_api_key_here
```

2. Update `metadataService.js`:
```javascript
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';
```

### Option 2: Direct Replacement
1. Open `src/services/metadataService.js`
2. Find line: `const TMDB_API_KEY = 'YOUR_TMDB_API_KEY';`
3. Replace with: `const TMDB_API_KEY = 'your_actual_api_key';`

## API Usage Limits

**Free Tier:**
- ✅ 40 requests per 10 seconds
- ✅ Unlimited total requests
- ✅ All metadata features
- ✅ High-quality images

This is more than enough for your app since we cache results!

## Testing the API

You can test the API directly:

```bash
# Search for a movie
curl "https://api.themoviedb.org/3/search/movie?api_key=YOUR_KEY&query=Inception"

# Search for a TV series
curl "https://api.themoviedb.org/3/search/tv?api_key=YOUR_KEY&query=Breaking+Bad"

# Get movie details
curl "https://api.themoviedb.org/3/movie/27205?api_key=YOUR_KEY"
```

## How It Works in Your App

### 1. Import Phase (M3U/Xtream)
- Store basic info: title, URL, category
- NO metadata fetching during import
- Fast import process

### 2. Display Phase (Screens)
- Fetch rich metadata from TMDb when user views content
- Cache metadata in Firebase for 30 days
- Subsequent views use cached data

### 3. Benefits
- ✅ Rich, accurate metadata
- ✅ High-quality images
- ✅ Fast imports
- ✅ Works with any M3U playlist
- ✅ No manual metadata entry needed

## Alternative APIs (If Needed)

### OMDb API
- URL: http://www.omdbapi.com/
- Free tier: 1,000 requests/day
- Simpler but less data

### TVMaze API
- URL: https://www.tvmaze.com/api
- No API key needed
- Great for TV series

## Troubleshooting

### "Invalid API Key" Error
- Check your API key is correct
- Make sure you're using v3 API key (not v4)
- Verify your account is activated

### "Too Many Requests" Error
- You're hitting rate limit (40/10sec)
- Our caching prevents this
- Wait 10 seconds and retry

### No Results Found
- Check movie/series title spelling
- Try without year parameter
- Some content may not be in TMDb

## Support

- TMDb Forums: https://www.themoviedb.org/talk
- API Docs: https://developers.themoviedb.org/3
- Status: https://status.themoviedb.org/
