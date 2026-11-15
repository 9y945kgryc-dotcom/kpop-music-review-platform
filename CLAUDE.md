# Claude Code Instructions — STAGELOG

## Mission
Implement a site-wide UI/UX redesign of STAGELOG. The scope is **ALL user-facing screens and states**, not only the homepage. Work only on the branch `claude/site-wide-redesign`.

## Production safety — non-negotiable
- Never commit, push, or merge to `main`.
- Never deploy to production or change Cloudflare Pages production settings.
- Never access, print, copy, rotate, or modify production secrets, OAuth credentials, or the production Neon database.
- Do not run migrations or destructive SQL. Do not change database schemas, API contracts, authentication/session logic, authorization, or business rules as part of this design task.
- Do not remove existing features to simplify the redesign.
- Do not make external service calls that create, delete, or modify real user data.
- Submit all work through a Pull Request targeting `main`; leave it unmerged for review.

## Existing architecture — preserve it
- Frontend: a static `index.html` application with HTML/CSS/JavaScript.
- Backend: Cloudflare Pages Functions under `functions/api/*`.
- Database: Neon PostgreSQL via `@neondatabase/serverless`.
- Hosting: Cloudflare Pages project `kpop-music-review-platform`.
- Production branch: `main`.
- Existing Google OAuth, profiles, favorites, reviews, review edit/delete, follow, rankings, notifications, submission/review workflow, artist/album/song navigation, Spotify/Apple Music embeds, and trust-weighted rating API must continue working.
- Keep the current static HTML + Pages Functions architecture. Do not migrate to React, Next.js, Vite, or another framework; do not add a build step unless the repository already requires it.

## Redesign scope — ALL
Audit and improve every user-facing surface, including:
- Global header/navigation, homepage hero, search, filters, catalogue/list cards.
- Artist, album, and song discovery/detail views.
- Review composition, rating controls, review lists, edit/delete states.
- Login/authentication prompts and account/profile pages.
- Favorites, follows, public profiles, user rankings, notifications.
- Submission forms, submission history, and pending/approved/rejected states.
- Embedded music player presentation (Spotify/Apple Music).
- Empty, loading, error, success, disabled, and permission-denied states.
- Mobile layouts and touch interactions, tablet, desktop, accessibility and reduced-motion behavior.

## Design direction
Create a cohesive, premium K-pop music editorial/review experience: confident typography, strong editorial hierarchy, refined spacing, consistent component language, high-quality responsive layouts, and a distinctive visual identity. Avoid generic admin-dashboard styling and avoid excessive gradients, pills, glass effects, or decorative clutter. Maintain readability and clear affordances. Use Japanese as the primary UI language where the existing product does.

## Implementation rules
1. First inspect the whole repository and map every screen, route, modal, API call, and interaction before editing.
2. Preserve existing DOM IDs, data attributes, API paths, request/response shapes, and JS event hooks unless a change is essential; if so, document it and prove compatibility.
3. Prefer CSS and presentation-layer changes. Keep business logic changes out of scope.
4. Do not hardcode fake reviews, users, ratings, artists, or production data. Use existing API data and honest empty states.
5. Do not introduce API keys, credentials, secrets, or environment-specific URLs in source.
6. Keep keyboard navigation, visible focus, semantic labels, sufficient contrast, and `prefers-reduced-motion` support.
7. Ensure layouts work at narrow mobile widths (320–390px), tablet, and desktop. Avoid horizontal overflow.
8. Keep third-party embeds functional and responsive.
9. Do not overwrite unrelated work or revert existing features.
10. If a requested design improvement requires backend/schema/auth changes, stop and describe the dependency instead of making that change.

## Validation required before PR is ready
- Review the full diff for accidental API/auth/data changes.
- Check HTML/CSS/JS syntax and any available repository checks.
- Test every existing interaction path, including logged-out states; do not claim authenticated workflows were tested unless they actually were.
- Check mobile and desktop layouts and empty/loading/error states.
- Verify the app still calls the existing Pages Functions endpoints without changing their contracts.
- Document what was changed, what was tested, known limitations, and any follow-up work.

## Delivery
- Commit only to `claude/site-wide-redesign`.
- Open or update a draft Pull Request targeting `main`.
- Do not merge it. Wait for maintainer review and approval.
- Include a concise summary and a checklist of manual preview checks in the PR description.
