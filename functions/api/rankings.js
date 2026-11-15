import { json, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{
    const sql=sqlFor(context);
    const rows=await sql`SELECT u.id,u.display_name,u.avatar_key,
      COUNT(DISTINCT r.id)::int AS review_count,
      COUNT(DISTINCT f.follower_id)::int AS follower_count,
      COUNT(DISTINCT n.id)::int AS received_notifications,
      MAX(r.created_at) AS last_review_at
      FROM public.users u
      LEFT JOIN public.song_reviews r ON r.user_id=u.id
      LEFT JOIN public.user_follows f ON f.following_id=u.id
      LEFT JOIN public.user_notifications n ON n.recipient_id=u.id
      GROUP BY u.id ORDER BY review_count DESC,follower_count DESC,u.created_at ASC LIMIT 50`;
    return json(rows.map((u,i)=>({...u,rank:i+1,activity_score:Number(u.review_count)*3+Number(u.follower_count)})));
  }catch(e){console.error("GET /api/rankings",e);return json({error:"ランキングを取得できませんでした。"},500);}
}
