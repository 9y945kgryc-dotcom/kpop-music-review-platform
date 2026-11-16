import { json, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{
    const sql=sqlFor(context);
    const rows=await sql`WITH likes AS (
      SELECT r.user_id,COUNT(l.review_id)::int AS received_likes
      FROM public.song_reviews r LEFT JOIN public.review_likes l ON l.review_id=r.id
      GROUP BY r.user_id
    ), review_counts AS (
      SELECT user_id,COUNT(*)::int AS review_count,MAX(created_at) AS last_review_at
      FROM public.song_reviews GROUP BY user_id
    ), follow_counts AS (
      SELECT following_id,COUNT(*)::int AS follower_count FROM public.user_follows GROUP BY following_id
    )
    SELECT u.id,u.display_name,u.avatar_key,u.avatar_url,
      COALESCE(rc.review_count,0)::int AS review_count,
      COALESCE(fc.follower_count,0)::int AS follower_count,
      COALESCE(l.received_likes,0)::int AS received_likes,
      ROUND((1+LEAST(0.500,LN(1+COALESCE(l.received_likes,0))*0.080))::numeric,3) AS like_coefficient,
      rc.last_review_at
    FROM public.users u
    LEFT JOIN review_counts rc ON rc.user_id=u.id
    LEFT JOIN follow_counts fc ON fc.following_id=u.id
    LEFT JOIN likes l ON l.user_id=u.id
    ORDER BY received_likes DESC,review_count DESC,follower_count DESC,u.created_at ASC LIMIT 50`;
    return json(rows.map((u,i)=>({...u,rank:i+1,activity_score:Number(u.review_count)*3+Number(u.follower_count)+Number(u.received_likes)*2})));
  }catch(e){console.error("GET /api/rankings",e);return json({error:"ランキングを取得できませんでした。"},500);}
}
