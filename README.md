# STAGELOG — K-POP Music Review Platform

K-POP楽曲を複数の観点で評価・レビューし、ファン同士で発見・比較できるレビューサイトです。

## Current deployment

- **Hosting:** Cloudflare Pages
- **Server-side API:** Cloudflare Pages Functions (functions/api/)
- **Database:** Neon PostgreSQL
- **Repository:** GitHub
- **Frontend:** Static HTML/CSS/JavaScript prototype (index.html)

The deployed review flow calls /api/reviews. The Pages Function reads and writes the current song_reviews table in Neon through @neondatabase/serverless, using the server-side DATABASE_URL environment variable.

## Current prototype features

- Search songs by title or artist.
- Filter by artist and sort by overall score.
- Submit seven independent scores from 0.0 to 5.0 in 0.1 increments.
- The six category scores and overall score are independent; overall is not calculated from the six categories.
- Save and load shared reviews through Neon.
- View a song's score breakdown and submitted reviews.
- Compare up to three songs.

The initial song cards are currently a small frontend seed list. A normalized artist / album / song catalogue is the next data-model milestone.

## Review score model

Six independently rated categories (0.0–5.0, step 0.1):

1. 楽曲構成・完成度
2. サウンド・アレンジ
3. ボーカル・ラップ
4. コンセプト・独創性
5. 表現力・感情伝達
6. 中毒性・印象度

The overall score is entered independently; it is not calculated as the average of the six category scores.

## Repository structure

- index.html: current frontend.
- functions/api/reviews.js: current Neon-backed review API.
- database/schema.sql: proposed normalized relational model for profiles, artists, albums, songs, reviews, and social features.
- docs/backend-setup.md: deployment and environment configuration notes.
- .env.example: names of required environment variables only; never put real secrets here.

## Important database note

The currently deployed API uses the legacy song_reviews table with numeric song IDs and a JSONB ratings array. The normalized model in database/schema.sql uses UUID song IDs and separate reviews / review_scores tables.

**These two models are not interchangeable yet. Do not apply the normalized schema to a live database as a replacement and do not delete song_reviews.** First take a database backup, inspect the live table structure, and run a deliberate migration that preserves existing reviews and maps every legacy song ID to a catalogue song.

## Environment variables

Set DATABASE_URL in Cloudflare Pages → Settings → Variables and Secrets for the relevant environments. It must be a Neon pooled PostgreSQL connection string and must remain server-side. Do not commit real connection strings, passwords, API keys, or OAuth secrets.

## Next milestones

1. Reconcile the legacy review table with the normalized catalogue model without losing existing reviews.
2. Build the artist → album → song catalogue and stable song identifiers.
3. Connect song detail pages to catalogue metadata and review aggregates.
4. Add authentication and per-user review ownership before opening public submissions more widely.
5. Add moderation, likes, favourites, and artist pages.

## Commercial use

Check the current terms and pricing of Cloudflare and Neon before public or commercial operation. Choose plans appropriate to expected traffic, data retention, and business use.