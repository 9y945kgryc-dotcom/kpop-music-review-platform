function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300, s-maxage=3600",...headers}});
}
function clean(value,max=120){return typeof value==="string"?value.trim().slice(0,max):"";}
function safeArtwork(value){
  try{
    const url=new URL(value);
    const appleHost=url.hostname==="mzstatic.com"||url.hostname.endsWith(".mzstatic.com")||url.hostname==="itunes.apple.com"||url.hostname.endsWith(".itunes.apple.com");
    if(!appleHost||!["https:","http:"].includes(url.protocol))return null;
    url.protocol="https:";
    return url.toString();
  }catch{return null;}
}
function safeHttps(value){
  try{const url=new URL(value);return url.protocol==="https:"&&["music.apple.com","itunes.apple.com"].includes(url.hostname)?url.toString():null;}
  catch{return null;}
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
  try{
    const response=await fetch("https://itunes.apple.com/search?"+params.toString(),{
      headers:{
        Accept:"application/json",
        "User-Agent":"Mozilla/5.0 (compatible; K-REVIEW/1.0; +https://kpop-music-review-platform.pages.dev/)"
      },
      cf:{cacheTtl:3600,cacheEverything:true}
    });
    if(!response.ok){
      console.error("Apple Search API returned HTTP",response.status,"retry-after:",response.headers.get("retry-after"));
      const limited=response.status===429;
      return json({error:limited
        ?"Apple Musicの検索が混み合っています。1分ほど待って再度お試しください。"
        :"Appleの音楽カタログ検索に接続できませんでした。時間をおいて再度お試しください。"},
        limited?503:502,
        {"Cache-Control":"no-store",...(limited?{"Retry-After":"60"}:{})});
    }
    const data=await response.json();
    const results=(Array.isArray(data.results)?data.results:[]).map(item=>{
      const artwork=item.artworkUrl512||item.artworkUrl100||item.artworkUrl60||"";
      const storeUrl=safeHttps(type==="song"?(item.trackViewUrl||item.collectionViewUrl):(item.collectionViewUrl||item.trackViewUrl));
      const collectionUrl=safeHttps(item.collectionViewUrl);
      return {
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
    }).filter(item=>item.title&&item.artworkUrl);
    return json({source:"Apple Music / iTunes Store",results});
  }catch(error){
    console.error("GET /api/artwork-search failed:",error);
    return json({error:"音楽カタログを検索できませんでした。通信状況を確認してください。"},502,{"Cache-Control":"no-store"});
  }
}
