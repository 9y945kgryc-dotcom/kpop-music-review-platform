import { json, requireUser, sqlFor } from "../_lib/auth.js";
export async function onRequestGet(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);const sql=sqlFor(context);
    const rows=await sql`SELECT r.id,r.song_id,r.ratings,r.comment,r.created_at,s.title AS song_title,a.name AS artist_name FROM public.song_reviews r JOIN public.songs s ON s.id=r.song_id JOIN public.artists a ON a.id=s.artist_id WHERE r.user_id=${user.id} ORDER BY r.created_at DESC LIMIT 200`;
    return json(rows);
  }catch(error){console.error("GET /api/me/reviews failed:",error);return json({error:"レビュー履歴を取得できませんでした。"},500);}
}