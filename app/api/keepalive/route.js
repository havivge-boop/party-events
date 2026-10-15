import { supabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await supabase.from("events").select("id").limit(1);
  return NextResponse.json(
    { ok: !error, time: new Date().toISOString() },
    { status: error ? 500 : 200 }
  );
}
