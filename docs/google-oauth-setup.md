# STAGELOG Google OAuth setup

## Google Cloud Console
1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen (External for a public community site).
3. Create an OAuth Client ID of type Web application.
4. Add the exact authorized redirect URI:
   `https://kpop-music-review-platform.pages.dev/api/auth/callback`
5. Keep the Client Secret private.

## Cloudflare Pages environment
Set these values for the environment that will run this branch:
- `GOOGLE_CLIENT_ID`: OAuth Web Client ID
- `GOOGLE_CLIENT_SECRET`: OAuth Client Secret (Secret)
- `GOOGLE_REDIRECT_URI`: `https://kpop-music-review-platform.pages.dev/api/auth/callback`
- `DATABASE_URL`: connection string for the matching Neon branch

Do not commit credentials to GitHub or expose them in browser JavaScript.

## Database migration
Apply migrations in order to the target Neon branch:
1. `migrations/001_user_accounts.sql`
2. `migrations/002_profile_avatar.sql`

The current feature branch is intended for preview/testing. Do not apply the migrations to the production branch until preview testing is complete.

## Authentication behavior
- Google OpenID Connect authorization code flow with PKCE.
- OAuth state and nonce are stored in short-lived HttpOnly cookies.
- Google ID token is checked server-side using Google's tokeninfo endpoint.
- Application sessions are random opaque tokens; only SHA-256 hashes are stored in Neon.
- Session cookie is HttpOnly, Secure, SameSite=Lax, and expires after 30 days.
