import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function onRequestGet(context) {
  try {
    if (!context.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    const sql = neon(context.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, title, artist_name, release_date, release_type, cover_image_url, track_song_ids, spotify_url, apple_music_url, created_at
      FROM public.stagelog_albums
      ORDER BY release_date DESC NULLS LAST, created_at DESC
      LIMIT 100
    `;
    return json(rows);
  } catch (error) {
    console.error("GET /api/albums failed:", error);
    return json({ error: "Could not load albums" }, 500);
  }
}
