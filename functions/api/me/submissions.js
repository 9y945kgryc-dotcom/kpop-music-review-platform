import { json, requireUser, sqlFor } from "../_lib/auth.js";
export async function onRequestGet(context){
  try{const user=await requireUser(context);if(!user)return json({error:"ログインが必要です。"},401);const sql=sqlFor(context);
    const rows=await sql`SELECT id,submission_type,payload,status,admin_note,created_at,reviewed_at FROM public.catalog_submissions WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 200`;
    return json(rows);
  }catch(error){console.error("GET /api/me/submissions failed:",error);return json({error:"申請履歴を取得できませんでした。"},500);}
}