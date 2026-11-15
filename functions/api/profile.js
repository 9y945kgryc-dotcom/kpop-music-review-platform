import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);const sql=sqlFor(context);const rows=await sql`WITH likes AS (SELECT COUNT(*)::int AS received_likes FROM public.review_likes l JOIN public.song_reviews r ON r.id=l.review_id WHERE r.user_id=${user.id}) SELECT received_likes,ROUND((1+LEAST(0.500,LN(1+received_likes)*0.080))::numeric,3) AS like_coefficient FROM likes`;return json({user,stats:rows[0]});}
  catch(error){console.error("GET /api/profile failed:",error);return json({error:"プロフィールを取得できませんでした。"},500);}
}
export async function onRequestPatch(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json();
    const displayName=typeof body.displayName==="string"?body.displayName.trim().slice(0,60):"";
    const bio=typeof body.bio==="string"?body.bio.trim().slice(0,240):"";
    const allowedAvatars=["pink-star","purple-heart","blue-mic","gold-crown","silver-moon","black-cat"];
    const avatarKey=allowedAvatars.includes(body.avatarKey)?body.avatarKey:"pink-star";
    if(!displayName)return json({error:"表示名を入力してください。"},400);
    const sql=sqlFor(context);
    const rows=await sql`UPDATE public.users SET display_name=${displayName},bio=${bio},avatar_key=${avatarKey},updated_at=NOW() WHERE id=${user.id} RETURNING id,email,display_name,avatar_url,avatar_key,bio`;
    return json({user:rows[0]});
  }catch(error){console.error("PATCH /api/profile failed:",error);return json({error:"プロフィールを更新できませんでした。"},500);}
}