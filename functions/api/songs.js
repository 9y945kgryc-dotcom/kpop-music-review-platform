import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestGet(context) {
  try {
    const url = context.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    const sql = neon(url);
    const rows = await sql`
      SELECT
        s.id,
        s.title,
        a.name AS artist,
        s.spotify_url,
        s.apple_music_url,
        COUNT(r.id)::int AS review_count,
        ROUND(AVG((r.ratings->>6)::numeric), 1) AS overall_score
      FROM public.songs s
      JOIN public.artists a ON a.id = s.artist_id
      LEFT JOIN public.song_reviews r ON r.song_id = s.id
      GROUP BY s.id, s.title, a.name
      ORDER BY a.name, s.title
    `;
    return json(rows);
  } catch (error) {
    console.error("GET /api/songs failed:", error);
    return json({ error: "Could not load songs" }, 500);
  }
}
