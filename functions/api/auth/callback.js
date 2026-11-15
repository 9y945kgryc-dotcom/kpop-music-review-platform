import { json, cookies, cookie, clearCookie, randomToken, sha256, sqlFor } from "../_lib/auth.js";
export async function onRequestGet({request,env}){
  const c=cookies(request),u=new URL(request.url),code=u.searchParams.get("code"),state=u.searchParams.get("state");
  const clean=[clearCookie("stagelog_oauth_state"),clearCookie("stagelog_oauth_nonce"),clearCookie("stagelog_pkce")];
  const fail=(message)=>{const headers=new Headers({"Content-Type":"text/plain; charset=utf-8"});for(const item of clean)headers.append("Set-Cookie",item);return new Response(message,{status:400,headers});};
  if(u.searchParams.has("error")) return fail("Googleログインがキャンセルされました。サイトに戻って再度お試しください。");
  if(!code||!state||state!==c.stagelog_oauth_state||!c.stagelog_pkce||!c.stagelog_oauth_nonce) return fail("認証情報を確認できませんでした。最初からログインしてください。");
  try{
    const redirectUri=env.GOOGLE_REDIRECT_URI||new URL("/api/auth/callback",request.url).toString();
    const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:redirectUri,grant_type:"authorization_code",code_verifier:c.stagelog_pkce})});
    if(!tokenRes.ok) throw new Error("Google token exchange failed");
    const tokenData=await tokenRes.json();
    if(!tokenData.id_token) throw new Error("Missing Google ID token");
    const verifyRes=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(tokenData.id_token));
    if(!verifyRes.ok) throw new Error("Google ID token validation failed");
    const identity=await verifyRes.json();
    const validIssuer=["accounts.google.com","https://accounts.google.com"].includes(identity.iss);
    if(identity.aud!==env.GOOGLE_CLIENT_ID||!validIssuer||Number(identity.exp)<=Math.floor(Date.now()/1000)||identity.nonce!==c.stagelog_oauth_nonce||identity.email_verified!=="true"||!identity.sub||!identity.email) throw new Error("Google identity validation failed");
    const sql=sqlFor({env});
    const rows=await sql`
      INSERT INTO public.users(google_sub,email,display_name,avatar_url)
      VALUES(${identity.sub},${identity.email},'STAGELOG User',NULL)
      ON CONFLICT(google_sub) DO UPDATE SET email=EXCLUDED.email, avatar_url=NULL, updated_at=NOW()
      RETURNING id
    `;
    const session=randomToken(48),hash=await sha256(session);
    await sql`INSERT INTO public.user_sessions(user_id,token_hash,expires_at) VALUES(${rows[0].id},${hash},NOW()+INTERVAL '30 days')`;
    const headers=new Headers({Location:"/", "Cache-Control":"no-store"});
    for(const item of clean) headers.append("Set-Cookie",item);
    headers.append("Set-Cookie",cookie("stagelog_session",session,60*60*24*30));
    return new Response(null,{status:302,headers});
  }catch(error){
    console.error("Google OAuth callback failed:",error);
    return fail("Googleログインを完了できませんでした。設定を確認して再度お試しください。");
  }
}