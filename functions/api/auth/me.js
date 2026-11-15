import { json, currentUser } from "../_lib/auth.js";
export async function onRequestGet(context){
  try{return json({user:await currentUser(context)});}
  catch(error){console.error("GET /api/auth/me failed:",error);return json({error:"ログイン状態を確認できませんでした。"},500);}
}