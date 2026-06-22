# Music Diary MVP

A private-first music diary and ranking app. Log songs, rank what actually mattered, calibrate taste with pairwise picks, and get recommendations from your explicit favorites.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + reusable UI components
- Prisma ORM + SQLite
- Auth.js (NextAuth Credentials)
- bcrypt password hashing
- Zod validation

## Features included

- Signup, login, logout, protected routes
- Demo account + seeded catalog (60 tracks)
- Diary entries with tier + mood/context tags
- Ranking system with tier base scores + Elo pairwise calibration
- Taste profile (top genres/moods/eras + anchors + recent phase)
- Recommendation engine with reason strings
- Weekly recap card data
- Settings (privacy default toggle, future integrations placeholder)

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Run database migration:
   ```bash
   npm run db:migrate -- --name init
   ```
4. Seed demo data:
   ```bash
   npm run db:seed
   ```
5. Start app:
   ```bash
   npm run dev
   ```

Open http://localhost:3000

## Demo login

- email: `demo@musicdiary.app`
- password: `password123`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`

## Ranking logic

- Each user-track pair stores a numeric score.
- Initial tier score:
  - Life Song: 1000
  - Elite: 850
  - Heavy Rotation: 700
  - Liked: 550
  - Not For Me: 250
- Diary entries add small recency/context boosts.
- Pairwise picks run Elo updates to reorder rankings over time.

## Recommendation logic

Recommendation score combines:

- Genre overlap with top-ranked tracks
- Frequent mood/context tags
- Artist/album adjacency
- Era proximity
- Higher boost from Life Song / Elite anchors
- Novelty (already logged tracks are excluded)

Each recommendation includes a readable reason string.

## Future roadmap

- Spotify import
- Apple Music import
- Friend taste comparison
- Shareable recap cards
- Mobile app
- More advanced recommendation model
