import { neon } from "@neondatabase/serverless";

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function authorized(context){const expected=context.env.STAGELOG_ADMIN_TOKEN,supplied=context.request.headers.get("Authorization")||"";return !!expected&&supplied===`Bearer ${expected}`;}
function getSql(context){if(!context.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured");return neon(context.env.DATABASE_URL);}
function backfillEnabled(context){return context.env.STAGELOG_ARTWORK_BACKFILL_ENABLED==="true";}
function disabledResponse(){return json({error:"ジャケット補完機能は現在無効です。管理者がCloudflare Pagesの環境変数を確認してください。"},403);}
function safeUrl(value,kind){
  if(typeof value!=="string"||!value.trim())return null;
  try{
    const u=new URL(value);if(u.protocol!=="https:")return null;
    if(kind==="artwork")return u.hostname==="cdn-images.dzcdn.net"||u.hostname.endsWith(".dzcdn.net")?u.toString():null;
    if(kind==="deezer")return ["www.deezer.com","deezer.com"].includes(u.hostname)&&/^\/(?:[a-z]{2}\/)?(?:track|album)\/\d+\/?$/.test(u.pathname)?u.toString():null;
    return null;
  }catch{return null;}
}
export async function onRequestGet(context){
  if(!authorized(context))return json({error:"管理者認証に失敗しました。"},401);
  if(!backfillEnabled(context))return disabledResponse();
  try{
    const sql=getSql(context);
    const rows=await sql`
      SELECT id,title,artist_name,release_date,release_type,item_type
      FROM (
        SELECT id,title,artist_name,release_date,release_type,'album'::text AS item_type
        FROM public.stagelog_albums
        WHERE cover_image_url IS NULL OR BTRIM(cover_image_url)=''
        UNION ALL
        SELECT s.id,s.title,a.name AS artist_name,s.release_date,'single'::text AS release_type,'song'::text AS item_type
        FROM public.songs s JOIN public.artists a ON a.id=s.artist_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.stagelog_albums al
          WHERE al.track_song_ids @> to_jsonb(ARRAY[s.id])
        )
      ) missing
      ORDER BY release_date DESC NULLS LAST,title
      LIMIT 100
    `;
    return json(rows);
  }catch(error){console.error("GET /api/admin/catalog-artwork failed:",error);return json({error:"ジャケット未設定作品を取得できませんでした。"},500);}
}
export async function onRequestPatch(context){
  if(!authorized(context))return json({error:"管理者認証に失敗しました。"},401);
  if(!backfillEnabled(context))return disabledResponse();
  try{
    const body=await context.request.json(),id=Number(body.id),itemType=body.type==="song"?"song":"album";
    const artworkUrl=safeUrl(body.artworkUrl,"artwork"),deezerUrl=safeUrl(body.deezerUrl,"deezer");
    const collectionTitle=typeof body.collectionTitle==="string"?body.collectionTitle.trim().slice(0,160):"";
    if(!Number.isSafeInteger(id)||(itemType==="album"&&id<1)||(itemType==="song"&&id<0)||(!artworkUrl&&!deezerUrl))return json({error:"作品IDまたは保存するURLが正しくありません。"},400);
    const sql=getSql(context);
    if(itemType==="song"){
      const songs=await sql`SELECT s.id,s.title,a.name AS artist_name,s.release_date FROM public.songs s JOIN public.artists a ON a.id=s.artist_id WHERE s.id=${id} LIMIT 1`;
      if(!songs.length)return json({error:"対象楽曲が見つかりません。"},404);
      const song=songs[0];
      if(deezerUrl)await sql`UPDATE public.songs SET deezer_url=${deezerUrl} WHERE id=${id}`;
      if(!artworkUrl)return json({message:"Deezerリンクを保存しました。",songId:id});
      const linked=await sql`SELECT id FROM public.stagelog_albums WHERE track_song_ids @> to_jsonb(ARRAY[${id}]::int[]) ORDER BY id LIMIT 1`;
      if(linked.length){
        await sql`UPDATE public.stagelog_albums SET cover_image_url=${artworkUrl},deezer_url=COALESCE(${deezerUrl},deezer_url) WHERE id=${linked[0].id}`;
      }else{
        await sql`INSERT INTO public.stagelog_albums (title,artist_name,release_date,release_type,cover_image_url,track_song_ids,deezer_url)
          VALUES (${collectionTitle||song.title},${song.artist_name},${song.release_date||null},'single',${artworkUrl},${JSON.stringify([id])}::jsonb,${deezerUrl})`;
      }
      return json({message:"シングルのジャケット画像を保存しました。",songId:id});
    }
    const rows=await sql`UPDATE public.stagelog_albums
      SET cover_image_url=COALESCE(${artworkUrl},cover_image_url),
          deezer_url=COALESCE(${deezerUrl},deezer_url)
      WHERE id=${id}
      RETURNING id,title,artist_name,cover_image_url,deezer_url`;
    if(!rows.length)return json({error:"対象作品が見つかりません。"},404);
    return json({album:rows[0],message:"ジャケット画像を保存しました。"});
  }catch(error){console.error("PATCH /api/admin/catalog-artwork failed:",error);return json({error:"ジャケット画像を保存できませんでした。"},500);}
}
