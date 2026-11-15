import { neon } from "@neondatabase/serverless";

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function authorized(context){const expected=context.env.STAGELOG_ADMIN_TOKEN,supplied=context.request.headers.get("Authorization")||"";return !!expected&&supplied===`Bearer ${expected}`;}
function getSql(context){if(!context.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured");return neon(context.env.DATABASE_URL);}
function safeUrl(value,kind){
  if(typeof value!=="string"||!value.trim())return null;
  try{const u=new URL(value);if(u.protocol!=="https:")return null;
    if(kind==="artwork")return u.hostname==="mzstatic.com"||u.hostname.endsWith(".mzstatic.com")?u.toString():null;
    if(kind==="apple")return ["music.apple.com","itunes.apple.com"].includes(u.hostname)?u.toString():null;
    if(kind==="spotify")return u.hostname==="open.spotify.com"?u.toString():null;
    return null;
  }catch{return null;}
}
export async function onRequestGet(context){
  if(!authorized(context))return json({error:"管理者認証に失敗しました。"},401);
  try{
    const sql=getSql(context);
    const rows=await sql`SELECT id,title,artist_name,release_date,release_type
      FROM public.stagelog_albums
      WHERE cover_image_url IS NULL OR BTRIM(cover_image_url)=''
      ORDER BY release_date DESC NULLS LAST,created_at DESC
      LIMIT 100`;
    return json(rows);
  }catch(error){console.error("GET /api/admin/catalog-artwork failed:",error);return json({error:"ジャケット未設定作品を取得できませんでした。"},500);}
}
export async function onRequestPatch(context){
  if(!authorized(context))return json({error:"管理者認証に失敗しました。"},401);
  try{
    const body=await context.request.json(),id=Number(body.id);
    const artworkUrl=safeUrl(body.artworkUrl,"artwork"),appleMusicUrl=safeUrl(body.appleMusicUrl,"apple"),spotifyUrl=safeUrl(body.spotifyUrl,"spotify");
    if(!Number.isSafeInteger(id)||id<1||!artworkUrl)return json({error:"作品IDまたはジャケット画像URLが正しくありません。"},400);
    const sql=getSql(context);
    const rows=await sql`UPDATE public.stagelog_albums
      SET cover_image_url=${artworkUrl},
          apple_music_url=COALESCE(${appleMusicUrl},apple_music_url),
          spotify_url=COALESCE(${spotifyUrl},spotify_url)
      WHERE id=${id}
      RETURNING id,title,artist_name,cover_image_url,apple_music_url`;
    if(!rows.length)return json({error:"対象作品が見つかりません。"},404);
    return json({album:rows[0],message:"ジャケット画像を保存しました。"});
  }catch(error){console.error("PATCH /api/admin/catalog-artwork failed:",error);return json({error:"ジャケット画像を保存できませんでした。"},500);}
}
