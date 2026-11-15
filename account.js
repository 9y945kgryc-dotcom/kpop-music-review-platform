let stagelogUser=null;
async function stagelogRefreshAuth(){
  try{const r=await fetch('/api/auth/me');const d=await r.json();stagelogUser=d.user||null;}catch{stagelogUser=null;}
  const box=document.getElementById('stagelog-auth');if(!box)return;
  box.innerHTML=stagelogUser
    ? '<button onclick="stagelogOpenPage()">マイページ</button> <button onclick="stagelogLogout()">ログアウト</button>'
    : '<button onclick="location.href=\'/api/auth/google\'">Googleログイン</button>';
}
function stagelogModal(){
  let el=document.getElementById('stagelog-member-modal');if(el)return el;
  el=document.createElement('div');el.id='stagelog-member-modal';el.className='modal';
  el.innerHTML='<div class="dialog"><button class="close" onclick="stagelogClosePage()">閉じる ✕</button><h2>マイページ</h2><div id="stagelog-profile-summary"></div><h3>プロフィール編集</h3><p><label>表示名<br><input id="stagelog-name" maxlength="60" style="width:100%;padding:10px"></label></p><p><label>プロフィールアイコン<br><select id="stagelog-avatar"><option value="pink-star">🌸 ピンクスター</option><option value="purple-heart">💜 パープルハート</option><option value="blue-mic">🎤 ブルーマイク</option><option value="gold-crown">👑 ゴールドクラウン</option><option value="silver-moon">🌙 シルバームーン</option><option value="black-cat">🐈‍⬛ ブラックキャット</option></select></label></p><p><label>自己紹介<br><textarea id="stagelog-bio" maxlength="240"></textarea></label></p><button class="primary" onclick="stagelogSaveProfile()">保存</button><p id="stagelog-profile-msg" class="muted"></p><h3>自分のレビュー</h3><div id="stagelog-my-reviews"></div><h3>お気に入り楽曲・アルバム</h3><div id="stagelog-my-favorites"></div><h3>登録申請履歴</h3><div id="stagelog-my-submissions"></div></div>';
  document.body.appendChild(el);return el;
}
async function stagelogOpenPage(){
  if(!stagelogUser){if(confirm('Googleログインが必要です。ログインしますか？'))location.href='/api/auth/google';return;}
  stagelogModal().classList.add('open');
  const paths=['/api/profile','/api/me/reviews','/api/favorites','/api/me/submissions'];
  const rs=await Promise.all(paths.map(p=>fetch(p)));
  if(rs.some(r=>r.status===401)){alert('ログイン状態が切れました。再度ログインしてください。');return;}
  const [p,reviews,favs,subs]=await Promise.all(rs.map(r=>r.json())),u=p.user;
  document.getElementById('stagelog-profile-summary').innerHTML=(u.avatar_url?'<img src="'+stagelogEsc(u.avatar_url)+'" style="width:56px;height:56px;border-radius:50%">':'')+'<b>'+stagelogEsc(u.display_name)+'</b><div class="muted">'+stagelogEsc(u.email)+'</div>';
  document.getElementById('stagelog-name').value=u.display_name||'';
  document.getElementById('stagelog-bio').value=u.bio||'';document.getElementById('stagelog-avatar').value=u.avatar_key||'pink-star';
  document.getElementById('stagelog-my-reviews').innerHTML=reviews.length?reviews.map(x=>'<article class="review-entry"><b>'+stagelogEsc(x.song_title)+' — '+stagelogEsc(x.artist_name)+'</b><p>'+stagelogEsc(x.comment||'コメントなし')+'</p></article>').join(''):'<p class="muted">レビューはまだありません。</p>';
  document.getElementById('stagelog-my-favorites').innerHTML=favs.length?favs.map(x=>'<div class="rank">'+stagelogEsc(x.title)+' — '+stagelogEsc(x.artist||'')+' ('+stagelogEsc(x.target_type)+') <button onclick="stagelogFavorite(\''+x.target_type+'\','+x.target_id+',true)">解除</button></div>').join(''):'<p class="muted">お気に入りはまだありません。</p>';
  document.getElementById('stagelog-my-submissions').innerHTML=subs.length?subs.map(x=>'<article class="review-entry"><b>'+stagelogEsc(x.payload.title)+'</b><div class="muted">'+stagelogEsc(x.payload.artist)+' ・ '+stagelogEsc(x.status)+'</div></article>').join(''):'<p class="muted">申請履歴はありません。</p>';
}
function stagelogEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function stagelogClosePage(){document.getElementById('stagelog-member-modal')?.classList.remove('open');}
async function stagelogSaveProfile(){
  const r=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:document.getElementById('stagelog-name').value,bio:document.getElementById('stagelog-bio').value,avatarKey:document.getElementById('stagelog-avatar').value})});
  const d=await r.json();document.getElementById('stagelog-profile-msg').textContent=r.ok?'保存しました。':(d.error||'保存できませんでした。');
}
async function stagelogFavorite(type,id,remove=false){
  if(!stagelogUser){alert('Googleログインが必要です。');return;}
  const r=await fetch('/api/favorites',{method:remove?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetType:type,targetId:id})});
  if(!r.ok){const d=await r.json();alert(d.error||'更新できませんでした。');return;}await stagelogOpenPage();
}
async function stagelogLogout(){await fetch('/api/auth/logout',{method:'POST'});stagelogUser=null;await stagelogRefreshAuth();}
document.addEventListener('DOMContentLoaded',()=>{
  const h=document.querySelector('.top');if(h){const a=document.createElement('span');a.id='stagelog-auth';a.style.cssText='float:right;letter-spacing:0';h.appendChild(a);}
  stagelogRefreshAuth();
});
