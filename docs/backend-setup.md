# STAGELOG backend setup

## Chosen stack

- Next.js on Vercel for the web app and server-side routes.
- Neon PostgreSQL for relational data and SQL-based review rankings.
- Neon Auth (managed Better Auth) for Google and Apple sign-in.
- GitHub for source control and deployment integration.

The current `index.html` is the visual prototype. It is not yet connected to authentication or a database. The SQL schema in `database/schema.sql` is the proposed application data model.

## 1. Create the Neon project

1. Sign in at https://console.neon.tech/.
2. Create a project named `stagelog`.
3. Choose a region close to the expected audience and application region. Keep Vercel and Neon geographically close where practical.
4. Copy the pooled PostgreSQL connection string. Store it as `DATABASE_URL` in Vercel and local `.env.local`.
5. Enable Neon Auth for the project/branch and copy its Auth URL to `NEXT_PUBLIC_NEON_AUTH_URL`.

Do not paste database passwords, API keys, OAuth client secrets, or complete connection strings into chat or commit them to GitHub.

## 2. Configure social sign-in

In the Neon Console, open the project's Auth / Better Auth settings.

- Enable Google and Apple providers.
- Create OAuth credentials in Google Cloud Console and Apple Developer configuration.
- Register the exact callback/redirect URI shown by Neon for each provider. Do not guess the callback URL.
- Add the local development origin and the production domain to the trusted origins / allowed domains.
- For Apple, configure the Services ID, Team ID, Key ID, and private key as required by the Neon provider setup.

Start with Google in development if Apple credentials are not ready; add Apple before public launch.

## 3. Apply the application schema

Open Neon SQL Editor for the development branch and run `database/schema.sql`.

The schema creates:
- User profiles linked to Neon Auth user IDs (no passwords or OAuth tokens are stored in the app schema).
- Artists, albums, songs, and song-to-artist credits.
- One review per user per song.
- Six independent category scores plus a separately entered overall score, each in 0.1 increments.
- Likes, favorite songs, comments, follows, and moderation reports.
- A view for published review aggregates and rankings.

The schema is a starting point. Before production, add authorization policies/secure server-side query functions for every write operation and test ownership checks.

## 4. Environment variables

Copy `.env.example` to `.env.local` for local work. Add the same values to Vercel Project Settings → Environment Variables.

- `NEXT_PUBLIC_NEON_AUTH_URL`: Neon Auth endpoint for the relevant branch.
- `DATABASE_URL`: pooled Neon PostgreSQL connection string; server-only.
- `NEXT_PUBLIC_APP_URL`: local or production canonical URL.

Use separate Neon branches and Auth URLs for development/preview and production.

## 5. Deploy

1. Import this GitHub repository into Vercel.
2. Configure environment variables for Preview and Production separately.
3. Set the correct OAuth redirect URLs and trusted origins for each environment.
4. Deploy and test sign-in, sign-out, profile creation, and review ownership.
5. Keep the Vercel Hobby plan only for personal/non-commercial testing. Vercel's terms restrict Hobby to personal or non-commercial use; move to Pro before operating STAGELOG commercially.

## Cost controls

- Start on Neon Free and monitor compute hours, storage, and network transfer.
- Keep the database pooled connection string server-side.
- Avoid storing large images in PostgreSQL; use object storage or image URLs.
- Paginate reviews and comments; index filter/sort columns.
- Add usage alerts and backups before inviting a wider audience.

## Next implementation milestone

Convert the existing static prototype into a Next.js app, integrate the current Neon Auth SDK for Google/Apple OAuth, then replace browser-only LocalStorage review persistence with authenticated server-side PostgreSQL operations.
