import { json, requireUser, sqlFor } from "./_lib/auth.js";
function cleanText(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
export async function onRequestPost(context){
  try{
    const user=await requireUser(context);if(!user)return json({error:"楽曲・アルバムの登録申請にはGoogleログインが必要です。"},401);
    const body=await context.request.json(),type=body.type==="album"?"album":body.type==="song"?"song":null;
    const artist=cleanText(body.artist,120),title=cleanText(body.title,160),collectionTitle=cleanText(body.collectionTitle,160),releaseDate=cleanText(body.releaseDate,10),note=cleanText(body.note,1000),releaseType=cleanText(body.releaseType,40)||"album",coverImageUrl=cleanText(body.coverImageUrl,500),spotifyUrl=cleanText(body.spotifyUrl,500),appleMusicUrl=cleanText(body.appleMusicUrl,500);
    const tracks=Array.isArray(body.tracks)?body.tracks.map(x=>cleanText(x,160)).filter(Boolean).slice(0,60):[];
    for(const [label,value] of [["Spotify",spotifyUrl],["Apple Music",appleMusicUrl]]){if(value){try{const u=new URL(value);const valid=label==="Spotify"?u.hostname==="open.spotify.com":["music.apple.com","itunes.apple.com"].includes(u.hostname);if(!valid||u.protocol!=="https:")return json({error:label+"のURLが正しくありません。"},400)}catch{return json({error:label+"のURLが正しくありません。"},400)}}}
    if(!type||!artist||!title)return json({error:"種別・アーティスト名・タイトルは必須です。"},400);\n    if(coverImageUrl){try{if(new URL(coverImageUrl).protocol!=="https:")return json({error:"ジャケット画像URLはHTTPSで指定してください。"},400)}catch{return json({error:"ジャケット画像URLが正しくありません。"},400)}}
    if(releaseDate&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(releaseDate))return json({error:"発売日はYYYY-MM-DD形式で入力してください。"},400);
    if(type==="album"&&tracks.length===0)return json({error:"アルバムには1曲以上の収録曲が必要です。"},400);
    const payload={artist,title,collectionTitle,releaseDate:releaseDate||null,note,releaseType,coverImageUrl:coverImageUrl||null,spotifyUrl:spotifyUrl||null,appleMusicUrl:appleMusicUrl||null,tracks},sql=sqlFor(context);
    const rows=await sql`INSERT INTO public.catalog_submissions(submission_type,payload,user_id) VALUES(${type},${JSON.stringify(payload)}::jsonb,${user.id}) RETURNING id,submission_type,status,created_at`;
    return json({message:"登録申請を受け付けました。管理者の確認後に公開されます。",submission:rows[0]},201);
  }catch(error){console.error("POST /api/catalog-submissions failed:",error);return json({error:"申請を保存できませんでした。管理者にお問い合わせください。"},500);}
}