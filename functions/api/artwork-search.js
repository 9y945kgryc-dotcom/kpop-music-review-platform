function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300, s-maxage=3600",...headers}});
}
function clean(value,max=120){return typeof value==="string"?value.trim().slice(0,max):"";}
function safeArtwork(value){
  try{
    const url=new URL(value);
    const appleHost=url.hostname==="mzstatic.com"||url.hostname.endsWith(".mzstatic.com")||url.hostname==="itunes.apple.com"||url.hostname.endsWith(".itunes.apple.com");
    const deezerHost=url.hostname==="cdn-images.dzcdn.net";
    if(!appleHost&&!deezerHost)return null;
    if(!["https:","http:"].includes(url.protocol))return null;
    url.protocol="https:";
    return url.toString();
  }catch{return null;}
}
function safeHttps(value){
  try{const url=new URL(value);return url.protocol==="https:"&&["music.apple.com","itunes.apple.com"].includes(url.hostname)?url.toString():null;}
  catch{return null;}
}
function mapApple(item,type){
  const artwork=item.artworkUrl512||item.artworkUrl100||item.artworkUrl60||"";
  const storeUrl=safeHttps(type==="song"?(item.trackViewUrl||item.collectionViewUrl):(item.collectionViewUrl||item.trackViewUrl));
  const collectionUrl=safeHttps(item.collectionViewUrl);
  return {
    source:"Apple Music",
    kind:type,
    artistName:clean(item.artistName,160),
    title:clean(type==="song"?(item.trackName||item.collectionName):(item.collectionName||item.trackName),180),
    collectionName:clean(item.collectionName,180),
    releaseDate:typeof item.releaseDate==="string"?item.releaseDate.slice(0,10):"",
    artworkUrl:safeArtwork(artwork),
    storeUrl,
    collectionUrl,
    trackCount:Number.isFinite(Number(item.trackCount))?Number(item.trackCount):null,
    country:clean(item.country,8)
  };
}
function mapDeezer(item,type){
  const album=type==="song"?(item.album||{}):item;
  const artist=type==="song"?(item.artist||{}):(item.artist||{});
  const artwork=album.cover_xl||album.cover_big||album.cover_medium||"";
  const deezerLink=type==="song"?item.link:(item.link||"");
  const collectionLink=album.link||"";
  const safeLink=value=>{try{const u=new URL(value);return u.protocol==="https:"&&u.hostname==="www.deezer.com"?u.toString():null}catch{return null}};
  return {
    source:"Deezer",
    kind:type,
    artistName:clean(artist.name,160),
    title:clean(type==="song"?item.title:album.title,180),
    collectionName:clean(album.title,180),
    releaseDate:"",
    artworkUrl:safeArtwork(artwork),
    storeUrl:safeLink(deezerLink),
    collectionUrl:safeLink(collectionLink),
    trackCount:Number.isFinite(Number(album.nb_tracks))?Number(album.nb_tracks):null,
    country:""
  };
}
async function searchDeezer(term,type){
  const endpoint=type==="song"?"track":"album";
  const url="https://api.deezer.com/search/"+endpoint+"?"+new URLSearchParams({q:term,limit:"12"}).toString();
  const response=await fetch(url,{headers:{Accept:"application/json"},cf:{cacheTtl:3600,cacheEverything:true}});
  if(!response.ok)throw new Error("Deezer Search API HTTP "+response.status);
  const data=await response.json();
  if(data.error)throw new Error(data.error.message||"Deezer Search API error");
  return (Array.isArray(data.data)?data.data:[]).map(item=>mapDeezer(item,type)).filter(item=>item.title&&item.artistName&&item.artworkUrl);
}
export async function onRequestGet(context){
  const requestUrl=new URL(context.request.url);
  const type=requestUrl.searchParams.get("type")==="song"?"song":"album";
  const artist=clean(requestUrl.searchParams.get("artist"),100);
  const title=clean(requestUrl.searchParams.get("title"),140);
  const country=(clean(requestUrl.searchParams.get("country"),2)||"jp").toLowerCase();
  if(!artist||!title)return json({error:"アーティスト名と作品名を入力してください。"},400,{"Cache-Control":"no-store"});
  if(!/^[a-z]{2}$/.test(country))return json({error:"国コードが正しくありません。"},400,{"Cache-Control":"no-store"});
  const term=[artist,title].filter(Boolean).join(" ");
  const params=new URLSearchParams({term,country,media:"music",entity:type==="song"?"song":"album",limit:"12",lang:"ja_jp"});
  let appleError=null;
  try{
    const response=await fetch("https://itunes.apple.com/search?"+params.toString(),{
      headers:{Accept:"application/json","User-Agent":"Mozilla/5.0 (compatible; K-REVIEW/1.0; +https://kpop-music-review-platform.pages.dev/)"},
      cf:{cacheTtl:3600,cacheEverything:true}
    });
    if(response.ok){
      const data=await response.json();
      const results=(Array.isArray(data.results)?data.results:[]).map(item=>mapApple(item,type)).filter(item=>item.title&&item.artworkUrl);
      if(results.length)return json({source:"Apple Music",results});
    }else{
      appleError="Apple Search API HTTP "+response.status;
      console.error(appleError,"retry-after:",response.headers.get("retry-after"));
    }
  }catch(error){appleError=String(error);console.error("Apple Search API failed:",error);}
  try{
    const results=await searchDeezer(term,type);
    if(results.length)return json({source:"Deezer",results,notice:"Apple Music検索が混雑しているため、Deezerのカタログから候補を表示しています。"});
    return json({source:"Deezer",results:[],notice:"Apple MusicとDeezerの両方で候補が見つかりませんでした。"});
  }catch(error){
    console.error("Deezer fallback failed:",error,"Apple result:",appleError);
    return json({error:"Apple MusicとDeezerのカタログ検索に接続できませんでした。時間をおいて再度お試しください。"},503,{"Cache-Control":"no-store","Retry-After":"60"});
  }
}
