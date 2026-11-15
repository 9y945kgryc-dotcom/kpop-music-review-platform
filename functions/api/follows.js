import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const targetId=Number(new URL(context.request.url).searchParams.get("userId")||user.id);
    if(!Number.isSafeInteger(targetId)||targetId<1)return json({error:"ユーザーIDが不正です。"},400);
    const sql=sqlFor(context);
    const [followers,following]=await Promise.all([
      sql`SELECT u.id,u.display_name,u.avatar_key FROM public.user_follows f JOIN public.users u ON u.id=f.follower_id WHERE f.following_id=${targetId} ORDER BY f.created_at DESC LIMIT 200`,
      sql`SELECT u.id,u.display_name,u.avatar_key FROM public.user_follows f JOIN public.users u ON u.id=f.following_id WHERE f.follower_id=${targetId} ORDER BY f.created_at DESC LIMIT 200`
    ]);
    return json({followers,following});
  }catch(e){console.error("GET /api/follows",e);return json({error:"フォロー情報を取得できませんでした。"},500);}
}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),targetId=Number(body.userId);
    if(!Number.isSafeInteger(targetId)||targetId<1||targetId===Number(user.id))return json({error:"フォロー対象が不正です。"},400);
    const sql=sqlFor(context),target=await sql`SELECT id FROM public.users WHERE id=${targetId} LIMIT 1`;
    if(!target.length)return json({error:"ユーザーが見つかりません。"},404);
    const rows=await sql`INSERT INTO public.user_follows(follower_id,following_id) VALUES(${user.id},${targetId}) ON CONFLICT(follower_id,following_id) DO NOTHING RETURNING id`;
    if(rows.length)await sql`INSERT INTO public.user_notifications(recipient_id,actor_id,notification_type,message) VALUES(${targetId},${user.id},'follow','あなたをフォローしました')`;
    return json({ok:true,following:true},201);
  }catch(e){console.error("POST /api/follows",e);return json({error:"フォローできませんでした。"},500);}
}
export async function onRequestDelete(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),targetId=Number(body.userId);
    if(!Number.isSafeInteger(targetId)||targetId<1)return json({error:"ユーザーIDが不正です。"},400);
    const sql=sqlFor(context);await sql`DELETE FROM public.user_follows WHERE follower_id=${user.id} AND following_id=${targetId}`;
    return json({ok:true,following:false});
  }catch(e){console.error("DELETE /api/follows",e);return json({error:"フォロー解除に失敗しました。"},500);}
}
