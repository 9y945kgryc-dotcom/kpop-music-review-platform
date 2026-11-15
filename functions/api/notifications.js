import { json, requireUser, sqlFor } from "./_lib/auth.js";
export async function onRequestGet(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const sql=sqlFor(context);
    const rows=await sql`SELECT n.id,n.notification_type,n.entity_id,n.message,n.created_at,n.read_at,u.id AS actor_id,u.display_name AS actor_name,u.avatar_key AS actor_avatar FROM public.user_notifications n LEFT JOIN public.users u ON u.id=n.actor_id WHERE n.recipient_id=${user.id} ORDER BY n.created_at DESC LIMIT 100`;
    const unread=rows.filter(x=>!x.read_at).length;return json({notifications:rows,unread});
  }catch(e){console.error("GET /api/notifications",e);return json({error:"通知を取得できませんでした。"},500);}
}
export async function onRequestPatch(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);
    const body=await context.request.json(),id=body.id===undefined?null:Number(body.id),sql=sqlFor(context);
    if(id===null)await sql`UPDATE public.user_notifications SET read_at=NOW() WHERE recipient_id=${user.id} AND read_at IS NULL`;
    else if(Number.isSafeInteger(id)&&id>0)await sql`UPDATE public.user_notifications SET read_at=NOW() WHERE id=${id} AND recipient_id=${user.id}`;
    else return json({error:"通知IDが不正です。"},400);
    return json({ok:true});
  }catch(e){console.error("PATCH /api/notifications",e);return json({error:"通知を更新できませんでした。"},500);}
}
