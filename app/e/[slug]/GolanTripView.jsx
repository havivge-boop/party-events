"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Bus, Check, ChevronDown } from "lucide-react";
import { supabase } from "../../../lib/supabase";

// מחשב טווח תאריכי לידה חוקיים: בין גיל 17.5 לגיל 28 נכון להיום
function getBirthDateRange() {
  const today = new Date();
  const maxDate = new Date(today); // הכי צעיר שמותר (גיל 17.5 בדיוק)
  maxDate.setFullYear(today.getFullYear() - 17);
  maxDate.setMonth(maxDate.getMonth() - 6);
  const minDate = new Date(today); // הכי מבוגר שמותר (גיל 28 בדיוק)
  minDate.setFullYear(today.getFullYear() - 28);

  const toInputFormat = (d) => d.toISOString().split("T")[0];
  return { min: toInputFormat(minDate), max: toInputFormat(maxDate) };
}

// ===== צבעי הטיול - מקור אמת אחד לכל הפלטה =====
const COLORS = {
  bg: "#F7F2EA",           // רקע בסיס - שמנת/חול
  cardBg: "#FFFFFF",
  primary: "#3E5A2A",      // ירוק זית עמוק - כפתורים, כותרות
  primaryText: "#F7F2EA",
  accent: "#A05A1E",       // טרקוטה חם
  dusk: "#8C3F44",         // דמדומים עמוק
  textDark: "#2E3B1F",
  textMuted: "#7A6B52",
  border: "rgba(0,0,0,0.08)",
  gradMorning: "#EDF0E2",
  gradMid: "#F3E4D3",
  gradEvening: "#E8D3D6",
};

// ===== נתוני הלוז - עדכן/החלף כשיהיה לוז סופי =====
const SCHEDULE = [
  {
    day: "יום חמישי",
    activities: [
      { time: "08:30", title: "מסלול מג'רסה", icon: "💧" },
      { time: "12:00", title: "ארוחת פלאפל", icon: "🧆" },
      { time: "13:30", title: "קיאקים/רפטינג בירדן", icon: "🚣" },
      { time: "19:00", title: "הגעה לכפר האינדיאני + על האש", icon: "🏕️" },
    ],
  },
  {
    day: "יום שישי",
    activities: [
      { time: "09:00", title: "מסלול באניאס", icon: "🏞️" },
      { time: "13:00", title: "מסיק חקלאי", icon: "🍎" },
      { time: "15:30", title: "יציאה דרומה מצומת גולני", icon: "🚌" },
    ],
  },
];

// טווח תאריכי לידה מותר: בין 17.5 ל-28 שנים אחורה מהיום
function getBirthDateLimits() {
  const today = new Date();
  // הכי "צעיר" שמותר - לפני 17.5 שנים בדיוק
  const maxDate = new Date(today.getFullYear() - 17, today.getMonth() - 6, today.getDate());
  // הכי "מבוגר" שמותר - לפני 28 שנים
  const minDate = new Date(today.getFullYear() - 28, today.getMonth(), today.getDate());
  const toISO = (d) => d.toISOString().split("T")[0];
  return { min: toISO(minDate), max: toISO(maxDate) };
}

function ScheduleAccordion() {
  const [openDays, setOpenDays] = useState(() => SCHEDULE.map(() => true));

  function toggleDay(index) {
    setOpenDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {SCHEDULE.map((day, dayIndex) => (
        <div
          key={day.day}
          className="rounded-2xl overflow-hidden"
          style={{ border: `0.5px solid ${COLORS.border}`, background: COLORS.cardBg }}
        >
          <button
            onClick={() => toggleDay(dayIndex)}
            className="w-full flex items-center justify-between px-4 py-3.5"
            style={{ color: COLORS.textDark }}
          >
            <span className="flex items-center gap-2 font-semibold text-[15px]">
              <ChevronDown
                size={16}
                style={{
                  transform: openDays[dayIndex] ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.25s ease",
                }}
              />
              {day.day}
            </span>
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {day.activities.length} פעילויות
            </span>
          </button>

          {/* גריד עם שורה שגדלה/מצטמצמת - נותן אנימציית פתיחה/סגירה חלקה בלי "קפיצה" */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: openDays[dayIndex] ? "1fr" : "0fr",
              transition: "grid-template-rows 0.35s ease",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div
                className="px-4 pb-4 pt-1"
                style={{
                  background: `linear-gradient(180deg, ${COLORS.gradMorning} 0%, ${COLORS.gradMid} 55%, ${COLORS.gradEvening} 100%)`,
                }}
              >
                <div className="flex flex-col">
                  {day.activities.map((act, i) => {
                    const isLast = i === day.activities.length - 1;
                    const dotColor =
                      i === 0 ? COLORS.primary : isLast ? COLORS.dusk : COLORS.accent;
                    return (
                      <div key={i} className="flex gap-3">
                        {/* עמודת האייקון + הקו המחבר - נפרדת לגמרי מהטקסט, אין חפיפה */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                            style={{ background: "#fff", border: `2px solid ${dotColor}` }}
                          >
                            {act.icon}
                          </div>
                          {!isLast && (
                            <div
                              className="flex-1 w-[2px] my-1"
                              style={{ background: "rgba(0,0,0,0.12)", minHeight: "16px" }}
                            />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-[13px] font-medium m-0 leading-tight" style={{ color: dotColor }}>
                            {act.time}
                          </p>
                          <p className="text-[14px] font-medium mt-0.5 leading-snug" style={{ color: COLORS.textDark }}>
                            {act.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GolanTripView({ event }) {
  const [needsTransport, setNeedsTransport] = useState(null);
  const [pickup, setPickup] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const birthDateLimits = getBirthDateLimits(); // בין 17.5 ל-28 שנים אחורה מהיום
  const [address, setAddress] = useState("");
  const [dietary, setDietary] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [ticketDetails, setTicketDetails] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const target = Math.max(0, ticketCount - 1);
    setTicketDetails((prev) => {
      const next = [...prev];
      while (next.length < target)
        next.push({ name: "", birthDate: "", phone: "", address: "", dietary: "" });
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

  function scrollToForm() {
    document.getElementById("golan-registration-form")?.scrollIntoView({ behavior: "smooth" });
  }

  const phoneValid = /^0\d{9}$/.test(phone.trim());
  const canSubmit =
    name.trim().length > 1 &&
    phoneValid &&
    birthDate &&
    address.trim().length > 1 &&
    needsTransport !== null &&
    (!needsTransport || pickup);

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const { error } = await supabase.from("guests").insert({
      event_id: event.id,
      name: name.trim(),
      ticket_count: ticketCount,
      phone: phone.trim(),
      birth_date: birthDate,
      address: address.trim(),
      dietary_restrictions: dietary.trim() || null,
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
    window.open(event.bit_link, "_blank");
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: COLORS.bg, color: COLORS.textDark, fontFamily: "var(--font-heebo), sans-serif" }}
    >
      {/* כותרת עליונה */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs font-medium mb-1" style={{ color: COLORS.accent }}>
          טיול קבוצתי
        </p>
        <h1 className="text-2xl font-semibold m-0" style={{ color: COLORS.textDark }}>
          {event.name || "טיול לגולן"}
        </h1>
        {event.event_date && (
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            {event.event_date}
          </p>
        )}
      </div>

      {/* כפתור מעבר לרישום */}
      <div className="px-5 mb-6">
        <button
          onClick={scrollToForm}
          className="w-full rounded-xl py-3.5 text-[15px] font-semibold"
          style={{ background: COLORS.primary, color: COLORS.primaryText }}
        >
          מעבר לרישום
        </button>
      </div>

      {/* מיקום לינה */}
      {event.location_name && (
        <div className="px-5 mb-6">
          <a
            href={event.waze_link || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl px-4 py-3.5"
            style={{ background: COLORS.cardBg, border: `0.5px solid ${COLORS.border}` }}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin size={15} style={{ color: COLORS.accent }} />
              {event.location_name}
            </span>
            <span className="text-xs font-semibold" style={{ color: COLORS.primary }}>
              נווט
            </span>
          </a>
        </div>
      )}

      {/* תיאור */}
      {event.description && (
        <div className="px-5 mb-6">
          <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: COLORS.textDark }}>
            {event.description}
          </p>
        </div>
      )}

      {/* לוז */}
      <div className="px-5 mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: COLORS.textDark }}>
          לוז הטיול
        </h2>
        <ScheduleAccordion />
      </div>

      {/* טופס הרשמה */}
      <div id="golan-registration-form" className="px-5">
        {!submitted ? (
          <>
            <h2 className="text-lg font-semibold mb-4" style={{ color: COLORS.textDark }}>
              הרשמה לטיול
            </h2>

            <label className="block text-xs mb-1.5" style={{ color: COLORS.textMuted }}>
              שם מלא
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="איך קוראים לך?"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="block text-xs mb-1.5 mt-4" style={{ color: COLORS.textMuted }}>
              מספר טלפון
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              type="tel"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="block text-xs mb-1.5 mt-4" style={{ color: COLORS.textMuted }}>
              תאריך לידה
            </label>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              type="date"
              min={birthDateLimits.min}
              max={birthDateLimits.max}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="block text-xs mb-1.5 mt-4" style={{ color: COLORS.textMuted }}>
              כתובת מגורים
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="עיר, רחוב ומספר"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="block text-xs mb-1.5 mt-4" style={{ color: COLORS.textMuted }}>
              הגבלות תזונה / אלרגיות
            </label>
            <input
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="אין / פרט/י"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="block text-xs mb-1.5 mt-4" style={{ color: COLORS.textMuted }}>
              כמות משתתפים
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTicketCount((c) => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl text-lg"
                style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
              >
                -
              </button>
              <span className="text-lg font-semibold w-6 text-center">{ticketCount}</span>
              <button
                onClick={() => setTicketCount((c) => c + 1)}
                className="w-10 h-10 rounded-xl text-lg"
                style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
              >
                +
              </button>
            </div>

            {ticketCount > 1 && (
              <div className="mt-4 flex flex-col gap-3">
                {ticketDetails.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
                  >
                    <p className="text-xs mb-2" style={{ color: COLORS.textMuted }}>
                      משתתף/ת {i + 2} — פרטים
                    </p>
                    <input
                      value={t.name}
                      onChange={(e) => updateTicketDetail(i, "name", e.target.value)}
                      placeholder="שם מלא"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
                      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                    />
                    <input
                      value={t.phone}
                      onChange={(e) => updateTicketDetail(i, "phone", e.target.value)}
                      placeholder="מספר טלפון"
                      type="tel"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
                      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                    />
                    <input
                      value={t.birthDate}
                      onChange={(e) => updateTicketDetail(i, "birthDate", e.target.value)}
                      type="date"
                      min={birthDateLimits.min}
                      max={birthDateLimits.max}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
                      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                    />
                    <input
                      value={t.address}
                      onChange={(e) => updateTicketDetail(i, "address", e.target.value)}
                      placeholder="כתובת מגורים"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
                      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                    />
                    <input
                      value={t.dietary}
                      onChange={(e) => updateTicketDetail(i, "dietary", e.target.value)}
                      placeholder="הגבלות תזונה / אלרגיות"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <span className="flex items-center gap-1.5 text-xs mb-2" style={{ color: COLORS.textMuted }}>
                <Bus size={13} /> צריך/ה הסעה?
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNeedsTransport(true)}
                  className="rounded-xl py-3 text-sm font-semibold"
                  style={
                    needsTransport === true
                      ? { background: COLORS.primary, color: COLORS.primaryText, border: `1px solid ${COLORS.primary}` }
                      : { background: COLORS.cardBg, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }
                  }
                >
                  כן, צריך/ה
                </button>
                <button
                  onClick={() => {
                    setNeedsTransport(false);
                    setPickup("");
                  }}
                  className="rounded-xl py-3 text-sm font-semibold"
                  style={
                    needsTransport === false
                      ? { background: COLORS.textDark, color: "#fff", border: `1px solid ${COLORS.textDark}` }
                      : { background: COLORS.cardBg, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }
                  }
                >
                  מגיע/ה לבד
                </button>
              </div>

              {needsTransport === true && (
                <div className="mt-3 relative">
                  <select
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
                  >
                    <option value="" disabled>
                      בחר/י נקודת איסוף
                    </option>
                    {(event.pickup_points || []).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: COLORS.textMuted }}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs mt-3" style={{ color: "#B3261E" }}>
                {error}
              </p>
            )}

            <button
              disabled={!canSubmit || saving}
              onClick={handleSubmit}
              className="w-full mt-6 rounded-xl py-3.5 text-sm font-bold"
              style={
                canSubmit
                  ? { background: COLORS.primary, color: COLORS.primaryText }
                  : { background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.3)" }
              }
            >
              {saving ? "שומר..." : "שמור/י את הפרטים שלי"}
            </button>
          </>
        ) : (
          <div
            className="rounded-2xl p-5 flex flex-col items-center text-center gap-2"
            style={{ background: COLORS.gradMorning, border: `1px solid ${COLORS.primary}` }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: COLORS.primary }}
            >
              <Check size={20} color="#fff" />
            </div>
            <p className="font-semibold" style={{ color: COLORS.textDark }}>
              {needsTransport ? `נרשמת בהצלחה! ניפגש ב${pickup}` : "נרשמת בהצלחה! נתראה בטיול"}
            </p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              מעביר אותך לדף התשלום...
            </p>
          </div>
        )}
      </div>

      {/* כפתור תשלום דביק בתחתית */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3"
        style={{ background: `linear-gradient(to top, ${COLORS.bg}, ${COLORS.bg}, transparent)` }}
      >
        {submitted ? (
          <a
            href={event.bit_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl font-bold text-base py-4"
            style={{ background: COLORS.accent, color: "#fff" }}
          >
            לתשלום מאובטח {event.price ? `— ${Number(event.price) * ticketCount} ₪` : ""}
          </a>
        ) : (
          <div
            className="w-full rounded-2xl font-bold text-sm py-4 text-center"
            style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.35)" }}
          >
            שמרו את הפרטים למעלה כדי להמשיך לתשלום
          </div>
        )}
      </div>
    </div>
  );
}
