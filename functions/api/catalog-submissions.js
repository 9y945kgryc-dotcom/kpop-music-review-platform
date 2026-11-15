import { json, requireUser, sqlFor } from "./_lib/auth.js";
function cleanText(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
function isAppleArtworkUrl(value){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&(
      url.hostname==="mzstatic.com"||url.hostname.endsWith(".mzstatic.com")||
      url.hostname==="itunes.apple.com"||url.hostname.endsWith(".itunes.apple.com")||url.hostname==="coverartarchive.org"||url.hostname.endsWith(".coverartarchive.org")||url.hostname==="archive.org"||url.hostname.endsWith(".archive.org")
    );
  }catch{return false;}
}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"楽曲・アルバムの登録申請にはGoogleログインが必要です。"},401);
    const body=await context.request.json(),type=body.type==="album"?"album":body.type==="song"?"song":null;
    const artist=cleanText(body.artist,120),title=cleanText(body.title,160),collectionTitle=cleanText(body.collectionTitle,160),releaseDate=cleanText(body.releaseDate,10),note=cleanText(body.note,1000),releaseType=cleanText(body.releaseType,40)||"album",coverImageUrl=cleanText(body.coverImageUrl,500),appleMusicUrl=cleanText(body.appleMusicUrl,500),musicbrainzUrl=cleanText(body.musicbrainzUrl,500);
    const tracks=Array.isArray(body.tracks)?body.tracks.map(x=>cleanText(x,160)).filter(Boolean).slice(0,60):[];
    const sql=sqlFor(context);
    const recent=await sql`SELECT COUNT(*)::int AS count FROM public.catalog_submissions WHERE user_id=${user.id} AND created_at>NOW()-INTERVAL '1 hour'`;
    if(Number(recent[0]?.count||0)>=5)return json({error:"登録申請は1時間に5件までです。時間をおいて再度お試しください。"},429);
    if(appleMusicUrl){try{const u=new URL(appleMusicUrl);if(u.protocol!=="https:"||!["music.apple.com","itunes.apple.com"].includes(u.hostname))return json({error:"Apple MusicのURLが正しくありません。"},400)}catch{return json({error:"Apple MusicのURLが正しくありません。"},400)}}
    if(!type||!artist||!title)return json({error:"種別・アーティスト名・タイトルは必須です。"},400);
    if(coverImageUrl&&!isAppleArtworkUrl(coverImageUrl))return json({error:"ジャケット画像はMusicBrainzの検索候補から選択してください。"},400);
    if(releaseDate&&!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate))return json({error:"発売日はYYYY-MM-DD形式で入力してください。"},400);
    if(type==="album"&&tracks.length===0)return json({error:"アルバムには1曲以上の収録曲が必要です。"},400);
    if(musicbrainzUrl){try{const u=new URL(musicbrainzUrl);if(u.protocol!=="https:"||u.hostname!=="musicbrainz.org")return json({error:"MusicBrainzのURLが正しくありません。"},400)}catch{return json({error:"MusicBrainzのURLが正しくありません。"},400)}}
    const payload={artist,title,collectionTitle,releaseDate:releaseDate||null,note,releaseType,coverImageUrl:coverImageUrl||null,appleMusicUrl:appleMusicUrl||null,musicbrainzUrl:musicbrainzUrl||null,tracks};
    const rows=await sql`INSERT INTO public.catalog_submissions(submission_type,payload,user_id) VALUES(${type},${JSON.stringify(payload)}::jsonb,${user.id}) RETURNING id,submission_type,status,created_at`;
    return json({message:"登録申請を受け付けました。管理者の確認後に公開されます。",submission:rows[0]},201);
  }catch(error){console.error("POST /api/catalog-submissions failed:",error);return json({error:"申請を保存できませんでした。管理者にお問い合わせください。"},500);}
}