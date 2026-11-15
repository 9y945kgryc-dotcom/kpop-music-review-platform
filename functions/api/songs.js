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
      WITH review_weights AS (
        SELECT
          r.id,
          r.song_id,
          (r.ratings->>6)::numeric AS score,
          (COALESCE(t.trust_weight, 1.000)::numeric *
            (1 + LEAST(0.500, LN(1 + COALESCE(l.received_likes, 0)) * 0.080))::numeric) AS weight
        FROM public.song_reviews r
        LEFT JOIN public.user_rating_trust t ON t.user_id = r.user_id
        LEFT JOIN (
          SELECT r2.user_id, COUNT(*)::int AS received_likes
          FROM public.review_likes l2
          JOIN public.song_reviews r2 ON r2.id = l2.review_id
          GROUP BY r2.user_id
        ) l ON l.user_id = r.user_id
        WHERE r.ratings ? '6'
          AND (r.ratings->>6) ~ '^[0-5]([.][0-9]+)?$'
      ),
      global_baseline AS (
        SELECT COALESCE(
          SUM(score * weight) / NULLIF(SUM(weight), 0),
          3.5
        ) AS baseline
        FROM review_weights
      ),
      song_scores AS (
        SELECT
          song_id,
          COUNT(*)::int AS review_count,
          SUM(weight) AS effective_review_count,
          SUM(score * weight) / NULLIF(SUM(weight), 0) AS weighted_raw_score,
          AVG(score) AS raw_score
        FROM review_weights
        GROUP BY song_id
      )
      SELECT
        s.id,
        s.title,
        a.name AS artist,
        s.spotify_url,
        s.apple_music_url,
        COALESCE(ss.review_count, 0)::int AS review_count,
        ROUND(ss.raw_score, 1) AS raw_score,
        ROUND(
          (COALESCE(ss.weighted_raw_score, gb.baseline) * COALESCE(ss.effective_review_count, 0)
            + gb.baseline * 5.0)
          / (COALESCE(ss.effective_review_count, 0) + 5.0),
          2
        ) AS overall_score,
        ROUND(COALESCE(ss.effective_review_count, 0), 2) AS effective_review_count
      FROM public.songs s
      JOIN public.artists a ON a.id = s.artist_id
      LEFT JOIN song_scores ss ON ss.song_id = s.id
      CROSS JOIN global_baseline gb
      ORDER BY a.name, s.title
    `;
    return json(rows);
  } catch (error) {
    console.error("GET /api/songs failed:", error);
    return json({ error: "Could not load songs" }, 500);
  }
}
