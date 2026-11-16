import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);const sql=sqlFor(context);
    const rows=await sql`SELECT f.id,f.target_type,f.target_id,f.created_at,
      CASE WHEN f.target_type='song' THEN s.title ELSE al.title END AS title,
      CASE WHEN f.target_type='song' THEN ar.name ELSE al.artist_name END AS artist
      FROM public.user_favorites f
      LEFT JOIN public.songs s ON f.target_type='song' AND s.id=f.target_id
      LEFT JOIN public.artists ar ON ar.id=s.artist_id
      LEFT JOIN public.stagelog_albums al ON f.target_type='album' AND al.id=f.target_id
      WHERE f.user_id=${user.id} ORDER BY f.created_at DESC`;
    return json(rows);
  }catch(error){console.error("GET /api/favorites failed:",error);return json({error:"お気に入りを取得できませんでした。"},500);}
}
export async function onRequestPost(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),type=body.targetType,id=Number(body.targetId);
    if(!["song","album"].includes(type)||!Number.isSafeInteger(id)||id<0)return json({error:"登録対象が不正です。"},400);
    const sql=sqlFor(context);
    const found=type==="song"?await sql`SELECT id FROM public.songs WHERE id=${id} LIMIT 1`:await sql`SELECT id FROM public.stagelog_albums WHERE id=${id} LIMIT 1`;
    if(!found.length)return json({error:"対象が見つかりません。"},404);
    const rows=await sql`INSERT INTO public.user_favorites(user_id,target_type,target_id) VALUES(${user.id},${type},${id}) ON CONFLICT(user_id,target_type,target_id) DO NOTHING RETURNING id`;
    return json({ok:true,added:rows.length>0},201);
  }catch(error){console.error("POST /api/favorites failed:",error);return json({error:"お気に入りに追加できませんでした。"},500);}
}
export async function onRequestDelete(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),type=body.targetType,id=Number(body.targetId);
    if(!["song","album"].includes(type)||!Number.isSafeInteger(id)||id<0)return json({error:"登録対象が不正です。"},400);
    const sql=sqlFor(context);await sql`DELETE FROM public.user_favorites WHERE user_id=${user.id} AND target_type=${type} AND target_id=${id}`;
    return json({ok:true});
  }catch(error){console.error("DELETE /api/favorites failed:",error);return json({error:"お気に入りを解除できませんでした。"},500);}
}