// זה הקובץ שאחראי על הכתובת: yoursite.com/e/rooftop-summer
// ה-[slug] בשם התיקייה אומר ל-Next.js: "כל מה שיבוא כאן, תני לי בתור פרמטר"

import { supabase } from "../../../lib/supabase";
import EventView from "./EventView";

export default async function EventPage({ params }) {
  const { slug } = await params;

  // שולפים מה-Supabase את האירוע עם ה-slug הזה
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  // אם לא נמצא אירוע כזה - מציגים הודעה פשוטה
  if (!event) {
    return (
      <div className="min-h-screen bg-[#0B0B10] text-white flex items-center justify-center px-6 text-center">
        <p>האירוע לא נמצא. ודאו שהקישור נכון.</p>
      </div>
    );
  }

  // מעבירים את הנתונים לקומפוננטת התצוגה (הקובץ EventView.jsx)
  return <EventView event={event} />;
}
