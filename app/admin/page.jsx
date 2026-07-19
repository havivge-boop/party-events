"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0B0B10] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h1 className="text-lg font-bold mb-4">כניסת מנהל</h1>
          <input
            type="password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            placeholder="סיסמה"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none mb-3"
          />
          <button
            onClick={() => passInput === ADMIN_PASSWORD && setAuthed(true)}
            className="w-full rounded-xl bg-white text-black font-bold py-3 text-sm"
          >
            כניסה
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  // שדות הטופס ליצירת אירוע חדש
  const [form, setForm] = useState({
    slug: "",
    name: "",
    cover_image: "",
    event_date: "",
    event_time: "",
    location_name: "",
    waze_link: "",
    description: "",
    important_info: "",
    bit_link: "",
    price: "",
    pickup_points: "", // מזינים מופרד בפסיקים, נהפוך למערך לפני השמירה
  });
  const [saved, setSaved] = useState(false);

  // טוענים את רשימת האירועים הקיימים ברגע שהעמוד נפתח
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data || []);
  }

  async function loadGuests(event) {
    setSelectedEvent(event);
    setActiveTab("all");
    const { data } = await supabase.from("guests").select("*").eq("event_id", event.id);
    setGuests(data || []);
  }

  async function createEvent() {
    const payload = {
      ...form,
      pickup_points: form.pickup_points
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    };
    const { error } = await supabase.from("events").insert(payload);
    if (!error) {
      setSaved(true);
      loadEvents();
    } else {
      alert("שגיאה: " + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white px-5 py-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">ניהול אירועים</h1>

      {/* יצירת אירוע חדש */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-8">
        <h2 className="font-semibold mb-3">אירוע חדש</h2>
        <div className="flex flex-col gap-2">
          <Field label="קישור (slug, אנגלית בלי רווחים)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="rooftop-summer" />
          <Field label="שם האירוע" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="קישור לתמונת קאבר" value={form.cover_image} onChange={(v) => setForm({ ...form, cover_image: v })} />
          <Field label="תאריך (YYYY-MM-DD)" value={form.event_date} onChange={(v) => setForm({ ...form, event_date: v })} placeholder="2026-08-07" />
          <Field label="שעה" value={form.event_time} onChange={(v) => setForm({ ...form, event_time: v })} placeholder="21:30" />
          <Field label="שם המיקום" value={form.location_name} onChange={(v) => setForm({ ...form, location_name: v })} />
          <Field label="קישור Waze" value={form.waze_link} onChange={(v) => setForm({ ...form, waze_link: v })} />
          <Field label="תיאור" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
          <Field label="פרטים חשובים" value={form.important_info} onChange={(v) => setForm({ ...form, important_info: v })} textarea />
<Field label="קישור לתשלום (משולם)" value={form.bit_link} onChange={(v) => setForm({ ...form, bit_link: v })} />          <Field label="מחיר (טקסט חופשי)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="80 ₪" />
          <Field label="נקודות איסוף (מופרד בפסיקים)" value={form.pickup_points} onChange={(v) => setForm({ ...form, pickup_points: v })} placeholder="כיכר רבין, קניון עזריאלי" />
        </div>
        <button onClick={createEvent} className="w-full mt-4 rounded-xl bg-white text-black font-bold py-3 text-sm">
          שמור אירוע
        </button>
        {saved && <p className="text-xs text-[#C6FF3E] mt-2">האירוע נשמר! הקישור: /e/{form.slug}</p>}
      </div>

      {/* רשימת אירועים קיימים */}
      <h2 className="font-semibold mb-3">האירועים שלי</h2>
      <div className="flex flex-col gap-2 mb-8">
        {events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => loadGuests(ev)}
            className="text-right rounded-xl bg-white/5 border border-white/10 p-3 text-sm"
          >
            {ev.name} <span className="text-white/40">— /e/{ev.slug}</span>
          </button>
        ))}
      </div>

      {/* רשימת נרשמים לאירוע שנבחר */}
      {selectedEvent && (
        <div>
          <h2 className="font-semibold mb-3">נרשמים ל-{selectedEvent.name} ({guests.length})</h2>

          {/* טאבים */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === "all" ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
            >
              הכל
            </button>
            {(selectedEvent.pickup_points || []).map((p) => (
              <button
                key={p}
                onClick={() => setActiveTab(p)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === p ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setActiveTab("alone")}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === "alone" ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
            >
              מגיעים לבד
            </button>
          </div>

          {/* טבלה מסוננת לפי הטאב */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/10 text-white/60 text-xs">
                <tr>
                  <th className="p-3">שם</th>
                  <th className="p-3">טלפון</th>
                  <th className="p-3">תאריך לידה</th>
                  <th className="p-3">כרטיסים</th>
                  <th className="p-3">פרטי כרטיסים נוספים</th>
                  <th className="p-3">הסעה</th>
                </tr>
              </thead>
              <tbody>
                {guests
                  .filter((g) => {
                    if (activeTab === "all") return true;
                    if (activeTab === "alone") return !g.needs_transport;
                    return g.needs_transport && g.pickup_point === activeTab;
                  })
                  .map((g) => (
                    <tr key={g.id} className="border-t border-white/10">
                      <td className="p-3">{g.name}</td>
                      <td className="p-3">{g.phone || "—"}</td>
                      <td className="p-3">{g.ticket_count || 1}</td>
                      <td className="p-3">{g.needs_transport ? g.pickup_point : "מגיע/ה לבד"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
     </div> 
  );
}

// שדה טופס קטן וחוזר על עצמו, כדי לא לשכפל קוד
function Field({ label, value, onChange, placeholder, textarea }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
        />
      )}
    </div>
  );
}
