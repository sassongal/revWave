# Tag Management API Guide

This guide documents the tag management system for revWave. Tags are physical NFC cards/stickers that customers can tap to quickly access review pages.

## Overview

### Features
- **Human-safe public codes**: Generated server-side using memorable 3-word combinations (e.g., `cat-dog-sun`)
- **Tenant scoping**: All tags are isolated by tenant
- **Status management**: Tags can be `active`, `disabled`, or `lost`
- **Location assignment**: Tags can be optionally assigned to specific locations
- **Tap tracking**: TapEvents record every time a tag is scanned

### Models

#### Tag
```typescript
{
  id: string;              // UUID
  publicCode: string;      // Unique human-safe code (e.g., "cat-dog-sun")
  name?: string;           // Optional internal label
  status: string;          // "active" | "disabled" | "lost"
  locationId?: string;     // Optional location assignment
  tenantId: string;        // Tenant ownership
  createdAt: Date;
  updatedAt: Date;
}
```

#### TapEvent
```typescript
{
  id: string;
  tagId: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: object;
  tappedAt: Date;
}
```

## API Endpoints

### 1. List All Tags

**GET /tags**

List all tags for the authenticated tenant.

**Request:**
```bash
curl http://localhost:3001/tags \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "publicCode": "cat-dog-sun",
      "name": "Front Desk Tag",
      "status": "active",
      "locationId": "location-uuid",
      "tenantId": "tenant-uuid",
      "createdAt": "2026-01-12T...",
      "updatedAt": "2026-01-12T...",
      "location": {
        "id": "location-uuid",
        "name": "Main Office"
      },
      "_count": {
        "tapEvents": 42
      }
    }
  ]
}
```

**Fields:**
- `publicCode`: The code used in `/t/{code}` redirect URLs
- `name`: Optional human-readable label for internal use
- `status`: Current status (`active`, `disabled`, `lost`)
- `location`: Associated location details (if assigned)
- `_count.tapEvents`: Total number of taps for this tag

---

### 2. Get Single Tag

**GET /tags/:id**

Get details for a specific tag.

**Request:**
```bash
curl http://localhost:3001/tags/TAG_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "publicCode": "fox-sky-web",
    "name": "Reception Area",
    "status": "active",
    "locationId": "location-uuid",
    "tenantId": "tenant-uuid",
    "createdAt": "2026-01-12T...",
    "updatedAt": "2026-01-12T...",
    "location": {
      "id": "location-uuid",
      "name": "Downtown Branch"
    },
    "_count": {
      "tapEvents": 15
    }
  }
}
```

---

### 3. Create Tag

**POST /tags**

Create a new tag. The `publicCode` is automatically generated server-side.

**Request Body:**
```json
{
  "name": "VIP Lounge Tag",
  "locationId": "location-uuid"  // Optional
}
```

**Both fields are optional:**
- `name`: Internal label (optional)
- `locationId`: Associate with a location (optional)

**Request:**
```bash
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP Lounge Tag",
    "locationId": "location-uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Tag created successfully",
  "data": {
    "id": "new-tag-uuid",
    "publicCode": "owl-pen-day",
    "name": "VIP Lounge Tag",
    "status": "active",
    "locationId": "location-uuid",
    "tenantId": "tenant-uuid",
    "createdAt": "2026-01-12T...",
    "updatedAt": "2026-01-12T...",
    "location": {
      "id": "location-uuid",
      "name": "Main Office"
    }
  }
}
```

**Notes:**
- `publicCode` is auto-generated using human-safe words
- Default `status` is `active`
- If `locationId` is provided, it must belong to your tenant

---

### 4. Update Tag

**PATCH /tags/:id**

Update tag details: assign/reassign location, change status, or update name.

**Request Body (all fields optional):**
```json
{
  "name": "New Label",
  "locationId": "different-location-uuid",
  "status": "disabled"
}
```

**Valid status values:**
- `active`: Tag is active and working
- `disabled`: Tag is temporarily disabled
- `lost`: Tag has been lost or stolen

**Request:**
```bash
curl -X PATCH http://localhost:3001/tags/TAG_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "disabled",
    "name": "Old Front Desk (Deactivated)"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Tag updated successfully",
  "data": {
    "id": "tag-uuid",
    "publicCode": "cat-dog-sun",
    "name": "Old Front Desk (Deactivated)",
    "status": "disabled",
    "locationId": "location-uuid",
    "tenantId": "tenant-uuid",
    "createdAt": "2026-01-12T...",
    "updatedAt": "2026-01-12T...",
    "location": {
      "id": "location-uuid",
      "name": "Main Office"
    }
  }
}
```

**Use Cases:**
- **Assign to location**: Set `locationId` when deploying tag
- **Mark as lost**: Set `status: "lost"` to track missing tags
- **Disable temporarily**: Set `status: "disabled"` to deactivate without deleting
- **Reassign**: Change `locationId` when moving tag between locations
- **Update label**: Change `name` for better organization

---

### 5. Delete Tag

**DELETE /tags/:id**

Permanently delete a tag. This also deletes all associated tap events.

**Request:**
```bash
curl -X DELETE http://localhost:3001/tags/TAG_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
- **Status Code**: 204 No Content
- **Body**: Empty

**Warning:** This action is irreversible and will delete all tap history for this tag.

---

### 6. Get Tag Statistics

**GET /tags/stats**

Get aggregate statistics for all tags in the tenant.

**Request:**
```bash
curl http://localhost:3001/tags/stats \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTags": 25,
    "activeTags": 20,
    "disabledTags": 3,
    "lostTags": 2,
    "totalTaps": 1543
  }
}
```

**Fields:**
- `totalTags`: Total number of tags
- `activeTags`: Tags with status "active"
- `disabledTags`: Tags with status "disabled"
- `lostTags`: Tags with status "lost"
- `totalTaps`: Total tap events across all tags

---

## Public Code Generation

Public codes are automatically generated using a pool of short, memorable words. The format is:

```
{word1}-{word2}-{word3}
```

**Example codes:**
- `cat-dog-sun`
- `fox-sky-web`
- `owl-pen-day`
- `ant-car-top`

**Features:**
- **Human-readable**: Easy to remember and communicate verbally
- **Collision handling**: Automatically retries if code already exists
- **Unique guarantee**: Fallback adds numeric suffix if needed (e.g., `cat-dog-sun-123`)

**Word pool** (40 words):
```
ant, bat, cat, dog, elk, fox, gnu, hen, jay, owl,
ace, bag, bin, box, bus, car, cup, day, egg, fan,
gem, hat, ice, jet, key, log, map, net, oak, pen,
red, sky, sun, top, van, web, zoo, air, bay, dew
```

---

## Error Handling

### Common Errors

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Tag with ID {id} not found",
  "error": "Not Found"
}
```
**Cause:** Tag doesn't exist or doesn't belong to your tenant

---

**400 Bad Request - Invalid Location**
```json
{
  "statusCode": 400,
  "message": "Location not found or does not belong to your organization",
  "error": "Bad Request"
}
```
**Cause:** Provided `locationId` doesn't exist or belongs to different tenant

---

**400 Bad Request - Invalid Status**
```json
{
  "statusCode": 400,
  "message": "Invalid status. Must be: active, disabled, or lost",
  "error": "Bad Request"
}
```
**Cause:** Invalid status value in update request

---

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```
**Cause:** Missing or invalid session cookie

---

## Testing Guide

### Setup

1. **Start API server**
   ```bash
   cd apps/api && pnpm dev
   ```

2. **Get session cookie**
   - Log in via Google OAuth: `http://localhost:3001/auth/google`
   - Extract `connect.sid` cookie from browser DevTools

3. **Set environment variable**
   ```bash
   export SESSION_COOKIE="your-session-cookie-value"
   ```

### Test Scenarios

#### Scenario 1: Create and List Tags

```bash
# Create first tag (no location)
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tag 1"}'

# Create second tag (with location)
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tag 2",
    "locationId": "YOUR_LOCATION_ID"
  }'

# List all tags
curl http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE"
```

**Expected:**
- ✅ Two tags created with auto-generated `publicCode`
- ✅ List shows both tags
- ✅ Second tag has location assigned

---

#### Scenario 2: Update Tag Status

```bash
# Get tag ID from list
TAG_ID="uuid-from-list"

# Disable tag
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"status": "disabled"}'

# Verify status changed
curl http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE"

# Get stats
curl http://localhost:3001/tags/stats \
  -H "Cookie: connect.sid=$SESSION_COOKIE"
```

**Expected:**
- ✅ Status updates to "disabled"
- ✅ Stats show 1 disabled tag

---

#### Scenario 3: Assign/Reassign Location

```bash
# Assign location to tag without one
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"locationId": "LOCATION_ID"}'

# Reassign to different location
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"locationId": "DIFFERENT_LOCATION_ID"}'

# Remove location assignment (set to null)
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"locationId": null}'
```

**Expected:**
- ✅ Location assignments update correctly
- ✅ Tag details show assigned location

---

#### Scenario 4: Mark Tag as Lost

```bash
# Mark tag as lost
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "lost",
    "name": "Lost Tag - Front Desk"
  }'

# Check stats
curl http://localhost:3001/tags/stats \
  -H "Cookie: connect.sid=$SESSION_COOKIE"
```

**Expected:**
- ✅ Tag marked as "lost"
- ✅ Stats show 1 lost tag

---

#### Scenario 5: Delete Tag

```bash
# Delete tag
curl -X DELETE http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE"

# Verify deletion (should return 404)
curl http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE"

# List tags (deleted tag not in list)
curl http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE"
```

**Expected:**
- ✅ Delete returns 204 No Content
- ✅ Tag no longer accessible
- ✅ Tag removed from list

---

#### Scenario 6: Tenant Isolation

```bash
# Log in as User A (Tenant A)
# Create tag as Tenant A
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=$TENANT_A_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"name": "Tenant A Tag"}'

# Log in as User B (Tenant B)
# Try to access Tenant A's tag
curl http://localhost:3001/tags/TENANT_A_TAG_ID \
  -H "Cookie: connect.sid=$TENANT_B_SESSION"

# List tags as Tenant B
curl http://localhost:3001/tags \
  -H "Cookie: connect.sid=$TENANT_B_SESSION"
```

**Expected:**
- ✅ Tenant B cannot access Tenant A's tag (404)
- ✅ Tenant B's list doesn't include Tenant A's tags

---

## Database Queries

### Check Tags in Database

```sql
-- List all tags for a tenant
SELECT id, public_code, name, status, location_id, created_at
FROM tags
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY created_at DESC;

-- Count tags by status
SELECT status, COUNT(*) as count
FROM tags
WHERE tenant_id = 'YOUR_TENANT_ID'
GROUP BY status;

-- Tags with tap counts
SELECT t.id, t.public_code, t.name, t.status, COUNT(te.id) as tap_count
FROM tags t
LEFT JOIN tap_events te ON t.id = te.tag_id
WHERE t.tenant_id = 'YOUR_TENANT_ID'
GROUP BY t.id, t.public_code, t.name, t.status
ORDER BY tap_count DESC;
```

---

## Use Cases

### 1. Physical Tag Deployment

```bash
# Order 10 NFC tags
# Create tags in system
for i in {1..10}; do
  curl -X POST http://localhost:3001/tags \
    -H "Cookie: connect.sid=$SESSION_COOKIE" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Tag Set 1 - Card $i\"}"
done

# Print public codes
curl http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  | jq -r '.data[] | "\(.publicCode) - \(.name)"'

# Write public codes to NFC tags
# Example URL: https://revwave.com/t/cat-dog-sun
```

---

### 2. Location Assignment After Deployment

```bash
# Assign tags to locations after physical deployment
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "LOCATION_ID",
    "name": "Main Entrance - Left Counter"
  }'
```

---

### 3. Lost Tag Management

```bash
# Mark tag as lost
curl -X PATCH http://localhost:3001/tags/$TAG_ID \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "lost",
    "name": "LOST - Front Desk Tag"
  }'

# Create replacement tag
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Front Desk Tag (Replacement)",
    "locationId": "SAME_LOCATION_ID"
  }'
```

---

## Future Enhancements

- **Batch operations**: Create multiple tags at once
- **Tag templates**: Pre-configure tags with names/locations
- **QR code generation**: Generate QR codes for tags
- **Tap analytics**: Detailed analytics on tag usage
- **Custom domains**: Support custom redirect domains
- **Tag expiration**: Automatic deactivation after date

---

## Summary

The tag management system provides:

✅ **Automatic code generation** - Human-safe, memorable codes
✅ **Tenant isolation** - Complete data separation
✅ **Flexible status management** - Active, disabled, lost states
✅ **Location assignment** - Optional location binding
✅ **Full CRUD operations** - Create, read, update, delete
✅ **Statistics tracking** - Aggregate tag and tap metrics

All endpoints are protected by session and tenant guards, ensuring secure, multi-tenant operation.
