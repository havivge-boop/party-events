// הקובץ הזה יוצר "חיבור" אחד ל-Supabase שכל שאר הקבצים משתמשים בו.
// אין כאן שום דבר לשנות - הוא רק קורא את המפתחות מתוך .env.local

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
