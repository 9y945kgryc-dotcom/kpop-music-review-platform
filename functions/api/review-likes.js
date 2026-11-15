import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"いいねにはログインが必要です。"},401);
    const body=await context.request.json(),reviewId=Number(body.reviewId);
    if(!Number.isSafeInteger(reviewId)||reviewId<1)return json({error:"レビューIDが不正です。"},400);
    const sql=sqlFor(context);
    const rows=await sql`INSERT INTO public.review_likes(review_id,user_id) SELECT r.id,${user.id} FROM public.song_reviews r WHERE r.id=${reviewId} AND r.user_id<>${user.id} ON CONFLICT(review_id,user_id) DO NOTHING RETURNING review_id`;
    if(!rows.length){
      const exists=await sql`SELECT id FROM public.song_reviews WHERE id=${reviewId} LIMIT 1`;
      if(!exists.length)return json({error:"レビューが見つかりません。"},404);
      const owner=await sql`SELECT user_id FROM public.song_reviews WHERE id=${reviewId}`;
      if(Number(owner[0].user_id)===Number(user.id))return json({error:"自分のレビューにはいいねできません。"},400);
    }
    const count=await sql`SELECT COUNT(*)::int AS like_count FROM public.review_likes WHERE review_id=${reviewId}`;
    return json({ok:true,liked:true,like_count:count[0].like_count});
  }catch(e){console.error("POST /api/review-likes",e);return json({error:"いいねできませんでした。"},500);}
}
export async function onRequestDelete(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"いいねの取り消しにはログインが必要です。"},401);
    const body=await context.request.json(),reviewId=Number(body.reviewId);
    if(!Number.isSafeInteger(reviewId)||reviewId<1)return json({error:"レビューIDが不正です。"},400);
    const sql=sqlFor(context);
    await sql`DELETE FROM public.review_likes WHERE review_id=${reviewId} AND user_id=${user.id}`;
    const count=await sql`SELECT COUNT(*)::int AS like_count FROM public.review_likes WHERE review_id=${reviewId}`;
    return json({ok:true,liked:false,like_count:count[0].like_count});
  }catch(e){console.error("DELETE /api/review-likes",e);return json({error:"いいねを取り消せませんでした。"},500);}
}