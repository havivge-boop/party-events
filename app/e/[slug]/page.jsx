import { supabase } from "../../../lib/supabase";
import EventView from "./EventView";
import GolanTripView from "./GolanTripView";

export default async function EventPage({ params }) {
  const { slug } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0B0B10] text-white flex items-center justify-center px-6 text-center">
        <p>האירוע לא נמצא. ודאו שהקישור נכון.</p>
      </div>
    );
  }

  // בוחרים איזה עיצוב להציג לפי סוג האירוע
  if (slug === "golan-trip") {
    return <GolanTripView event={event} />;
  }

  return <EventView event={event} />;
}
