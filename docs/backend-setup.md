# STAGELOG backend and deployment notes

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

1. Open the STAGELOG project in Neon Console.
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

## Current limitations

- The initial song-card list is still seeded in the frontend; it is not yet a full searchable catalogue.
- Reviews are shared through Neon, but the current API does not yet enforce signed-in user ownership.
- Authentication, review editing/deletion, moderation workflows, and rate limiting must be implemented before broad public launch.
- The normalized schema is a target model and has not yet been connected to the current Pages Function.

## Security checklist before public launch

- Keep DATABASE_URL in Cloudflare secrets only.
- Validate all request bodies on the server.
- Add authentication and ownership checks before allowing edits or deletes.
- Add rate limiting / abuse protection to review submission.
- Add moderation and reporting workflows.
- Test migrations on a separate Neon branch and retain backups.
## Catalogue schema extension

An additive extension is available at database/catalog-model-v2.sql. It adds:

- Album-to-artist credits for collaborations and shared releases.
- Album track listings so a canonical song can appear on more than one release.
- Song versions for Japanese / English versions, remixes, instrumentals, live versions, and other variants.
- Group membership history linking member artist records to group artist records.

This file depends on the normalized base schema in database/schema.sql. It is not a migration for the currently deployed legacy review table. Test it on a separate Neon branch and populate relationships only from verified source data. Do not guess track numbers, artist credits, or version relationships.