# Smart Discount Tracker & Push Notifier — Product Requirements Document (PRD)

**Overview:**

A mobile-first web application that lets users build a personalized watchlist of grocery, cosmetics, and household products. The system continuously monitors price data from configured sources and immediately notifies users (push + email) when an item hits a sale, drops below a target price, or meets a user-defined rule.

**Goals & Success Metrics:**

- **Goal:** Deliver an accurate, low-latency discount alert service that reduces users' time spent scanning catalogues.
- **Success metrics:** Daily active users (DAU), alert delivery latency (median < 60s from price change detection), alert accuracy (>95% true positives), retention after 30 days.

**Target Audience:**

- Bargain shoppers who track specific brands and SKUs.
- Consumers who prefer automated, set-and-forget alerts rather than manual price checks.

**High-level Features:**

- User accounts, auth, and settings (targets, channels, frequency).
- Watchlist management: add product by name, barcode/ASIN/URL, or browse-suggested matches.
- Price monitoring across multiple sources (retailer sites, aggregator feeds, APIs).
- Notification system: real-time Web Push, mobile push (FCM/APNs via backend), and email fallback.
- Historical price chart and deal history per item.
- Admin dashboard and logs for failed scrapes, alert metrics, and source health.

**User Stories:**

- As a user, I can add an item to my watchlist with a target price so I receive alerts when it drops below that price.
- As a user, I can choose push, email, or both as my notification channels.
- As a user, I can view recent price changes and the last notification sent for each item.

**Functional Requirements:**

- FR1: Users can sign up / sign in and manage profiles.
- FR2: Users can add, edit, and remove watchlist items and set target prices and rules.
- FR3: System fetches prices for each watched item at configured intervals and on-demand.
- FR4: Trigger notifications when rules are satisfied; maintain deduplication to avoid duplicate alerts.
- FR5: Store price history and event timestamps for at least 90 days.

**Non-Functional Requirements:**

- Scalability: Support thousands of users and tens of thousands of watched items with horizontal scaling of workers.
- Reliability: 99.9% alert delivery uptime; retries and dead-letter handling for failed notifications.
- Security: encrypt PII at rest, rotate API keys, rate-limit scraping to avoid IP bans.

**Proposed Tech Stack:**

- Frontend
	- Framework: React + Vite (existing client folder fits this). Use functional components and hooks.
	- Styling: CSS Modules or TailwindCSS for mobile-first responsive UI.
	- Notifications: Web Push via Service Worker + Push API; integrate Firebase Cloud Messaging (FCM) for mobile push.

- Backend
	- Runtime: Node.js
	- Framework: Express.js (current repo already uses `server.js`).
	- Auth: JWT for API access; OAuth2 optional for single-sign-on.
	- Jobs & Queue: BullMQ (Redis) or Bee-Queue for scraping and notification tasks.
	- Scheduler: Bull recurring jobs or node-cron for lightweight scheduling.

- Data
	- Primary DB: PostgreSQL (recommendation) with Sequelize or TypeORM; alternatively MongoDB if flexible schema is preferred.
	- Cache/Queue: Redis for rate-limiting, deduplication state, and job queues.
	- Search/Indexing: Optional ElasticSearch for product matching and suggestions.

- Scrapers & Integrations
	- HTTP clients: axios + cheerio for HTML parsing; puppeteer or Playwright for JS-heavy sites.
	- Site connectors: modular scraper adapters under `scrapers/sites/` to keep source-specific logic isolated.
	- Sources: support CSV/API feeds ingestion for partners (e.g., retailer APIs, OzBargain feed).

- Notifications & Email
	- Web/Mobile Push: FCM for cross-platform push; Web Push (VAPID) for browsers.
	- Email: SendGrid, Amazon SES, or Postmark for transactional emails.

- Observability & DevOps
	- Logging: structured logs with Winston or Pino; centralize with Logstash/CloudWatch.
	- Monitoring: Prometheus + Grafana for metrics; Sentry for error tracking.
	- CI/CD: GitHub Actions for tests, linting, build, and deploy pipelines.
	- Deployment: Docker containers; run on Render/Heroku/Cloud Run for MVP, move to Kubernetes for scale.

**Architecture (MVP):**

1. UI (React/Vite) talks to Backend API (Express).
2. Backend exposes REST endpoints for user/watchlist management and triggers jobs.
3. Worker cluster (BullMQ + Redis) executes scrapers and price-normalization, writes results to DB.
4. Notification service consumes events from queue and sends push/email via providers.

**Data Model (core entities):**

- User: id, email, password_hash, preferences
- WatchlistItem: id, user_id, canonical_product_id, target_price, rules, last_notified_at
- Product / Deal: product_id, title, brand, sku, source, current_price, currency, url, last_seen
- Source: id, name, type (scraper|api|feed), config
- Notification: id, user_id, watchlist_item_id, channel, status, sent_at

**API surface (selected endpoints):**

- POST /api/auth/register, POST /api/auth/login
- GET /api/watchlist, POST /api/watchlist, PUT /api/watchlist/:id, DELETE /api/watchlist/:id
- GET /api/products/:id/price-history
- POST /api/subscribe (web push subscription)

**Security & Compliance:**

- Protect endpoints with rate limits and authentication.
- Store secrets (API keys, VAPID, FCM) in environment variables / secrets manager.
- GDPR: provide data export and deletion endpoints.

**MVP Milestones & Timeline (suggested):**

1. Week 1–2: Core backend, user auth, watchlist CRUD, minimal UI to add items.
2. Week 3–4: Implement scraper adapter, price polling worker, and simple notification pipeline (email + web push).
3. Week 5–6: Improve matching, deduplication, historical charts, and admin dashboard.
4. Week 7+: Mobile push integration (FCM), resiliency, monitoring, and performance tuning.

**Risks & Mitigations:**

- Scraping reliability: mitigate with partner APIs and headless browser fallback.
- Rate limits / IP bans: rotate proxies, implement backoff and respectful scraping.
- False positives: add verification layer and allow users to confirm or dismiss alerts.

**Next Steps (for me / team):**

- Convert this PRD into issues and move to the project board.
- Implement MVP skeleton: auth, watchlist CRUD, a single scraper adapter, worker queue, and a demo notification.

---

This PRD replaces the previous brief notes and is intended as the working specification for the project. Update requirements and tech choices after the first sprint feedback.


