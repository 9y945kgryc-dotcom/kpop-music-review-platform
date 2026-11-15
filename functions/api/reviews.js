import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{const sql=sqlFor(context),viewer=await requireUser(context);const rows=await sql`SELECT r.id,r.song_id,r.ratings,r.comment,r.created_at,u.id AS user_id,u.display_name,u.avatar_url,u.avatar_key,COALESCE(l.like_count,0)::int AS like_count,COALESCE(v.liked,false) AS liked FROM public.song_reviews r LEFT JOIN public.users u ON u.id=r.user_id LEFT JOIN (SELECT review_id,COUNT(*) AS like_count FROM public.review_likes GROUP BY review_id) l ON l.review_id=r.id LEFT JOIN (SELECT review_id,true AS liked FROM public.review_likes WHERE user_id=${viewer?.id||0}) v ON v.review_id=r.id ORDER BY r.created_at DESC LIMIT 500`;return json(rows);}
  catch(error){console.error("GET /api/reviews failed:",error);return json({error:"Could not load reviews"},500);}
}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"レビュー投稿にはGoogleログインが必要です。"},401);
    const body=await context.request.json(),songId=Number(body.songId),ratings=body.ratings,comment=typeof body.comment==="string"?body.comment.trim():"";
    if(!Number.isInteger(songId)||songId<1)return json({error:"Invalid songId"},400);
    if(!Array.isArray(ratings)||ratings.length!==7||ratings.some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>5||Math.round(Number(v)*10)!==Number(v)*10))return json({error:"Ratings must contain seven values from 0.0 to 5.0 in 0.1 increments"},400);
    if(comment.length>2000)return json({error:"Comment is too long"},400);
    const sql=sqlFor(context),exists=await sql`SELECT id FROM public.songs WHERE id=${songId} LIMIT 1`;if(!exists.length)return json({error:"楽曲が見つかりません。"},404);
    const recent=await sql`SELECT COUNT(*)::int AS count FROM public.song_reviews WHERE user_id=${user.id} AND created_at>NOW()-INTERVAL '10 minutes'`;
    if(Number(recent[0]?.count||0)>=10)return json({error:"短時間のレビュー投稿が上限に達しました。少し時間をおいて再度お試しください。"},429);
    const normalized=ratings.map(v=>Number(Number(v).toFixed(1)));
    const rows=await sql`INSERT INTO public.song_reviews(song_id,user_id,ratings,comment)
      VALUES(${songId},${user.id},${JSON.stringify(normalized)}::jsonb,${comment})
      ON CONFLICT (user_id,song_id) WHERE user_id IS NOT NULL DO NOTHING
      RETURNING id,song_id,ratings,comment,created_at`;
    if(!rows.length)return json({error:"この楽曲のレビューはすでに投稿されています。既存のレビューを編集してください。"},409);
    await sql`INSERT INTO public.user_notifications(recipient_id,actor_id,notification_type,entity_id,message) SELECT follower_id,${user.id},'new_review',${rows[0].id},'フォロー中のユーザーが新しいレビューを投稿しました' FROM public.user_follows WHERE following_id=${user.id}`;
    return json(rows[0],201);
  }catch(error){console.error("POST /api/reviews failed:",error);return json({error:"Could not save review"},500);}
}
export async function onRequestPatch(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),id=Number(body.id),comment=typeof body.comment==="string"?body.comment.trim():"";
    if(!Number.isSafeInteger(id)||id<1||comment.length>2000)return json({error:"入力内容が不正です。"},400);
    const sql=sqlFor(context);
    if(body.ratings!==undefined){const r=body.ratings;if(!Array.isArray(r)||r.length!==7||r.some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>5||Math.round(Number(v)*10)!==Number(v)*10))return json({error:"評価は0〜5の0.1刻みで7項目入力してください。"},400);
      const rows=await sql`UPDATE public.song_reviews SET ratings=${JSON.stringify(r.map(v=>Number(Number(v).toFixed(1))))}::jsonb,comment=${comment} WHERE id=${id} AND user_id=${user.id} RETURNING id,song_id,ratings,comment,created_at`;
      if(!rows.length)return json({error:"レビューが見つかりません。"},404);return json(rows[0]);
    }
    const rows=await sql`UPDATE public.song_reviews SET comment=${comment} WHERE id=${id} AND user_id=${user.id} RETURNING id,song_id,ratings,comment,created_at`;
    if(!rows.length)return json({error:"レビューが見つかりません。"},404);return json(rows[0]);
  }catch(error){console.error("PATCH /api/reviews failed:",error);return json({error:"レビューを更新できませんでした。"},500);}
}
export async function onRequestDelete(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);const body=await context.request.json(),id=Number(body.id);if(!Number.isSafeInteger(id)||id<1)return json({error:"レビューIDが不正です。"},400);const sql=sqlFor(context);const rows=await sql`DELETE FROM public.song_reviews WHERE id=${id} AND user_id=${user.id} RETURNING id`;if(!rows.length)return json({error:"レビューが見つかりません。"},404);return json({ok:true});}
  catch(error){console.error("DELETE /api/reviews failed:",error);return json({error:"レビューを削除できませんでした。"},500);}
}
