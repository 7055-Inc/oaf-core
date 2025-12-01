# Reviews System Integration Guide

## ✅ What's Already Done

1. **Database Tables Created:**
   - `reviews` - Main review data
   - `review_replies` - Threading/replies
   - `review_edit_history` - Audit trail
   - `review_flags` - Moderation
   - `review_helpfulness` - Voting system

2. **API Routes Created:**
   - `/api/reviews` - Full CRUD + all features
   - Registered in `server.js`

3. **Helper Functions:**
   - `src/utils/reviewHelpers.js` - Reusable functions

## 🔧 How to Add Reviews to Existing Endpoints

### Example 1: Add to Products Endpoint

In `/api-service/src/routes/products.js`:

```javascript
// At the top, add the helper import
const { getReviewSummary } = require('../utils/reviewHelpers');

// In your GET /products/:id endpoint, add:
router.get('/:id', async (req, res) => {
  try {
    // ... your existing product fetch code ...
    
    // Add review summary
    const review_summary = await getReviewSummary('product', product.id);
    
    res.json({
      ...product,
      review_summary  // Add this to response
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

### Example 2: Add to Events Endpoint

In `/api-service/src/routes/events.js`:

```javascript
const { getReviewSummary } = require('../utils/reviewHelpers');

router.get('/:id', async (req, res) => {
  try {
    // ... your existing event fetch code ...
    
    const review_summary = await getReviewSummary('event', event.id);
    
    res.json({
      ...event,
      review_summary
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

### Example 3: Add to User Profiles

In `/api-service/src/routes/users.js`:

```javascript
const { getReviewSummary } = require('../utils/reviewHelpers');

router.get('/:id/profile', async (req, res) => {
  try {
    // ... your existing profile fetch code ...
    
    // Reviews for artists/promoters/community members
    const review_summary = await getReviewSummary(user.user_type, user.id);
    
    res.json({
      ...profile,
      review_summary
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

## 📋 Available API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/reviews` - Get reviews (with filters)
- `GET /api/reviews/summary?type=product&id=123` - Get summary stats
- `GET /api/reviews/:id` - Get single review with replies

### Authenticated User Endpoints
- `GET /api/reviews/check-eligibility?type=product&id=123` - Check if can review
- `POST /api/reviews` - Create review
- `PATCH /api/reviews/:id` - Edit own review
- `DELETE /api/reviews/:id` - Delete own review
- `POST /api/reviews/:id/replies` - Add reply
- `POST /api/reviews/:id/helpful` - Vote helpful/not helpful
- `POST /api/reviews/:id/flag` - Report review

### Admin Endpoints
- `GET /api/reviews/admin/flags` - Get flagged reviews
- `PATCH /api/reviews/:id/moderate` - Hide/show review

## 🎨 Frontend Usage Examples

### Get Reviews for a Product
```javascript
const response = await fetch('/api/reviews?type=product&id=123&limit=10&sort=recent');
const reviews = await response.json();
```

### Get Review Summary
```javascript
const response = await fetch('/api/reviews/summary?type=product&id=123');
const summary = await response.json();
// Returns: { count, average_rating, verified_count, rating_distribution }
```

### Check if User Can Review
```javascript
const response = await fetch('/api/reviews/check-eligibility?type=product&id=123', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { canReview, reason, can_verify } = await response.json();
```

### Create a Review
```javascript
const response = await fetch('/api/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    reviewable_type: 'product',
    reviewable_id: 123,
    rating: 5,
    title: 'Amazing product!',
    review_text: 'This is a detailed review...',
    display_as_anonymous: false
  })
});
```

### Vote on Helpfulness
```javascript
await fetch('/api/reviews/123/helpful', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ vote: 'helpful' })
});
```

## 🔒 Permissions & Rules

1. **Who Can Review:**
   - Cannot review own items
   - Cannot duplicate reviews
   - Must be authenticated

2. **Verification:**
   - Products: Verified if user purchased
   - Events: Verified if user attended (via application)
   - Shows badge automatically

3. **Anonymous Reviews:**
   - Frontend shows "Anonymous"
   - Backend always tracks real user (for legal)
   - Admin can see real user

4. **Moderation:**
   - All reviews auto-approved
   - Users can flag reviews
   - Admins can hide/show flagged reviews

## 🧪 Testing

Test with curl (replace `YOUR_API_URL` with your actual API base URL):

```bash
# Get reviews for a product
curl https://YOUR_API_URL/api/reviews?type=product&id=2000000001

# Get summary
curl https://YOUR_API_URL/api/reviews/summary?type=product&id=2000000001

# Create review (requires auth)
curl -X POST https://YOUR_API_URL/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "reviewable_type": "product",
    "reviewable_id": 2000000001,
    "rating": 5,
    "title": "Great product",
    "review_text": "Really happy with this purchase"
  }'
```

**Note:** Frontend components use `apiRequest()` and `authApiRequest()` utilities which automatically use your configured `API_BASE_URL` environment variable.

## 🚀 Next Steps (Future Features)

These are **NOT** implemented yet but planned:

- [ ] QR code verification system
- [ ] Review media (photos/videos)
- [ ] Reviewer reputation scoring
- [ ] AI moderation assistance
- [ ] Review prompts/reminders
- [ ] Weighting algorithm
- [ ] Export for legal requests

## 📝 Notes

- Reviews are soft-deleted (status changes, not removed)
- Edit history is tracked automatically
- Helpful votes can be toggled (vote again to remove)
- Reply threads support infinite nesting
- All timestamps use server timezone

