import { neon } from "@neondatabase/serverless";
import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{
    const sql=sqlFor(context);
    const rows=await sql`SELECT r.id,r.song_id,r.ratings,r.comment,r.created_at,u.display_name,u.avatar_url FROM public.song_reviews r LEFT JOIN public.users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 500`;
    return json(rows);
  }catch(error){console.error("GET /api/reviews failed:",error);return json({error:"Could not load reviews"},500);}
}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"レビュー投稿にはGoogleログインが必要です。"},401);
    const body=await context.request.json(),songId=Number(body.songId),ratings=body.ratings,comment=typeof body.comment==="string"?body.comment.trim():"";
    if(!Number.isInteger(songId)||songId<0||songId>10000)return json({error:"Invalid songId"},400);
    if(!Array.isArray(ratings)||ratings.length!==7||ratings.some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>5||Math.round(Number(v)*10)!==Number(v)*10))return json({error:"Ratings must contain seven values from 0.0 to 5.0 in 0.1 increments"},400);
    if(comment.length>2000)return json({error:"Comment is too long"},400);
    const sql=sqlFor(context),normalized=ratings.map(v=>Number(Number(v).toFixed(1)));
    const rows=await sql`INSERT INTO public.song_reviews(song_id,user_id,ratings,comment) VALUES(${songId},${user.id},${JSON.stringify(normalized)}::jsonb,${comment}) RETURNING id,song_id,ratings,comment,created_at`;
    return json(rows[0],201);
  }catch(error){console.error("POST /api/reviews failed:",error);return json({error:"Could not save review"},500);}
}