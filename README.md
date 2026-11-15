# STAGELOG — K-POP Music Review Platform

K-POP楽曲を複数の観点で評価・レビューし、ファン同士で発見・比較できるレビューサイトです。

## Current prototype

- `index.html`: responsive visual prototype with search, artist filter, rankings, comparison, and 0.1-step review sliders.
- Current prototype reviews are stored in browser LocalStorage only. They are not shared between users yet.

## Planned backend

- **Hosting:** Vercel + Next.js
- **Database:** Neon PostgreSQL
- **Authentication:** Neon Auth (managed Better Auth)
- **Social login:** Google and Apple
- **Source control:** GitHub

See [Backend setup guide](docs/backend-setup.md) and [database schema](database/schema.sql).

## Review score model

Six independently rated categories (0.0–5.0, step 0.1):
1. Song structure and completeness
2. Sound and arrangement
3. Vocal and rap
4. Concept and originality
5. Expression and emotional delivery
6. Catchiness and memorability

The overall score is entered independently; it is not calculated as the average of the six category scores.

## Local environment

Copy `.env.example` to `.env.local` and fill in the Neon values. Never commit `.env.local` or real secrets.

The current repository is still a static prototype plus backend preparation files. The Next.js/Auth integration is the next implementation milestone.

## Deployment and commercial use

Vercel Hobby is for personal/non-commercial use. Upgrade to a suitable commercial plan before operating STAGELOG commercially.
