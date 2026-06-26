# Mobile API

This backend supports native mobile clients with opaque bearer tokens.

## Auth

Create a mobile session:

```http
POST /api/mobile/session
Content-Type: application/json

{
  "email": "demo@musicdiary.app",
  "password": "password123",
  "deviceName": "iPhone 16 Pro"
}
```

Use the returned token in subsequent requests:

```http
Authorization: Bearer <token>
```

## Bootstrap

`GET /api/mobile/bootstrap` returns:

- current user
- plan/feature flags
- ratings, rankings, friends, and recommendations counts

`GET /api/mobile/dashboard` returns:

- dashboard summary cards
- recommendation pulse
- feed preview
- ratings/rankings/friends counts

## Recommended mobile routes

- `GET /api/mobile/bootstrap`
- `GET /api/mobile/dashboard`
- `GET /api/dashboard`
- `GET /api/mobile/session`
- `POST /api/mobile/push-tokens`
- `DELETE /api/mobile/push-tokens`
- `POST /api/mobile/subscription/webhook`
- `PATCH /api/profile`
- `GET /api/feed`
- `GET /api/friends`
- `POST /api/friends`
- `PATCH /api/friends/:friendshipId`
- `GET /api/people/search?q=...`
- `GET /api/catalog/search?q=...`
- `GET /api/rankings`
- `POST /api/diary`
- `POST /api/pairwise`
- `GET/PATCH /api/recommendations`
- `GET /api/taste-profile`
- `GET /api/weekly-recap`

## Notes

- Mobile tokens are stored server-side and can be revoked.
- Current token lifetime is 30 days.
- Web keeps using NextAuth session cookies; native apps can use bearer tokens against the same product APIs.
- An Expo Router mobile shell is available under `apps/mobile/`.