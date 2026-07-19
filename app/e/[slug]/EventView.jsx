"use client";
// "use client" חובה כאן כי יש state (useState) ואינטראקציה - הקובץ הקודם (page.jsx)
// הוא "server component" (רץ בשרת), הקובץ הזה רץ בדפדפן של המשתמש.

import React, { useState, useEffect } from "react";
import { MapPin, Calendar, Clock, Navigation, Bus, Check, ChevronDown } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function EventView({ event }) {
const [needsTransport, setNeedsTransport] = useState(null);
  const [pickup, setPickup] = useState("");
  const [name, setName] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [ticketDetails, setTicketDetails] = useState([]);

  useEffect(() => {
    const target = Math.max(0, ticketCount - 1);
    setTicketDetails((prev) => {
      const next = [...prev];
      while (next.length < target) next.push({ name: "", birthDate: "", phone: "" });
      while (next.length > target) next.pop();
      return next;
    });
  }, [ticketCount]);

  function updateTicketDetail(index, field, value) {
    setTicketDetails((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
    const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim().length > 1 && needsTransport !== null && (!needsTransport || pickup);

  // הפונקציה הזו רצה כשלוחצים "שמור את הפרטים שלי"
  // היא כותבת שורה חדשה בטבלת guests ב-Supabase
  async function handleSubmit() {
    setSaving(true);
    setError("");
    const { error } = await supabase.from("guests").insert({
      event_id: event.id,
      name: name.trim(),
      ticket_count: ticketCount,
      phone: phone.trim(),
      birth_date: birthDate,
      ticket_details: ticketDetails,
      needs_transport: needsTransport,
      pickup_point: needsTransport ? pickup : null,
    });

    setSaving(false);
    if (error) {
      setError("משהו השתבש, נסו שוב");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#0B0B10] text-[#F5F3EF] pb-28" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* HERO - תמונת הקאבר והשם */}
      <div className="relative h-[52vh] min-h-[380px] w-full overflow-hidden">
        <img src={event.cover_image} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 flex items-end justify-between gap-3">
          <h1 className="text-[38px] leading-[0.95] font-black tracking-tight uppercase" style={{ letterSpacing: "-0.02em" }}>
            {event.name}
          </h1>
          <img
            src="https://i.postimg.cc/NFzjDpzM/1000159751-removebg-preview.png"
            alt="לוגו"
            className="w-20 h-20 object-contain flex-shrink-0"
          />
          />
        </div>
      </div>

      {/* כרטיס פרטים: תאריך, שעה, מיקום */}
      <div className="relative -mt-3 mx-4">
        <div className="rounded-2xl bg-[#15151C] border border-white/10 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/10 divide-x-reverse">
            <div className="p-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
                <Calendar size={11} /> תאריך
              </span>
              <span className="text-sm font-semibold">{event.event_date}</span>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
                <Clock size={11} /> שעה
              </span>
              <span className="text-sm font-semibold">{event.event_time}</span>
            </div>
          </div>
          <div className="relative h-0 border-t border-dashed border-white/15" />
          <a href={event.waze_link} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 active:bg-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
                <MapPin size={11} /> מיקום
              </span>
              <span className="text-sm font-semibold">{event.location_name}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-[#C6FF3E] bg-[#C6FF3E]/10 px-3 py-2 rounded-full">
              <Navigation size={13} /> נווט
            </span>
          </a>
        </div>
      </div>

      {/* תיאור ופרטים חשובים */}
      <div className="px-5 mt-6">
<p className="text-[17px] leading-relaxed text-white/80 whitespace-pre-line">{event.description}</p>        {event.important_info && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/70 leading-relaxed">
            <span className="block text-white font-semibold mb-1">חשוב לדעת</span>
            {event.important_info}
          </div>
        )}
      </div>

      {/* טופס אישור הגעה - מוצג רק אם עדיין לא נשלח */}
      {!submitted ? (
        <div className="px-5 mt-8">
          <h2 className="text-lg font-bold mb-4">אישור הגעה</h2>

          <label className="block text-xs text-white/50 mb-1.5">שם מלא</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="איך קוראים לך?"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#FF3EA5]"
          />
<label className="block text-xs text-white/50 mb-1.5 mt-4">תאריך לידה</label>
          <input
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            type="date"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#FF3EA5]"
          />
          <label className="block text-xs text-white/50 mb-1.5 mt-4">מספר טלפון</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
            type="tel"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#FF3EA5]"
          />

          <label className="block text-xs text-white/50 mb-1.5 mt-4">כמות כרטיסים</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setTicketCount((c) => Math.max(1, c - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-lg">-</button>
            <span className="text-lg font-semibold w-6 text-center">{ticketCount}</span>
            <button onClick={() => setTicketCount((c) => c + 1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-lg">+</button>
          </div>
{ticketCount > 1 && (
            <div className="mt-4 flex flex-col gap-3">
              {ticketDetails.map((t, i) => (
                <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-white/50 mb-2">כרטיס {i + 2} — פרטי המוזמן/ת</p>
                  <input
                    value={t.name}
                    onChange={(e) => updateTicketDetail(i, "name", e.target.value)}
                    placeholder="שם מלא"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none mb-2"
                  />
                  <input
                    value={t.phone}
                    onChange={(e) => updateTicketDetail(i, "phone", e.target.value)}
                    placeholder="מספר טלפון"
                    type="tel"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none mb-2"
                  />
                  <input
                    value={t.birthDate}
                    onChange={(e) => updateTicketDetail(i, "birthDate", e.target.value)}
                    type="date"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-5">
            <span className="flex items-center gap-1.5 text-xs text-white/50 mb-2">
              <Bus size={13} /> צריך/ה הסעה?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setNeedsTransport(true)}
                className={`rounded-xl py-3 text-sm font-semibold border ${
                  needsTransport === true ? "bg-[#FF3EA5] border-[#FF3EA5] text-black" : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                כן, צריך/ה
              </button>
              <button
                onClick={() => {
                  setNeedsTransport(false);
                  setPickup("");
                }}
                className={`rounded-xl py-3 text-sm font-semibold border ${
                  needsTransport === false ? "bg-white/15 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                מגיע/ה לבד
              </button>
            </div>

            {needsTransport === true && (
              <div className="mt-3 relative">
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#FF3EA5]"
                >
                  <option value="" disabled>בחר/י נקודת איסוף</option>
                  {(event.pickup_points || []).map((p) => (
                    <option key={p} value={p} className="bg-[#15151C]">{p}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

          <button
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
            className={`w-full mt-6 rounded-xl py-3.5 text-sm font-bold ${canSubmit ? "bg-white text-black" : "bg-white/10 text-white/30"}`}
          >
            {saving ? "שומר..." : "שמור/י את הפרטים שלי"}
          </button>
        </div>
      ) : (
        <div className="px-5 mt-8">
          <div className="rounded-2xl bg-[#C6FF3E]/10 border border-[#C6FF3E]/30 p-5 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#C6FF3E] flex items-center justify-center">
              <Check size={20} className="text-black" />
            </div>
            <p className="font-semibold">
              {needsTransport ? `נרשמת בהצלחה! ניפגש ב${pickup}` : "נרשמת בהצלחה! נתראה באירוע"}
            </p>
            <p className="text-xs text-white/50">כדי לסגור את המקום — יש להשלים תשלום למטה</p>
          </div>
        </div>
      )}

      {/* כפתור התשלום - תמיד דבוק לתחתית המסך */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10] to-transparent">
        <a
          href={event.bit_link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#FF3EA5] text-black font-black text-base py-4"
        >
לתשלום מאובטח {event.price ? `— ${Number(event.price) * ticketCount} ₪` : ""}
        </a>
      </div>
    </div>
  );
}
