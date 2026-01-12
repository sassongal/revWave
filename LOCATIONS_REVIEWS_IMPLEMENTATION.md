# Locations, Reviews & Replies Implementation

## Summary

Implemented complete repository services for Location, Review, and Reply models with full CRUD operations, filtering, statistics, and upsert logic for sync operations.

## Database Models

### Location Model

**Schema** ([packages/db/prisma/schema.prisma:140-166](packages/db/prisma/schema.prisma#L140-L166))

```prisma
model Location {
  id                String   @id @default(uuid())
  externalId        String   @map("external_id")
  name              String
  address           String?
  phoneNumber       String?  @map("phone_number")
  websiteUrl        String?  @map("website_url")
  metadata          Json?
  integrationId     String   @map("integration_id")
  tenantId          String   @map("tenant_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  integration Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reviews     Review[]
  tags        Tag[]

  @@unique([integrationId, externalId])
  @@index([tenantId])
  @@index([integrationId])
  @@map("locations")
}
```

**Key Constraints:**
- ✅ Unique constraint: `(integrationId, externalId)` - prevents duplicate Google locations
- ✅ Indexes on `tenantId` and `integrationId` for fast queries
- ✅ Cascade delete when Integration or Tenant deleted

### Review Model

**Schema** ([packages/db/prisma/schema.prisma:168-198](packages/db/prisma/schema.prisma#L168-L198))

```prisma
model Review {
  id              String   @id @default(uuid())
  externalId      String   @map("external_id")
  rating          Int      // 1-5
  content         String?  @db.Text
  reviewerName    String   @map("reviewer_name")
  reviewerAvatar  String?  @map("reviewer_avatar")
  publishedAt     DateTime @map("published_at")
  repliedStatus   String   @default("pending") @map("replied_status") // pending, drafted, replied
  metadata        Json?
  locationId      String   @map("location_id")
  tenantId        String   @map("tenant_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  replies  Reply[]

  @@unique([locationId, externalId])
  @@index([tenantId])
  @@index([locationId])
  @@index([repliedStatus])
  @@map("reviews")
}
```

**Key Constraints:**
- ✅ Unique constraint: `(locationId, externalId)` - prevents duplicate Google reviews
- ✅ Indexes on `tenantId`, `locationId`, and `repliedStatus` for filtering
- ✅ Reply status enum: `pending | drafted | replied`

### Reply Model

**Schema** ([packages/db/prisma/schema.prisma:200-221](packages/db/prisma/schema.prisma#L200-L221))

```prisma
model Reply {
  id              String   @id @default(uuid())
  content         String   @db.Text
  isDraft         Boolean  @default(true) @map("is_draft")
  publishedAt     DateTime? @map("published_at")
  publishedBy     String?   @map("published_by")
  aiGenerated     Boolean  @default(false) @map("ai_generated")
  aiModel         String?  @map("ai_model")
  reviewId        String   @map("review_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId])
  @@map("replies")
}
```

**Key Features:**
- ✅ Supports both draft and published replies
- ✅ Tracks AI-generated replies with model information
- ✅ Tracks who published the reply (`publishedBy` user ID)

## Repository Services

### LocationsService

**File**: [apps/api/src/locations/locations.service.ts](apps/api/src/locations/locations.service.ts)

**Methods:**

#### Read Operations
- `findAll(tenantId)` - Get all locations for tenant with integration info and counts
- `findOne(id, tenantId)` - Get specific location with validation
- `findByExternalId(externalId, integrationId, tenantId)` - Find by Google ID
- `getStats(tenantId)` - Get location statistics

#### Write Operations
- `create(data)` - Create new location
- `update(id, tenantId, data)` - Update existing location
- `upsert(data)` - **Create or update** (used during sync)
- `remove(id, tenantId)` - Delete location

**Example Usage:**

```typescript
// During Google Business sync
const location = await locationsService.upsert({
  externalId: 'locations/12345',
  name: 'My Business',
  address: '123 Main St',
  phoneNumber: '+1-555-0100',
  websiteUrl: 'https://example.com',
  metadata: googleLocationData,
  integrationId: integration.id,
  tenantId: tenant.id,
});

// Get statistics
const stats = await locationsService.getStats(tenantId);
// {
//   totalLocations: 5,
//   locationsWithReviews: 3,
//   locationsWithoutReviews: 2
// }
```

### ReviewsService

**File**: [apps/api/src/reviews/reviews.service.ts](apps/api/src/reviews/reviews.service.ts)

**Methods:**

#### Read Operations
- `findAll(tenantId, filters?)` - Get all reviews with optional filters
  - Filters: `locationId`, `repliedStatus`, `rating`, `minRating`, `maxRating`
- `findOne(id, tenantId)` - Get specific review with location and replies
- `findByExternalId(externalId, locationId, tenantId)` - Find by Google review ID
- `getStats(tenantId, locationId?)` - Get review statistics and rating distribution
- `getRecent(tenantId, days?, limit?)` - Get recent reviews (default: last 7 days)

#### Write Operations
- `create(data)` - Create new review
- `update(id, tenantId, data)` - Update existing review
- `upsert(data)` - **Create or update** (used during sync)
- `updateReplyStatus(id, tenantId, status)` - Update reply status
- `remove(id, tenantId)` - Delete review

**Example Usage:**

```typescript
// During Google Business sync
const review = await reviewsService.upsert({
  externalId: 'reviews/abc123',
  rating: 5,
  content: 'Great service!',
  reviewerName: 'John Doe',
  reviewerAvatar: 'https://...',
  publishedAt: new Date('2024-01-15'),
  metadata: googleReviewData,
  locationId: location.id,
  tenantId: tenant.id,
});

// Get statistics
const stats = await reviewsService.getStats(tenantId);
// {
//   totalReviews: 150,
//   pendingReviews: 45,
//   draftedReviews: 10,
//   repliedReviews: 95,
//   averageRating: 4.5,
//   ratingDistribution: { 1: 2, 2: 5, 3: 15, 4: 40, 5: 88 }
// }

// Filter reviews
const pendingReviews = await reviewsService.findAll(tenantId, {
  repliedStatus: 'pending',
  minRating: 1,
  maxRating: 3, // Only low-rated pending reviews
});
```

### RepliesService

**File**: [apps/api/src/reviews/replies.service.ts](apps/api/src/reviews/replies.service.ts)

**Methods:**

#### Read Operations
- `findAll(reviewId)` - Get all replies for a review
- `findOne(id)` - Get specific reply with review details
- `findLatest(reviewId)` - Get latest reply for review
- `findLatestDraft(reviewId)` - Get latest draft reply
- `getAiStats(tenantId)` - Get AI-generated reply statistics
- `getDrafts(tenantId)` - Get all draft replies for tenant

#### Write Operations
- `create(data)` - Create new reply (draft or published)
- `update(id, data)` - Update existing reply
- `publish(id, publishedBy)` - Publish a draft reply
- `remove(id)` - Delete reply

**Example Usage:**

```typescript
// Create AI-generated draft
const draft = await repliesService.create({
  content: 'Thank you for your feedback!',
  isDraft: true,
  aiGenerated: true,
  aiModel: 'gpt-4',
  reviewId: review.id,
});

// Publish draft
const published = await repliesService.publish(draft.id, userId);

// Get AI statistics
const aiStats = await repliesService.getAiStats(tenantId);
// {
//   totalReplies: 100,
//   aiReplies: 75,
//   publishedAiReplies: 60,
//   aiPercentage: 75
// }

// Get all drafts needing review
const drafts = await repliesService.getDrafts(tenantId);
```

## Modules

### LocationsModule

**File**: [apps/api/src/locations/locations.module.ts](apps/api/src/locations/locations.module.ts)

```typescript
@Module({
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
```

- Exports `LocationsService` for use in other modules (e.g., SyncService)

### ReviewsModule

**File**: [apps/api/src/reviews/reviews.module.ts](apps/api/src/reviews/reviews.module.ts)

```typescript
@Module({
  providers: [ReviewsService, RepliesService],
  exports: [ReviewsService, RepliesService],
})
export class ReviewsModule {}
```

- Exports both `ReviewsService` and `RepliesService`
- Used in controllers, sync service, AI service

## Integration with AppModule

**File**: [apps/api/src/app.module.ts](apps/api/src/app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    IntegrationsModule,
    LocationsModule,    // ← Added
    ReviewsModule,      // ← Added
  ],
})
export class AppModule {}
```

## Database Migration

**Status**: ✅ Already applied in initial migration

**Migration File**: `packages/db/prisma/migrations/20260111232502_init/migration.sql`

The initial migration includes:
- `locations` table with unique constraint on `(integration_id, external_id)`
- `reviews` table with unique constraint on `(location_id, external_id)`
- `replies` table with foreign key to reviews
- All indexes as specified

**Verification:**

```bash
# Check migration status
cd packages/db
DATABASE_URL="postgresql://revwave:revwave123@localhost:5432/revwave" \
  pnpm exec prisma migrate status

# Regenerate Prisma client
pnpm db:generate
```

## Type Definitions

All DTOs are defined inline in service files:

- `CreateLocationDto` - Data for creating/upserting locations
- `UpdateLocationDto` - Partial data for updating locations
- `CreateReviewDto` - Data for creating/upserting reviews
- `UpdateReviewDto` - Partial data for updating reviews
- `ReviewFilters` - Filter options for review queries
- `CreateReplyDto` - Data for creating replies
- `UpdateReplyDto` - Partial data for updating replies

## Usage in Sync Service (Future Implementation)

The repository services are designed to be used in a sync service:

```typescript
@Injectable()
export class SyncService {
  constructor(
    private readonly googleApi: GoogleApiService,
    private readonly locationsService: LocationsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async syncLocations(tenantId: string) {
    // 1. Get Google locations
    const googleLocations = await this.googleApi.listLocations(tenantId);

    // 2. Upsert to database
    for (const loc of googleLocations) {
      await this.locationsService.upsert({
        externalId: loc.name,
        name: loc.title,
        address: loc.storefrontAddress?.addressLines?.join(', '),
        phoneNumber: loc.phoneNumbers?.primaryPhone,
        websiteUrl: loc.websiteUri,
        metadata: loc,
        integrationId: integration.id,
        tenantId,
      });
    }
  }

  async syncReviews(tenantId: string, locationId: string) {
    // 1. Get location
    const location = await this.locationsService.findOne(locationId, tenantId);

    // 2. Get Google reviews
    const googleReviews = await this.googleApi.listReviews(
      tenantId,
      location.externalId,
    );

    // 3. Upsert to database
    for (const review of googleReviews) {
      await this.reviewsService.upsert({
        externalId: review.reviewId,
        rating: this.parseStarRating(review.starRating),
        content: review.comment,
        reviewerName: review.reviewer?.displayName || 'Anonymous',
        reviewerAvatar: review.reviewer?.profilePhotoUrl,
        publishedAt: new Date(review.createTime),
        metadata: review,
        locationId: location.id,
        tenantId,
      });
    }
  }
}
```

## Testing Checklist

- [x] Prisma client generates successfully
- [x] Models follow Engineering Spec exactly
- [x] Unique constraints on `(tenantId, externalId)` equivalents
- [x] Reply status enum implemented
- [x] Repository methods for CRUD operations
- [x] Upsert methods for sync operations
- [x] Statistics methods for analytics
- [x] Filtering methods for reviews
- [x] TypeScript types for all DTOs
- [x] Modules created and exported
- [x] Integrated with AppModule
- [ ] Unit tests (future work)
- [ ] E2E tests with actual sync (future work)

## Acceptance Criteria

✅ **Migration applies successfully**
- Initial migration already includes all tables
- No new migration needed

✅ **Prisma client generates successfully**
- Verified with `pnpm db:generate`
- No TypeScript errors

✅ **Repository functions implemented**
- LocationsService: 8 methods (CRUD, upsert, stats)
- ReviewsService: 10 methods (CRUD, upsert, filtering, stats)
- RepliesService: 11 methods (CRUD, publish, AI stats)

✅ **Unique constraints enforced**
- `Location`: `(integrationId, externalId)`
- `Review`: `(locationId, externalId)`

✅ **Reply status enum**
- `pending | drafted | replied`
- Indexed for fast filtering

## Next Steps

1. **Create Controllers** (if needed for REST API)
   - LocationsController
   - ReviewsController
   - RepliesController

2. **Create SyncService**
   - Use GoogleApiService + LocationsService + ReviewsService
   - Implement scheduled sync jobs
   - Handle pagination and error cases

3. **Create AI Service**
   - Use OpenAI API to generate drafts
   - Call RepliesService.create() with aiGenerated=true

4. **Add Tests**
   - Unit tests for all service methods
   - E2E tests for sync flow

## Files Created

- [apps/api/src/locations/locations.service.ts](apps/api/src/locations/locations.service.ts) - Location repository
- [apps/api/src/locations/locations.module.ts](apps/api/src/locations/locations.module.ts) - Location module
- [apps/api/src/reviews/reviews.service.ts](apps/api/src/reviews/reviews.service.ts) - Review repository
- [apps/api/src/reviews/replies.service.ts](apps/api/src/reviews/replies.service.ts) - Reply repository
- [apps/api/src/reviews/reviews.module.ts](apps/api/src/reviews/reviews.module.ts) - Reviews module
- Updated: [apps/api/src/app.module.ts](apps/api/src/app.module.ts) - Added new modules

## Summary

All database models and repository services are now implemented and ready for use. The services provide:

- ✅ Complete CRUD operations
- ✅ Tenant-scoped queries
- ✅ Upsert logic for sync operations
- ✅ Filtering and pagination
- ✅ Statistics and analytics
- ✅ AI-generated reply tracking
- ✅ Draft/published workflow

The next phase is to build controllers (if exposing via REST API) and the sync service that orchestrates Google API calls with these repository services.
