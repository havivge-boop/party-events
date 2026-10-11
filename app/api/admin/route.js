import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();

  if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let res;
  switch (body.action) {
    case "login":
      return NextResponse.json({ data: true });
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
    default:
      return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ data: res.data });
}
