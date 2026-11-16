import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();

  if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (body.action === "login") return NextResponse.json({ data: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "חסר משתנה: " + (!url ? "NEXT_PUBLIC_SUPABASE_URL " : "") + (!key ? "SUPABASE_SERVICE_ROLE_KEY" : "") },
      { status: 500 }
    );
  }
  const db = createClient(url, key);

  let res;
  switch (body.action) {
    case "list":
      res = await db.from("guests").select("*").eq("event_id", body.eventId).order("created_at");
      break;
    case "add":
      res = await db.from("guests").insert(body.data).select().single();
      break;
    case "update":
      res = await db.from("guests").update(body.data).eq("id", body.id).select().single();
      break;
    case "delete":
      res = await db.from("guests").delete().eq("id", body.id);
      break;
    case "deleteEvent": {
      // מחיקת אירוע - דורש אימות כפול: הקלדת שם האירוע המדויק + הקלדת הסיסמה מחדש
      if (body.confirmPassword !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: "הסיסמה לאימות שגויה" }, { status: 401 });
      }
      const ev = await db.from("events").select("id, name").eq("id", body.eventId).single();
      if (ev.error || !ev.data) {
        return NextResponse.json({ error: "האירוע לא נמצא" }, { status: 404 });
      }
      if ((body.confirmName || "").trim() !== (ev.data.name || "").trim()) {
        return NextResponse.json({ error: "שם האירוע שהוקלד לא תואם" }, { status: 400 });
      }
      const g = await db.from("guests").delete().eq("event_id", ev.data.id);
      if (g.error) return NextResponse.json({ error: g.error.message }, { status: 500 });
      res = await db.from("events").delete().eq("id", ev.data.id);
      break;
    }
    default:
      return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ data: res.data });
}
