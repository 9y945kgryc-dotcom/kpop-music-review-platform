# K-REVIEW — K-POP Music Review Platform

K-POP楽曲を複数の観点で評価・レビューし、ファン同士で発見・比較できるレビューサイトです。

## Current deployment

- **Hosting:** Cloudflare Pages
- **Server-side API:** Cloudflare Pages Functions (functions/api/)
- **Database:** Neon PostgreSQL
- **Repository:** GitHub
- **Frontend:** Static HTML/CSS/JavaScript prototype (index.html)

The deployed review flow calls /api/reviews. The Pages Function reads and writes the current song_reviews table in Neon through @neondatabase/serverless, using the server-side DATABASE_URL environment variable.

## Implemented features

- Search songs by title or artist.
- Filter by artist and sort by overall score.
- Submit seven independent scores from 0.0 to 5.0 in 0.1 increments.
- The six category scores and overall score are independent; overall is not calculated from the six categories.
- Save and load shared reviews through Neon.
- View a song's score breakdown and submitted reviews.
- Compare up to three songs.
- Google sign-in with PKCE and 30-day server-side sessions.
- User-owned review creation, editing and deletion; one review per signed-in user per song.
- Review likes, user profiles, follows, favourites, notifications and community rankings.
- User-submitted song and album catalogue proposals with administrator approval.
- Mobile-responsive artist, album and track catalogue views.

The catalogue uses the existing Neon artists, songs and stagelog_albums tables. User submissions remain private until an administrator approves them.

### Artwork search and catalogue presentation

- Artist cards use available release artwork as their visual identity.
- Album and track pages display square artwork returned by the Deezer catalogue.
- The submission form searches the Deezer catalogue by artist, album, or track, previews candidate covers, and attaches the selected artwork and Deezer URL to the pending submission.
- The administrator moderation screen previews submitted artwork before approval.
- Administrators can find existing albums and standalone songs without artwork, search Deezer candidates, and save a manually verified artwork and Deezer player link.
- Deezer artwork search is provided server-side by `functions/api/artwork-search.js`; the admin-only backfill endpoint is `functions/api/admin/catalog-artwork.js`.
- Apply `migrations/008_deezer_music_provider.sql` to the target Neon database before deploying this branch. It adds `deezer_url` to songs and albums; existing artwork and catalogue rows are preserved.
- Deezer catalogue search results are cached for five minutes in clients and served through Cloudflare's shared cache.
- Existing-artwork backfill is disabled by default. It is available only when `STAGELOG_ARTWORK_BACKFILL_ENABLED=true` is set in the intended Cloudflare Pages environment and the request also has a valid `STAGELOG_ADMIN_TOKEN`. Enable it in Production only after the admin token is configured.

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
- functions/api/catalog-submissions.js: public song / album submission endpoint (pending review).
- functions/api/artwork-search.js: Deezer catalogue artwork search endpoint.
- functions/api/admin/catalog-artwork.js: token-protected existing artwork backfill endpoint.
- functions/api/admin/catalog-submissions.js: token-protected moderation endpoint.
- database/schema.sql: proposed normalized relational model for profiles, artists, albums, songs, reviews, and social features.
- database/catalog-model-v2.sql: additive relationships for album credits, track listings, song versions, and group membership.
- docs/backend-setup.md: deployment and environment configuration notes.
- .env.example: names of required environment variables only; never put real secrets here.
- database/catalog-submissions.sql: additive tables for pending submissions and approved album metadata.

## Important database note

The currently deployed API uses the legacy song_reviews table with numeric song IDs and a JSONB ratings array. The normalized model in database/schema.sql uses UUID song IDs and separate reviews / review_scores tables.

**These two models are not interchangeable yet. Do not apply the normalized schema to a live database as a replacement and do not delete song_reviews.** First take a database backup, inspect the live table structure, and run a deliberate migration that preserves existing reviews and maps every legacy song ID to a catalogue song.

## Environment variables

Set DATABASE_URL in Cloudflare Pages → Settings → Variables and Secrets for the relevant environments. It must be a Neon pooled PostgreSQL connection string and must remain server-side. Do not commit real connection strings, passwords, API keys, or OAuth secrets.

## Production launch checklist

1. Confirm Cloudflare Production uses the intended Neon branch and pooled `DATABASE_URL`.
2. Confirm Google OAuth redirect URI is `https://kpop-music-review-platform.pages.dev/api/auth/callback` (or update it to the canonical custom domain if one is configured).
3. Store `STAGELOG_ADMIN_TOKEN` as a Cloudflare secret; never expose it to the browser or commit it.
4. Apply `migrations/007_user_song_review_uniqueness.sql` to the same Neon branch used by Production before deploying the review API update.
5. Set `STAGELOG_ARTWORK_BACKFILL_ENABLED=true` only when ready to run the administrator-only artwork backfill.
6. Verify sign-in, review create/edit/delete, likes, catalogue submissions, admin moderation, and Deezer artwork search against the Production URL.
7. Keep the legacy `song_reviews` table and numeric song IDs. The normalized schema remains a future migration target, not a replacement.

Legacy `spotify_url` and `apple_music_url` database columns are intentionally retained during this migration to avoid deleting historical values. The application no longer reads, writes, searches, or embeds those providers. New active links are stored in `deezer_url` on songs and albums.\n\n## Commercial use

Check the current terms and pricing of Cloudflare and Neon before public or commercial operation. Choose plans appropriate to expected traffic, data retention, and business use.