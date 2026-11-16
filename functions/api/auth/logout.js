import { json, cookies, sha256, sqlFor, clearCookie } from "../_lib/auth.js";
export async function onRequestPost(context){
  try{
    const token=cookies(context.request).stagelog_session;
    if(token){const sql=sqlFor(context);await sql`DELETE FROM public.user_sessions WHERE token_hash=${await sha256(token)}`;}
    return json({ok:true},200,{"Set-Cookie":clearCookie("stagelog_session")});
  }catch(error){console.error("POST /api/auth/logout failed:",error);return json({error:"ログアウトに失敗しました。"},500);}
}