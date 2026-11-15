import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function getSql(context) {
  const url = context.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export async function onRequestGet(context) {
  try {
    const sql = getSql(context);
    const rows = await sql`
      SELECT id, song_id, ratings, comment, created_at
      FROM song_reviews
      ORDER BY created_at DESC
      LIMIT 500
    `;
    return json(rows);
  } catch (error) {
    console.error("GET /api/reviews failed:", error);
    return json({ error: "Could not load reviews" }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const songId = Number(body.songId);
    const ratings = body.ratings;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!Number.isInteger(songId) || songId < 0 || songId > 10000) {
      return json({ error: "Invalid songId" }, 400);
    }
    if (!Array.isArray(ratings) || ratings.length !== 7 ||
        ratings.some(value => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 5 ||
          Math.round(Number(value) * 10) !== Number(value) * 10)) {
      return json({ error: "Ratings must contain seven values from 0.0 to 5.0 in 0.1 increments" }, 400);
    }
    if (comment.length > 2000) return json({ error: "Comment is too long" }, 400);

    const sql = getSql(context);
    const normalizedRatings = ratings.map(value => Number(Number(value).toFixed(1)));
    const rows = await sql`
      INSERT INTO song_reviews (song_id, ratings, comment)
      VALUES (${songId}, ${JSON.stringify(normalizedRatings)}::jsonb, ${comment})
      RETURNING id, song_id, ratings, comment, created_at
    `;
    return json(rows[0], 201);
  } catch (error) {
    console.error("POST /api/reviews failed:", error);
    return json({ error: "Could not save review" }, 500);
  }
}
