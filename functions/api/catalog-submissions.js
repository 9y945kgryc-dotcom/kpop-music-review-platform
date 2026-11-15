import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function getSql(context) {
  if (!context.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(context.env.DATABASE_URL);
}
function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const type = body.type === "album" ? "album" : body.type === "song" ? "song" : null;
    const artist = cleanText(body.artist, 120);
    const title = cleanText(body.title, 160);
    const releaseDate = cleanText(body.releaseDate, 10);
    const note = cleanText(body.note, 1000);
    const releaseType = cleanText(body.releaseType, 40) || "album";
    const coverImageUrl = cleanText(body.coverImageUrl, 500);
    const tracks = Array.isArray(body.tracks) ? body.tracks.map(x => cleanText(x, 160)).filter(Boolean).slice(0, 60) : [];

    if (!type || !artist || !title) return json({ error: "種別・アーティスト名・タイトルは必須です。" }, 400);
    if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return json({ error: "発売日はYYYY-MM-DD形式で入力してください。" }, 400);
    if (type === "album" && tracks.length === 0) return json({ error: "アルバムには1曲以上の収録曲が必要です。" }, 400);

    const payload = { artist, title, releaseDate: releaseDate || null, note, releaseType, coverImageUrl: coverImageUrl || null, tracks };
    const sql = getSql(context);
    const rows = await sql`
      INSERT INTO public.catalog_submissions (submission_type, payload)
      VALUES (${type}, ${JSON.stringify(payload)}::jsonb)
      RETURNING id, submission_type, status, created_at
    `;
    return json({ message: "登録申請を受け付けました。管理者の確認後に公開されます。", submission: rows[0] }, 201);
  } catch (error) {
    console.error("POST /api/catalog-submissions failed:", error);
    return json({ error: "申請を保存できませんでした。管理者にお問い合わせください。" }, 500);
  }
}
