import { randomToken, cookie } from "../_lib/auth.js";
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
export async function onRequestGet({request,env}){
  if(!env.GOOGLE_CLIENT_ID)return new Response(JSON.stringify({error:"Googleログインの設定が未完了です。"}),{status:503,headers:{"Content-Type":"application/json"}});
  const state=randomToken(),nonce=randomToken(),verifier=randomToken(48);
  const challenge=b64url(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
  const redirectUri=env.GOOGLE_REDIRECT_URI||new URL("/api/auth/callback",request.url).toString();
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",scope:"openid email profile",state,nonce,code_challenge:challenge,code_challenge_method:"S256",prompt:"select_account"}).toString();
  const headers=new Headers({Location:url.toString(),"Cache-Control":"no-store"});
  headers.append("Set-Cookie",cookie("stagelog_oauth_state",state,600));
  headers.append("Set-Cookie",cookie("stagelog_oauth_nonce",nonce,600));
  headers.append("Set-Cookie",cookie("stagelog_pkce",verifier,600));
  return new Response(null,{status:302,headers});
}