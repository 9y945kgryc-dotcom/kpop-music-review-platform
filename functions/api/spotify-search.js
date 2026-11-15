function json(data,status=200,ttl=120){
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":ttl?`public, max-age=30, s-maxage=${ttl}, stale-while-revalidate=120`:"no-store"}});
}
function clean(value,max=180){return typeof value==="string"?value.trim().slice(0,max):"";}
async function spotifyToken(env){
 const clientId=env.SPOTIFY_CLIENT_ID,clientSecret=env.SPOTIFY_CLIENT_SECRET;
 if(!clientId||!clientSecret){const error=new Error("Spotify APIの認証情報が設定されていません。Cloudflare PagesのPreview環境にもSPOTIFY_CLIENT_IDとSPOTIFY_CLIENT_SECRETを設定してください。");error.status=503;throw error;}
 const cache=typeof caches!=="undefined"?caches.default:null,key=new Request("https://kreview-internal-cache.example/spotify-token");
 if(cache){const hit=await cache.match(key);if(hit){const data=await hit.json();if(data.access_token)return data.access_token;}}
 const basic=btoa(clientId+":"+clientSecret);
 const response=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{"Authorization":"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
 if(!response.ok){const error=new Error("Spotify認証に失敗しました。Developer Dashboardのアプリ設定とAPI利用条件を確認してください。");error.status=response.status===401?503:502;throw error;}
 const data=await response.json();if(!data.access_token)throw new Error("Spotifyからアクセストークンを取得できませんでした。");
 if(cache)await cache.put(key,new Response(JSON.stringify({access_token:data.access_token}),{headers:{"Cache-Control":"max-age="+Math.max(60,Number(data.expires_in||3600)-120)}}));
 return data.access_token;
}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),q=clean(url.searchParams.get("q"),120),type=url.searchParams.get("type")==="album"?"album":"track";
 if(q.length<2)return json({error:"2文字以上入力してください。"},400,0);
 const cache=typeof caches!=="undefined"?caches.default:null,cacheUrl=new URL("/__cache/spotify-search",url.origin);cacheUrl.search=new URLSearchParams({q:q.toLowerCase(),type}).toString();
 if(cache){const hit=await cache.match(cacheUrl);if(hit)return hit;}
 try{
  const token=await spotifyToken(env),params=new URLSearchParams({q,type,limit:"15",market:"JP"});
  const response=await fetch("https://api.spotify.com/v1/search?"+params.toString(),{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
  if(!response.ok){const error=new Error(response.status===403?"Spotify APIへのアクセスが許可されていません。Developer Modeの利用条件・アプリ権限を確認してください。":"Spotify検索に失敗しました。");error.status=response.status===429?429:502;throw error;}
  const data=await response.json(),items=type==="album"?(data.albums?.items||[]):(data.tracks?.items||[]);
  const results=items.map(item=>({source:"Spotify",kind:type==="album"?"album":"song",title:clean(item.name),artistName:clean((item.artists||[]).map(x=>x.name).join(", ")),albumTitle:type==="album"?clean(item.name):clean(item.album?.name),releaseDate:clean((type==="album"?item.release_date:item.album?.release_date)||"",10),storeUrl:clean(item.external_urls?.spotify,500),spotifyId:clean(item.id,100),durationMs:type==="track"?Number(item.duration_ms)||null:null})).filter(x=>x.title&&x.storeUrl);
  const result=json({provider:"Spotify",query:q,resultCount:results.length,results,notice:"Spotify公式カタログの検索結果です。作品を確認してから登録申請してください。"});
  if(cache)await cache.put(cacheUrl,result.clone());return result;
 }catch(error){return json({error:error.message||"Spotify検索に接続できませんでした。",provider:"Spotify"},error.status||502,0);}
}
