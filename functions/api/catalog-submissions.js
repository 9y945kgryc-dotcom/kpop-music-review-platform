import { json, requireUser, sqlFor } from "./_lib/auth.js";
function cleanText(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
function isAllowedArtworkUrl(value){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&(url.hostname==="cdn-images.dzcdn.net"||url.hostname.endsWith(".dzcdn.net"));
  }catch{return false;}
}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"楽曲・アルバムの登録申請にはGoogleログインが必要です。"},401);
    const body=await context.request.json(),type=body.type==="album"?"album":body.type==="song"?"song":null;
    const artist=cleanText(body.artist,120),title=cleanText(body.title,160),collectionTitle=cleanText(body.collectionTitle,160),releaseDate=cleanText(body.releaseDate,10),note=cleanText(body.note,1000),releaseType=cleanText(body.releaseType,40)||"album",coverImageUrl=cleanText(body.coverImageUrl,500),deezerUrl=cleanText(body.deezerUrl,500);
    const tracks=Array.isArray(body.tracks)?body.tracks.map(x=>cleanText(x,160)).filter(Boolean).slice(0,60):[];
    const sql=sqlFor(context);
    const recent=await sql`SELECT COUNT(*)::int AS count FROM public.catalog_submissions WHERE user_id=${user.id} AND created_at>NOW()-INTERVAL '1 hour'`;
    if(Number(recent[0]?.count||0)>=5)return json({error:"登録申請は1時間に5件までです。時間をおいて再度お試しください。"},429);
    if(!type||!artist||!title)return json({error:"種別・アーティスト名・タイトルは必須です。"},400);
    if(coverImageUrl&&!isAllowedArtworkUrl(coverImageUrl))return json({error:"ジャケット画像はDeezerの検索候補から選択してください。"},400);
    if(releaseDate&&!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate))return json({error:"発売日はYYYY-MM-DD形式で入力してください。"},400);
    if(type==="album"&&tracks.length===0)return json({error:"アルバムには1曲以上の収録曲が必要です。"},400);
    if(deezerUrl){
      try{
        const u=new URL(deezerUrl),expected=type==="album"?"album":"track",match=u.pathname.match(/^\/(?:[a-z]{2}\/)?(track|album)\/\d+\/?$/);
        if(u.protocol!=="https:"||!["www.deezer.com","deezer.com"].includes(u.hostname)||!match||match[1]!==expected)return json({error:"Deezerの作品URLが正しくありません。"},400);
      }catch{return json({error:"Deezerの作品URLが正しくありません。"},400);}
    }
    if(type==="album"){
      const existingAlbum=await sql`SELECT id FROM public.stagelog_albums WHERE LOWER(BTRIM(artist_name))=LOWER(BTRIM(${artist})) AND LOWER(BTRIM(title))=LOWER(BTRIM(${title})) AND (release_date IS NOT DISTINCT FROM ${releaseDate||null}::date OR ${releaseDate||null}::date IS NULL OR release_date IS NULL) LIMIT 1`;
      if(existingAlbum.length)return json({error:"このアーティスト・アルバム名の作品はすでに登録されています。既存アルバムを確認してください。",duplicate:true,existingId:existingAlbum[0].id},409);
    }
    const pendingDuplicate=await sql`SELECT id FROM public.catalog_submissions WHERE submission_type=${type} AND status='pending' AND LOWER(BTRIM(payload->>'artist'))=LOWER(BTRIM(${artist})) AND LOWER(BTRIM(payload->>'title'))=LOWER(BTRIM(${title})) AND (${type}='song' OR COALESCE(payload->>'releaseDate','')=COALESCE(${releaseDate},'')) LIMIT 1`;
    if(pendingDuplicate.length)return json({error:"同じ内容の登録申請がすでに審査待ちです。重ねて申請する必要はありません。",duplicate:true,submissionId:pendingDuplicate[0].id},409);
    const payload={artist,title,collectionTitle,releaseDate:releaseDate||null,note,releaseType,coverImageUrl:coverImageUrl||null,deezerUrl:deezerUrl||null,tracks};
    const rows=await sql`INSERT INTO public.catalog_submissions(submission_type,payload,user_id) VALUES(${type},${JSON.stringify(payload)}::jsonb,${user.id}) RETURNING id,submission_type,status,created_at`;
    return json({message:"登録申請を受け付けました。管理者の確認後に公開されます。",submission:rows[0]},201);
  }catch(error){console.error("POST /api/catalog-submissions failed:",error);return json({error:"申請を保存できませんでした。管理者にお問い合わせください。"},500);}
}