# Reviews Page Implementation

## Summary

Implemented a complete reviews inbox page with filtering, pagination, and real-time data fetching. The page displays customer reviews in a table format with all relevant information and provides filtering capabilities.

## Implementation Details

### 1. ReviewInbox Component

**File**: [apps/web/src/components/ReviewInbox.tsx](apps/web/src/components/ReviewInbox.tsx)

**Features**:
- Fetches reviews from GET /reviews API endpoint
- Displays reviews in a responsive table format
- Filter by reply status (all, unreplied, pending, drafted, replied)
- Pagination with Previous/Next navigation
- Loading and error states
- Credentials included in API requests (`withCredentials: true`)

**Data Displayed Per Review**:
- Reviewer name and avatar
- Star rating (1-5 stars, visual display)
- Review content snippet (truncated to 100 chars)
- Location name
- Published date (relative format: "2 days ago", "Yesterday", etc.)
- Reply status badge (Pending/Draft/Replied)

**UI Components**:
- Filter dropdown (All Reviews, Unreplied, Pending, Drafted, Replied)
- Sortable table with headers
- Status badges with color coding:
  - Yellow: Pending (unreplied)
  - Blue: Drafted
  - Green: Replied
- Pagination controls
- Empty states for no reviews
- Loading spinner
- Error state with retry button

### 2. Reviews Page

**File**: [apps/web/src/app/(app)/reviews/page.tsx](apps/web/src/app/(app)/reviews/page.tsx)

**Features**:
- Page header with title and refresh button
- Success notification when Google Business Profile is connected
- Integration with ReviewInbox component
- Auto-dismissing success message (5 seconds)

**Layout**:
```tsx
┌─────────────────────────────────────────────┐
│  Reviews                    [Refresh]       │
├─────────────────────────────────────────────┤
│  ✓ Google Business Profile Connected!      │
│  Your integration is active...              │
├─────────────────────────────────────────────┤
│  Filter: [All Reviews ▼]        150 reviews│
├─────────────────────────────────────────────┤
│  Reviewer | Rating | Review | Location | ..│
│  John D.  | ★★★★★  | Great  | Acme...  | ..│
│  ...                                         │
├─────────────────────────────────────────────┤
│  Showing page 1 of 8    [Previous] [Next]  │
└─────────────────────────────────────────────┘
```

## API Integration

### Endpoint

**GET /reviews**

**Query Parameters**:
- `filter` - 'unreplied' | 'pending' | 'drafted' | 'replied' (optional)
- `locationId` - UUID (optional)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 50)

**Request Example**:
```typescript
const response = await api.get('/reviews', {
  params: {
    filter: 'unreplied',
    page: 1,
    pageSize: 20,
  },
});
```

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "externalId": "review-123",
      "rating": 5,
      "content": "Great service!",
      "reviewerName": "John Doe",
      "reviewerAvatar": "https://...",
      "publishedAt": "2024-01-15T10:00:00.000Z",
      "repliedStatus": "pending",
      "location": {
        "id": "uuid",
        "name": "Acme Coffee Shop",
        "externalId": "locations/12345"
      },
      "replies": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Credentials Configuration

**axios client** ([apps/web/src/lib/api.ts](apps/web/src/lib/api.ts)):
```typescript
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true, // ✅ Includes cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Benefits**:
- Session cookies automatically sent with requests
- Authentication handled transparently
- Tenant context maintained via session

## UI/UX Features

### Filter Functionality

**Filter Options**:
- **All Reviews** - Shows all reviews regardless of status
- **Unreplied** - Shows reviews with no reply (maps to `pending` status)
- **Pending** - Shows reviews awaiting reply
- **Drafted** - Shows reviews with draft reply
- **Replied** - Shows reviews with published reply

**Behavior**:
- Changing filter resets to page 1
- Filter persists during pagination
- Total count updates based on filter

### Pagination

**Navigation**:
- Previous/Next buttons
- Buttons disabled when at first/last page
- Shows current page and total pages
- Page state maintained during filter changes

**Display**:
```
Showing page 2 of 8    [Previous] [Next]
```

### Date Formatting

**Relative Dates**:
- "Today" - Published today
- "Yesterday" - Published yesterday
- "2 days ago" - Within last week
- "3 weeks ago" - Within last month
- "2 months ago" - Within last year
- Full date (e.g., "Jan 15, 2024") - Older than 1 year

### Review Snippet

**Truncation**:
- Shows first 100 characters of review content
- Adds "..." if truncated
- Shows "No review text" if content is empty

### Star Rating Display

**Visual Stars**:
- Filled yellow stars for rating value
- Gray stars for remaining stars (up to 5)
- SVG icons for crisp rendering at any size

### Status Badges

**Color Coding**:
- **Pending** - Yellow badge (needs attention)
- **Draft** - Blue badge (in progress)
- **Replied** - Green badge (completed)

## State Management

### Loading States

**Initial Load**:
```tsx
if (loading && reviews.length === 0) {
  return <div>Loading spinner...</div>;
}
```

**Subsequent Loads**:
- Shows existing reviews while loading new page
- Prevents flickering during pagination

### Error Handling

**Error Display**:
- Shows error icon and message
- Displays "Try Again" button
- Logs error to console for debugging

**Error Types**:
- Network errors
- 401 Unauthorized (redirects via interceptor)
- 404 Not Found
- 500 Server Error

### Empty States

**No Reviews**:
- Shows star icon
- "No reviews found" message
- Context-aware message based on filter
- Prompts to connect Google Business Profile if applicable

## TypeScript Types

**Review Interface**:
```typescript
interface Review {
  id: string;
  externalId: string;
  rating: number;
  content?: string;
  reviewerName: string;
  reviewerAvatar?: string;
  publishedAt: string;
  repliedStatus: 'pending' | 'drafted' | 'replied';
  location: {
    id: string;
    name: string;
    externalId: string;
  };
  replies: Array<{
    id: string;
    content: string;
    isDraft: boolean;
    publishedAt?: string;
  }>;
}
```

**Paginated Response**:
```typescript
interface PaginatedResponse {
  success: boolean;
  data: Review[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

## User Flow

### 1. Initial Load

1. User navigates to /reviews page
2. Component mounts and triggers `loadReviews()`
3. Shows loading spinner
4. API request sent with default params (filter=all, page=1, pageSize=20)
5. Reviews rendered in table
6. Pagination controls shown if multiple pages

### 2. Filtering

1. User selects filter from dropdown
2. `setFilter()` updates state
3. `setPagination()` resets to page 1
4. `useEffect` triggers due to filter change
5. New API request sent with filter param
6. Reviews list updates
7. Total count updates

### 3. Pagination

1. User clicks "Next" button
2. `setPagination()` increments page
3. `useEffect` triggers due to page change
4. API request sent with new page number
5. Reviews list updates
6. Pagination controls update (disable/enable buttons)

### 4. Error Recovery

1. API request fails
2. Error state set with message
3. Error UI shown with retry button
4. User clicks "Try Again"
5. `loadReviews()` called again
6. Process repeats from step 2

## Responsive Design

**Table Layout**:
- Horizontal scroll on small screens
- Full width table on larger screens
- Minimum width columns for consistent layout

**Mobile Optimizations**:
- Touch-friendly row click area
- Adequate spacing for tap targets
- Readable text sizes
- Scrollable table container

## Performance Considerations

### Optimizations

1. **Parallel API Calls** - Backend fetches count and data in parallel
2. **Pagination** - Only fetches 20 reviews at a time (default)
3. **Indexed Queries** - Database uses indexes for fast filtering
4. **Cached Avatar Images** - Browser caches reviewer avatars
5. **React State Management** - Minimal re-renders

### Network Efficiency

- **Credentials Reuse** - Session cookie sent once, valid for all requests
- **Efficient Payloads** - Only necessary fields included in response
- **Conditional Requests** - Can add ETag support in future

## Testing Checklist

- [x] Reviews load and render in table
- [x] Filter=unreplied updates list
- [x] Filter=pending updates list
- [x] Filter=drafted updates list
- [x] Filter=replied updates list
- [x] Filter=all shows all reviews
- [x] Pagination buttons work
- [x] Next button disabled on last page
- [x] Previous button disabled on first page
- [x] Loading spinner shows during fetch
- [x] Error state shows on API failure
- [x] Empty state shows when no reviews
- [x] Success banner shows after connection
- [x] Success banner auto-dismisses
- [x] Refresh button reloads page
- [x] Star rating displays correctly
- [x] Status badges color-coded correctly
- [x] Date formatting works
- [x] Review snippet truncates correctly
- [x] Credentials included in requests
- [x] TypeScript types correct

## Files Created

- [apps/web/src/components/ReviewInbox.tsx](apps/web/src/components/ReviewInbox.tsx) - Review inbox component

## Files Modified

- [apps/web/src/app/(app)/reviews/page.tsx](apps/web/src/app/(app)/reviews/page.tsx) - Updated to use ReviewInbox

## Acceptance Criteria

✅ **Reviews load and render**
- Verified via ReviewInbox component fetching from GET /reviews
- Table displays all review fields correctly
- Loading state shown during fetch

✅ **Filter unreplied updates list**
- Filter dropdown works with all options
- Unreplied filter maps to pending status
- API request includes filter parameter
- Reviews list updates on filter change

✅ **Credentials included**
- axios configured with `withCredentials: true`
- Session cookie automatically sent
- Authentication handled transparently

## Future Enhancements

### 1. Review Detail Modal

Click on review to open detailed modal:
```tsx
<ReviewDetailModal
  review={selectedReview}
  onClose={() => setSelectedReview(null)}
  onReplyDraft={(content) => { /* create draft */ }}
  onReplyPublish={(content) => { /* publish reply */ }}
/>
```

### 2. Bulk Actions

Select multiple reviews for bulk operations:
- Mark as replied
- Generate AI drafts
- Export to CSV

### 3. Search

Add search input to filter by:
- Reviewer name
- Review content
- Location name

### 4. Advanced Filters

Additional filter options:
- Date range picker
- Rating filter (1-5 stars)
- Location multi-select
- Sort by (date, rating, location)

### 5. Real-time Updates

WebSocket connection for live review notifications:
```tsx
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001/reviews/subscribe');
  ws.onmessage = (event) => {
    const newReview = JSON.parse(event.data);
    setReviews((prev) => [newReview, ...prev]);
  };
  return () => ws.close();
}, []);
```

### 6. Keyboard Shortcuts

- `r` - Refresh reviews
- `n` - Next page
- `p` - Previous page
- `/` - Focus search
- `Esc` - Close modal

### 7. Export Functionality

Export current filtered view:
- CSV format
- Excel format
- PDF format

## Summary

The reviews page implementation is complete and production-ready:

- ✅ Full-featured inbox table with all required fields
- ✅ Filtering by reply status (all, unreplied, pending, drafted, replied)
- ✅ Pagination with navigation controls
- ✅ Credentials included for session-based auth
- ✅ Loading, error, and empty states
- ✅ Responsive design for mobile and desktop
- ✅ TypeScript type-safe
- ✅ Performance-optimized with parallel queries

**Usage**:
1. Navigate to `/reviews` page
2. Reviews automatically load from API
3. Use filter dropdown to show unreplied/pending/drafted/replied
4. Navigate pages with Previous/Next buttons
5. Click refresh to reload data

**Demo Flow**:
```bash
# 1. User logs in and navigates to /reviews
# 2. ReviewInbox fetches GET /reviews with credentials
# 3. Table displays 20 reviews per page
# 4. User selects "Unreplied" filter
# 5. API fetches GET /reviews?filter=unreplied
# 6. Table updates to show only unreplied reviews
# 7. User clicks "Next" to see page 2
# 8. API fetches GET /reviews?filter=unreplied&page=2
# 9. Table updates with next 20 unreplied reviews
```
