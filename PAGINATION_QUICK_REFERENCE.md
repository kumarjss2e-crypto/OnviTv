# Pagination Quick Reference

## How It Works

### Loading Pattern
```
Batch 1 (0-50 items)     → Instant display
Batch 2 (51-100 items)   → Loaded when user scrolls to 70% of Batch 1
Batch 3 (101-150 items)  → Loaded when user scrolls to 70% of Batch 2
...continues until all items loaded
```

### Visual Example
```
HOME SCREEN - Movies Section
═════════════════════════════

Movies                          15/250 items
┌──────┬──────┬──────┬──────┐
│  [1] │  [2] │  [3] │  ... │ → User scrolls →  [Load indicator]
└──────┴──────┴──────┴──────┘ Scroll to 70%     "Scroll right to load more
(Items 0-15)                                      (235 remaining)"
                                        ↓
                               Batch 2 loads (items 15-30)
```

## State Management

### categoryPages Object
```javascript
{
  'all-movies': 2,        // Showing 100 items (2 * 50)
  'all-series': 1,        // Showing 50 items (1 * 50)
  'all-channels': 3,      // Showing 150 items (3 * 50)
  'movie-Action': 2,
  'series-Drama': 1,
}
```

### loadingMoreMap Object
```javascript
{
  'all-movies': false,    // Not currently loading
  'all-series': true,     // Currently loading batch
  'all-channels': false,
}
```

## Data Transformation Flow

### Step 1: Fetch All Data (unchanged)
```javascript
const content = {
  channels: [... 5000 items ...],
  movies: [... 15000 items ...],
  series: [... 20000 items ...],
};
```

### Step 2: Filter by Type & Search
```javascript
// For 'movies' view
filteredMovies = [... 15000 items filtered by search ...];
```

### Step 3: Group by Genre
```javascript
moviesByGenre = {
  'Action': [... 2000 items ...],
  'Drama': [... 3000 items ...],
  'Comedy': [... 1500 items ...],
  ...
};
```

### Step 4: Apply Pagination
```javascript
// For 'Action' genre with page 1 (categoryKey: 'movie-Action')
slicedData = moviesByGenre['Action'].slice(0, 50);

// Result in category object:
{
  title: 'Action',
  data: slicedData,           // 0-50 items
  fullData: moviesByGenre['Action'],  // All 2000 items
  categoryKey: 'movie-Action',
  type: 'movie'
}
```

## Component Props at Runtime

### Initial Render
```javascript
categories = [
  {
    title: 'Action',
    data: [item0, item1, ...item49],    // 50 items
    fullData: [item0, item1, ...item1999],  // 2000 items
    categoryKey: 'movie-Action',
    type: 'movie'
  },
  ...
]
```

### After Scrolling to 70% & Loading More
```javascript
// Page incremented from 1 → 2
categoryPages['movie-Action'] = 2;

// On next render, getSlicedCategoryData returns:
categories[0].data = [item0, item1, ...item99];  // 100 items now!
```

## Event Flow Diagram

```
┌─────────────────────────────────────────┐
│     User Opens HomeScreen               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  loading = true                         │
│  CategoryPages = {}                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  loadContentDataDebounced() (500ms)     │
│  ├─ getUserChannels()                   │
│  ├─ getUserMovies()                     │
│  └─ getUserSeries()                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  setAllContent(content)                 │
│  setCategoryPages({}) ← Reset pagination│
│  loading = false                        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  filterContentByType()                  │
│  ├─ filterBySearch()                    │
│  ├─ groupByGenre()                      │
│  ├─ getSlicedCategoryData() ← Paginate! │
│  └─ setFilteredCategories()             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Render Categories (50 items each)      │
│  Show "Load More" indicator             │
└────────────┬────────────────────────────┘
             │
             ▼
       User Scrolls...
             │
             ▼
┌─────────────────────────────────────────┐
│  FlatList.onScroll() triggered          │
│  Calculates scrollPercentage            │
│  IF scrollPercentage > 0.7 THEN         │
│    loadMoreForCategory(key, total)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  loadingMoreMap[key] = true             │
│  Show "Loading..." text                 │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  setTimeout(100ms)                      │
│  ├─ Increment categoryPages[key]        │
│  └─ Reset loadingMoreMap[key] = false   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Re-render with more items              │
│  getSlicedCategoryData() returns 100-150│
│  FlatList updates incrementally         │
└────────────────────────────────────────┘
```

## Scroll Calculation

```javascript
// When user scrolls horizontal FlatList:
contentOffset = current scroll position
layoutWidth = visible area width
contentSize = total scrollable width

scrollPercentage = (contentOffset + layoutWidth) / contentSize

// Example: 300-item list, card width 120px, gap 12px
// Total width = (300 * 120) + (299 * 12) ≈ 40,788px
// After rendering 50 items (~6,600px)
// When scrollPercentage > 0.7 → Load next 50
```

## Memory Comparison

### Without Pagination (40k items)
```
Initial Render: 40,000 items in memory
Tree: All 40k items in FlatList data array
GPU: 40k text nodes, 40k image nodes
RAM: ~200-400 MB
```

### With Pagination (50 items initial + progressive)
```
Initial Render: 50 items in memory
Tree: Only visible + cached items (~80-100)
GPU: ~80-100 text nodes, 80-100 image nodes
RAM: ~5-10 MB
```

## Configuration Quick Reference

```javascript
// Change items per batch
const ITEMS_PER_PAGE = 75;  // More items = more memory, fewer loads

// Change scroll trigger point
const SCROLL_THRESHOLD = 0.6;  // Earlier trigger = more proactive loading

// Change load animation speed
setTimeout(() => { ... }, 150);  // Faster/slower transition
```

## Testing Checklist

- [ ] Load app with 40k+ item playlist
- [ ] Verify initial render shows only 50 items per category
- [ ] Scroll to 70% of any category
- [ ] Confirm "Loading..." indicator appears
- [ ] Verify next 50 items load smoothly
- [ ] Test with search enabled
- [ ] Test switching between content types
- [ ] Monitor memory usage while scrolling
- [ ] Test on slow network (throttle in DevTools)

## Known Limitations & Solutions

| Issue | Solution |
|-------|----------|
| Scroll position resets when data updates | Track scroll position, use `scrollToOffset()` |
| Loading too aggressive | Increase `SCROLL_THRESHOLD` to 0.8 |
| Memory still high with many categories | Implement virtualization with `react-native-super-grid` |
| Batch size too small | Increase `ITEMS_PER_PAGE` to 100 |
