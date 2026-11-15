import { json, requireUser, sqlFor } from "../_lib/auth.js";
export async function onRequestGet(context){
  try{
    const id=Number(context.params.id);if(!Number.isSafeInteger(id)||id<1)return json({error:"ユーザーIDが不正です。"},400);
    const sql=sqlFor(context),rows=await sql`SELECT id,display_name,avatar_url,avatar_key,bio,created_at FROM public.users WHERE id=${id} LIMIT 1`;
    if(!rows.length)return json({error:"ユーザーが見つかりません。"},404);
    const user=rows[0];
    const [reviews,favorites,counts,viewer]=await Promise.all([
      sql`SELECT r.id,r.song_id,r.ratings,r.comment,r.created_at,s.title AS song_title,a.name AS artist_name FROM public.song_reviews r JOIN public.songs s ON s.id=r.song_id JOIN public.artists a ON a.id=s.artist_id WHERE r.user_id=${id} ORDER BY r.created_at DESC LIMIT 100`,
      sql`SELECT f.target_type,f.target_id,CASE WHEN f.target_type='song' THEN s.title ELSE al.title END AS title,CASE WHEN f.target_type='song' THEN ar.name ELSE al.artist_name END AS artist FROM public.user_favorites f LEFT JOIN public.songs s ON f.target_type='song' AND s.id=f.target_id LEFT JOIN public.artists ar ON ar.id=s.artist_id LEFT JOIN public.stagelog_albums al ON f.target_type='album' AND al.id=f.target_id WHERE f.user_id=${id} ORDER BY f.created_at DESC LIMIT 100`,
      sql`SELECT (SELECT COUNT(*) FROM public.user_follows WHERE following_id=${id}) AS followers,(SELECT COUNT(*) FROM public.user_follows WHERE follower_id=${id}) AS following,(SELECT COUNT(*) FROM public.song_reviews WHERE user_id=${id}) AS reviews`,
      (async()=>{const me=await requireUser(context);if(!me)return null;const r=await sql`SELECT id FROM public.user_follows WHERE follower_id=${me.id} AND following_id=${id} LIMIT 1`;return {id:me.id,following:r.length>0};})()
    ]);
    return json({user, reviews, favorites, stats:counts[0], viewer});
  }catch(e){console.error("GET /api/users/[id]",e);return json({error:"プロフィールを取得できませんでした。"},500);}
}
