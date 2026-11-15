import { neon } from "@neondatabase/serverless";
export function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}
export function sqlFor(context) {
  if(!context.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(context.env.DATABASE_URL);
}
export function cookies(request) {
  return Object.fromEntries((request.headers.get("Cookie")||"").split(";").map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf("=");return [v.slice(0,i),decodeURIComponent(v.slice(i+1))]}));
}
export function randomToken(bytes=32) {
  const a=new Uint8Array(bytes);crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export async function sha256(value) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function cookie(name,value,maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearCookie(name) { return cookie(name,"",0); }
export async function currentUser(context) {
  const token=cookies(context.request).stagelog_session;
  if(!token) return null;
  const sql=sqlFor(context);
  const hash=await sha256(token);
  const rows=await sql`
    SELECT u.id,u.email,u.display_name,u.avatar_key,u.bio
    FROM public.user_sessions s JOIN public.users u ON u.id=s.user_id
    WHERE s.token_hash=${hash} AND s.expires_at>NOW() LIMIT 1
  `;
  return rows[0]||null;
}
export async function requireUser(context) {
  const user=await currentUser(context);
  return user;
}
