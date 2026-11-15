# K-REVIEW backend and deployment notes

## Current architecture

The repository is currently deployed as a **Cloudflare Pages** site:

- Static frontend: index.html
- API routes: Cloudflare Pages Functions under functions/api/
- Database: Neon PostgreSQL
- PostgreSQL driver: @neondatabase/serverless
- Required server-side binding: DATABASE_URL

The current review endpoint is /api/reviews, implemented in functions/api/reviews.js. It reads and writes the existing song_reviews table. The deployed frontend loads reviews from this endpoint and posts new reviews to it.

## Cloudflare Pages configuration

1. Open the Cloudflare dashboard and select **Workers & Pages**.
2. Select the kpop-music-review-platform Pages project.
3. Open **Settings → Variables and Secrets**.
4. Add DATABASE_URL as a secret for Production. Add a separate value for Preview if a separate Neon branch is used.
5. Redeploy after changing environment variables.

Use the Neon pooled connection string. Keep it server-side: do not expose it in HTML, JavaScript sent to the browser, or any NEXT_PUBLIC_* variable.

## Neon configuration

1. Open the K-REVIEW project in Neon Console.
2. Copy the pooled connection string for the intended branch.
3. Store it in Cloudflare as DATABASE_URL.
4. Keep a separate development branch/database where practical.
5. Before changing the live schema, create a backup or Neon branch and test the migration there.

Never paste a full connection string, database password, or secret into chat or commit it to GitHub.

## Current review table versus normalized schema

There is an important transition to complete before expanding the catalogue:

- Current Pages Function: song_reviews, numeric song_id, seven ratings stored together as JSONB, plus comment and timestamp.
- Proposed database/schema.sql: UUID-based artists, albums, songs, reviews, and review_scores, with six score columns and an independent overall score.

The live API does not currently use the normalized reviews and review_scores tables. The proposed schema must therefore be treated as a target design, not as a drop-in replacement for the live database.

### Safe migration sequence

1. Inspect the actual live song_reviews table columns and types in Neon SQL Editor.
2. Create a Neon branch or backup before modifying anything.
3. Create the artist / album / song catalogue and assign a stable catalogue ID to every current song.
4. Build a mapping from each existing numeric song_reviews.song_id to its catalogue song. Preserve every review row and all seven score values.
5. Test reads, new review writes, averages, and detail pages against the migrated data.
6. Only after verification, switch the API to the new model. Keep a rollback path until production has been checked.

Do not drop or rename song_reviews as part of an initial catalogue rollout.

## Review score model

Every review contains seven independently supplied values, all from 0.0 to 5.0 in 0.1 increments:

1. 楽曲構成・完成度
2. サウンド・アレンジ
3. ボーカル・ラップ
4. コンセプト・独創性
5. 表現力・感情伝達
6. 中毒性・印象度
7. 総合評価

The overall score must remain independent and must never be calculated as the average of the six category scores.

## Catalogue model to implement

- **Artist:** group, soloist, band, or other credited act; Korean and international names; agency; debut date.
- **Album / release:** album, mini album, single, digital single, OST, or special release; release date and cover art.
- **Song:** canonical track identity, original title, Korean title, release date, and track artwork.
- **Song credits:** many-to-many song / artist relation to support collaborations, featuring artists, and unit tracks.
- **Song version:** optional version record for Japanese versions, remixes, instrumentals, and alternate releases, linked to a canonical song where appropriate.

A song should not be duplicated merely because it appears on more than one release. Release track listings should connect releases to the canonical song.

## Current production scope and remaining boundaries

- The artist / album / song catalogue is served from Neon and rendered by the responsive frontend.
- Google sign-in and server-side session ownership are implemented.
- Signed-in users can create, edit and delete their own reviews. A partial unique index enforces one review per signed-in user per song; the API limits a user to 10 new reviews per 10 minutes.
- Likes, follows, favourites, notifications, public profiles and user rankings are implemented.
- Song / album submissions require sign-in and remain pending until an administrator approves or rejects them.
- The current administrator interface uses one shared `STAGELOG_ADMIN_TOKEN`; this is suitable only for a small, trusted operator group. Do not share the token. A future larger operation should use per-admin roles and audit logging.
- The Apple Search API is cached at the edge. It is still subject to Apple's external availability and rate limits; do not run bulk searches.
- The normalized schema in `database/schema.sql` remains a target model and is not connected to the current legacy review API.

## Production environment variables

Set these in Cloudflare Pages → Settings → Variables and Secrets:

- `DATABASE_URL`: pooled connection string for the exact Neon branch used by the site (Secret).
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (Secret).
- `GOOGLE_REDIRECT_URI`: exact callback URL, normally `https://kpop-music-review-platform.pages.dev/api/auth/callback`.
- `STAGELOG_ADMIN_TOKEN`: long, random administrator token (Secret).
- `STAGELOG_ARTWORK_BACKFILL_ENABLED`: set to the literal string `true` only when administrator artwork backfill should be enabled in that environment. Leave unset otherwise.

The public Google OAuth start endpoint has been verified to redirect to Google. Never paste secrets into chat or commit them to GitHub.

## Production launch sequence

1. Confirm the Production `DATABASE_URL` points to the intended Neon branch; do not assume the project's default branch is the app's live branch.
2. Take a Neon restore point / branch before applying any schema change.
3. Apply `migrations/007_user_song_review_uniqueness.sql` to the exact branch referenced by Production. It adds a partial unique index and preserves anonymous legacy reviews.
4. Deploy the matching GitHub `main` revision to Cloudflare Pages.
5. Configure the admin token and artwork backfill feature flag. The backfill endpoint requires both a valid bearer token and the feature flag.
6. Verify Google login, read APIs, review create/edit/delete, likes, favourites, follows, notifications, catalogue submission, admin moderation and Apple artwork search.
7. Keep the existing `song_reviews` table and numeric song IDs. Do not replace them with `database/schema.sql` as part of this launch.

## Security boundaries

- Keep all database credentials, Google client secrets and admin tokens server-side.
- Validate all request bodies on the server and restrict artwork images to Apple CDN hosts.
- Review creation requires a signed-in user, enforces one review per user/song and applies a per-user posting throttle.
- Review edit/delete operations are owner-only. Review likes require sign-in and block self-likes.
- The current admin token is a shared secret, not role-based admin identity. Rotate it if it is exposed and limit it to trusted operators.
## Catalogue schema extension

An additive extension is available at database/catalog-model-v2.sql. It adds:

- Album-to-artist credits for collaborations and shared releases.
- Album track listings so a canonical song can appear on more than one release.
- Song versions for Japanese / English versions, remixes, instrumentals, live versions, and other variants.
- Group membership history linking member artist records to group artist records.

This file depends on the normalized base schema in database/schema.sql. It is not a migration for the currently deployed legacy review table. Test it on a separate Neon branch and populate relationships only from verified source data. Do not guess track numbers, artist credits, or version relationships.

## User-submitted catalogue and admin review

The user submission flow is implemented with these files:

- `functions/api/catalog-submissions.js`: accepts song / album proposals and stores them as pending.
- `functions/api/admin/catalog-submissions.js`: lists pending proposals and allows an administrator to approve or reject them.
- `database/catalog-submissions.sql`: creates the pending-submission table and the approved album metadata table.
- The frontend provides “楽曲・アルバムを登録” and “管理者審査” actions.

### Required setup before deployment

1. In Neon, create a development branch / backup.
2. Run the complete contents of `database/catalog-submissions.sql` in the SQL Editor for the Neon branch used by the site. Do not skip this step.
3. In Cloudflare Pages → Settings → Variables and Secrets, add `STAGELOG_ADMIN_TOKEN` as a **secret** for Production (and Preview separately if needed). Use a long, random token. Never put it in the frontend, GitHub, or chat.
4. Keep `DATABASE_URL` configured as before and redeploy Pages.
5. Open the site, submit a test song, then open “管理者審査”, enter the admin token, and approve / reject the test submission.

### Current moderation behavior and limitations

- New submissions are not visible in the public song list until approved.
- Approved songs are inserted into the existing `artists` and `songs` tables, which the current song API already reads.
- Approved album metadata is stored in `stagelog_albums`; its approved track IDs are linked in the JSONB `track_song_ids` field.
- When an album is approved, its listed tracks are added to the song catalogue; existing same-title tracks for the same artist are reused.
- Admin access currently uses one server-side shared token (`STAGELOG_ADMIN_TOKEN`), not individual admin accounts. Replace this with role-based authentication before a larger public launch.
- Submitter notifications and a formal edit-request state are not yet implemented. The current catalogue UI provides artist, album and track browsing; full editorial metadata management remains a future enhancement.
