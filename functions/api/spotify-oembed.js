function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function normalizeSpotifyUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.hostname!=="open.spotify.com")return null;
  const match=url.pathname.match(/^\/(track|album)\/([A-Za-z0-9]+)\/?$/);
  if(!match)return null;
  return {url:"https://open.spotify.com/"+match[1]+"/"+match[2],kind:match[1],id:match[2]};
 }catch{return null;}
}
export async function onRequestGet({request}){
 const input=new URL(request.url).searchParams.get("url")||"",normalized=normalizeSpotifyUrl(input);
 if(!normalized)return json({error:"Spotifyの楽曲またはアルバムのURLを入力してください。例：https://open.spotify.com/track/... または /album/..."},400);
 try{
  const endpoint="https://open.spotify.com/oembed?"+new URLSearchParams({url:normalized.url});
  const response=await fetch(endpoint,{headers:{Accept:"application/json"}});
  if(response.status===404)return json({error:"Spotifyで作品を確認できませんでした。URLまたは公開状態を確認してください。"},404);
  if(!response.ok)return json({error:"Spotifyの作品情報を取得できませんでした。時間をおいて再試行してください。"},502);
  const data=await response.json();
  if(data.provider_name!=="Spotify"||typeof data.title!=="string")return json({error:"Spotifyから有効な作品情報が返されませんでした。"},502);
  const embedMatch=typeof data.html==="string"?data.html.match(/src="(https:\/\/open\.spotify\.com\/embed\/(?:track|album)\/[A-Za-z0-9]+[^"]*)"/):null;
  return json({provider:"Spotify",kind:normalized.kind,id:normalized.id,url:normalized.url,title:data.title,embedUrl:embedMatch?embedMatch[1]:null,verified:true});
 }catch(error){return json({error:"Spotifyの作品情報を確認できませんでした。ネットワークを確認して再試行してください。"},502);}
}
