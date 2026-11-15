import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function authorized(context) {
  const expected = context.env.STAGELOG_ADMIN_TOKEN;
  const supplied = context.request.headers.get("Authorization") || "";
  return !!expected && supplied === `Bearer ${expected}`;
}
function getSql(context) {
  if (!context.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(context.env.DATABASE_URL);
}

export async function onRequestGet(context) {
  if (!authorized(context)) return json({ error: "管理者認証に失敗しました。" }, 401);
  try {
    const sql = getSql(context);
    const rows = await sql`
      SELECT id, submission_type, payload, status, admin_note, created_at
      FROM public.catalog_submissions
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 100
    `;
    return json(rows);
  } catch (error) {
    console.error("GET /api/admin/catalog-submissions failed:", error);
    return json({ error: "申請一覧を取得できませんでした。" }, 500);
  }
}

export async function onRequestPatch(context) {
  if (!authorized(context)) return json({ error: "管理者認証に失敗しました。" }, 401);
  try {
    const body = await context.request.json();
    const id = Number(body.id);
    const decision = body.decision;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    if (!Number.isSafeInteger(id) || id < 1 || !["approve", "reject"].includes(decision)) return json({ error: "申請IDまたは処理内容が不正です。" }, 400);

    const sql = getSql(context);
    const pending = await sql`SELECT * FROM public.catalog_submissions WHERE id = ${id} AND status = 'pending' LIMIT 1`;
    if (!pending.length) return json({ error: "申請が見つからないか、すでに処理されています。" }, 404);
    const submission = pending[0];
    const p = submission.payload || {};

    if (decision === "approve") {
      // The live prototype schema is artists(id,name) and songs(id,title,artist_id).
      // Reuse an existing artist name to avoid duplicate artist records.
      const found = await sql`SELECT id FROM public.artists WHERE LOWER(name) = LOWER(${p.artist}) LIMIT 1`;
      let artistId;
      if (found.length) artistId = found[0].id;
      else {
        const insertedArtist = await sql`INSERT INTO public.artists (name) VALUES (${p.artist}) RETURNING id`;
        artistId = insertedArtist[0].id;
      }

      if (submission.submission_type === "song") {
        const duplicate = await sql`SELECT id FROM public.songs WHERE LOWER(title) = LOWER(${p.title}) AND artist_id = ${artistId} LIMIT 1`;
        if (duplicate.length) return json({ error: "同じアーティスト・曲名の楽曲がすでに登録されています。重複を確認してください。" }, 409);
        await sql`INSERT INTO public.songs (title, artist_id) VALUES (${p.title}, ${artistId})`;
      } else {
        const trackIds = [];
        for (const trackTitle of (Array.isArray(p.tracks) ? p.tracks : [])) {
          const duplicate = await sql`SELECT id FROM public.songs WHERE LOWER(title) = LOWER(${trackTitle}) AND artist_id = ${artistId} LIMIT 1`;
          if (duplicate.length) trackIds.push(duplicate[0].id);
          else {
            const insertedSong = await sql`INSERT INTO public.songs (title, artist_id) VALUES (${trackTitle}, ${artistId}) RETURNING id`;
            trackIds.push(insertedSong[0].id);
          }
        }
        await sql`
          INSERT INTO public.stagelog_albums (title, artist_name, release_date, release_type, cover_image_url, track_song_ids)
          VALUES (${p.title}, ${p.artist}, ${p.releaseDate || null}, ${p.releaseType || "album"}, ${p.coverImageUrl || null}, ${JSON.stringify(trackIds)}::jsonb)
        `;
      }
    }

    const updated = await sql`
      UPDATE public.catalog_submissions
      SET status = ${decision === "approve" ? "approved" : "rejected"},
          admin_note = ${note},
          reviewed_at = NOW()
      WHERE id = ${id} AND status = 'pending'
      RETURNING id, status, reviewed_at
    `;
    if (submission.user_id) {
      await sql`INSERT INTO public.user_notifications(recipient_id,actor_id,notification_type,entity_id,message)
        VALUES(${submission.user_id},NULL,${decision === "approve" ? "submission_approved" : "submission_rejected"},${id},${decision === "approve" ? "登録申請が承認され、公開されました。" : "登録申請が却下されました。管理者メモをご確認ください。"})`;
    }
    return json({ submission: updated[0], message: decision === "approve" ? "承認して公開しました。" : "申請を却下しました。" });
  } catch (error) {
    console.error("PATCH /api/admin/catalog-submissions failed:", error);
    return json({ error: "申請を処理できませんでした。データベースのテーブル構造を確認してください。" }, 500);
  }
}
