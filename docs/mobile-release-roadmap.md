# Mobile Release Roadmap (iOS + Android)

## Product Objective
Build a monetizable, production-grade personal music ranking app with dynamic taste calibration and recommendation loops.

## Phase 1: Foundation Hardening (current sprint)
- [x] Dynamic personal ranking (tracks, albums, artists)
- [x] Pairwise calibration flow and confidence-aware movement
- [x] Ranking confidence surfaced in product UI
- [x] Snapshot-based trend persistence for ranking history
- [x] API contract versioning and error shape standardization
- [ ] End-to-end tests for ranking mutation paths

## Phase 2: Reliability + Security
- [x] Add structured logging and request tracing
- [x] Add background jobs for weekly recap and recommendation refresh
- [x] Add rate limiting on ranking and recommendation APIs
- [x] Add abuse protection and account lockout policies
- [x] Add PII and privacy controls (export/delete user data)

## Phase 3: Monetization Readiness
- [ ] Define subscription tiers (Free, Plus, Pro)
- [x] Build entitlement middleware and feature gating
- [ ] Integrate Stripe for web billing
- [ ] Integrate RevenueCat for mobile subscription sync
- [ ] Add paywall experiments and conversion analytics

## Phase 4: Mobile App Delivery
- [x] Choose stack: React Native Expo or native apps
- [x] Move auth/session handling to mobile-safe token flow
- [x] Build shared API SDK for web and mobile clients
- [~] Deliver parity for core flows:
  - Diary logging
  - Pairwise calibration
  - Library ranking views
  - Recommendations and save/dismiss actions
- [ ] Add push notifications (weekly recap, new recommendations)

## Phase 5: Release Quality
- [ ] Test strategy: unit + integration + E2E on CI
- [ ] Device matrix and offline behavior testing
- [ ] Crash/error monitoring (Sentry)
- [ ] Performance budgets for API and app startup
- [ ] App Store / Play Store compliance, privacy labels, screenshots

## Phase 6: Growth + General Release
- [ ] Referral loop and invite system
- [ ] Onboarding optimization experiments
- [ ] Creator playlists / social proof loops
- [ ] General release criteria:
  - Crash-free sessions >= 99.5%
  - D7 retention target met
  - Paid conversion target met
  - Recommendation CTR and save-rate targets met

## Immediate Next Build Steps
1. Add mobile parity screens for diary logging, pairwise, rankings, and recommendations in Expo.
2. Add push notifications and deep linking support.
3. Add E2E coverage for mobile auth + bootstrap + dashboard flows.
