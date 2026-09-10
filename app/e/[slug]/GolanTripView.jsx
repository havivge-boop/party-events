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

// ===== נתוני הלוז - מעודכן לפי הלו"ז הרשמי =====
const SCHEDULE = [
  {
    day: "יום חמישי",
    date: "8.10",
    activities: [
      { time: "06:30", title: "יציאה מאשדוד", icon: "🚌" },
      { time: "07:00", title: "הגעה לרמלה", icon: "🚏" },
      { time: "10:15", title: "מסלול מים במג'רסה", icon: "💧" },
      { time: "14:15", title: "טיול רייזר ב\"רייזר הגולן\"", icon: "🚙" },
      { time: "18:00", title: "הגעה למקום הלינה \"הכפר האינדיאני\" באבני איתן", icon: "🏕️" },
      { time: "20:00", title: "ארוחת ערב על האש", icon: "🔥" },
    ],
  },
  {
    day: "יום שישי",
    date: "9.10",
    activities: [
      { time: "08:00", title: "ארוחת בוקר", icon: "🍳" },
      { time: "10:00", title: "קייאקים ב\"רפטינג נהר הירדן\"", icon: "🚣" },
      { time: "12:00", title: "יציאה הביתה", icon: "🚌" },
      { time: "14:15", title: "הגעה לרמלה", icon: "🚏" },
      { time: "14:50", title: "הגעה לאשדוד", icon: "🏠" },
    ],
  },
];

// שנות לידה מותרות - טווח קבוע וכולל (עדכן ידנית אם הטווח משתנה בעתיד)
const BIRTH_YEARS = [];
for (let y = 2009; y >= 1998; y--) {
  BIRTH_YEARS.push(y);
}

const MONTHS = [
  { value: "01", label: "ינואר" },
  { value: "02", label: "פברואר" },
  { value: "03", label: "מרץ" },
  { value: "04", label: "אפריל" },
  { value: "05", label: "מאי" },
  { value: "06", label: "יוני" },
  { value: "07", label: "יולי" },
  { value: "08", label: "אוגוסט" },
  { value: "09", label: "ספטמבר" },
  { value: "10", label: "אוקטובר" },
  { value: "11", label: "נובמבר" },
  { value: "12", label: "דצמבר" },
];

// כמות הימים בחודש נתון (מתחשב בשנה מעוברת)
function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
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
              <span className="inline-block" style={{ minWidth: "62px" }}>
                {day.day}
              </span>
              {day.date && (
                <span className="font-bold" style={{ color: COLORS.primary }}>
                  {day.date}
                </span>
              )}
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

// בורר רשימה מותאם אישית - נפתח כרשימה נגללת בתוך העמוד, בעיצוב האתר
// (במקום select רגיל שפותח את חלונית המערכת של הדפדפן/טלפון)
// options: מערך של מחרוזות/מספרים, או מערך של {value,label}
function ListPicker({ value, onChange, options, placeholder, compact }) {
  const [open, setOpen] = useState(false);

  const normalized = options.map((opt) =>
    typeof opt === "object" ? opt : { value: String(opt), label: String(opt) }
  );
  const selected = normalized.find((o) => String(o.value) === String(value));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl text-sm"
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          color: selected ? COLORS.textDark : COLORS.textMuted,
          padding: compact ? "10px 10px" : "12px 16px",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={15}
          style={{
            color: COLORS.accent,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <>
          {/* שכבה שקופה שסוגרת את הרשימה בלחיצה מחוץ לה */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute z-20 mt-1.5 w-full rounded-xl overflow-hidden"
            style={{
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <div className="max-h-52 overflow-y-auto">
              {normalized.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="w-full text-right px-4 py-2.5 text-sm"
                    style={{
                      background: isSelected ? COLORS.gradMorning : "transparent",
                      color: isSelected ? COLORS.primary : COLORS.textDark,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// בורר תאריך לידה מלא - שלושה ListPicker צמודים (יום / חודש / שנה)
function BirthDatePicker({ day, month, year, onDayChange, onMonthChange, onYearChange }) {
  const dayCount = daysInMonth(year, month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-3 gap-2">
      <ListPicker value={day} onChange={onDayChange} options={days} placeholder="יום" compact />
      <ListPicker value={month} onChange={onMonthChange} options={MONTHS} placeholder="חודש" compact />
      <ListPicker value={year} onChange={onYearChange} options={BIRTH_YEARS} placeholder="שנה" compact />
    </div>
  );
}

export default function GolanTripView({ event }) {
  const [pickup, setPickup] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
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
        next.push({ name: "", birthDay: "", birthMonth: "", birthYear: "", phone: "", address: "", dietary: "" });
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

  // מנקה מקפים/רווחים לפני הבדיקה - כך שהמקף לא חובה, אבל חוסר ספרה עדיין נתפס
  const phoneDigitsOnly = phone.replace(/[^\d]/g, "");
  const phoneValid = /^0\d{9}$/.test(phoneDigitsOnly);
  const canSubmit =
    name.trim().length > 1 &&
    phoneValid &&
    birthDay &&
    birthMonth &&
    birthYear &&
    address.trim().length > 1 &&
    pickup;

  async function handleSubmit() {
    setSaving(true);
    setError("");

    // פותחים כרטיסייה ריקה *מיד* בלחיצה (לפני ה-await) - כך שהדפדפן לא חוסם אותה כפופ-אפ.
    // אחרי שההרשמה נשמרת בהצלחה, מכוונים אותה לדף התשלום.
    const paymentTab = window.open("", "_blank");

    const birthDateISO = `${birthYear}-${birthMonth}-${String(birthDay).padStart(2, "0")}`;

    const { error } = await supabase.from("guests").insert({
      event_id: event.id,
      name: name.trim(),
      ticket_count: ticketCount,
      phone: phoneDigitsOnly,
      birth_date: birthDateISO,
      address: address.trim(),
      dietary_restrictions: dietary.trim() || null,
      ticket_details: ticketDetails,
      needs_transport: true,
      pickup_point: pickup,
    });
    setSaving(false);
    if (error) {
      setError("משהו השתבש, נסו שוב");
      if (paymentTab) paymentTab.close();
      return;
    }
    setSubmitted(true);
    if (paymentTab) paymentTab.location.href = event.bit_link;
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
            <BirthDatePicker
              day={birthDay}
              month={birthMonth}
              year={birthYear}
              onDayChange={setBirthDay}
              onMonthChange={setBirthMonth}
              onYearChange={setBirthYear}
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
                    <div className="mb-2">
                      <BirthDatePicker
                        day={t.birthDay}
                        month={t.birthMonth}
                        year={t.birthYear}
                        onDayChange={(v) => updateTicketDetail(i, "birthDay", v)}
                        onMonthChange={(v) => updateTicketDetail(i, "birthMonth", v)}
                        onYearChange={(v) => updateTicketDetail(i, "birthYear", v)}
                      />
                    </div>
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
                <Bus size={13} /> נקודת עלייה
              </span>
              <div className="relative">
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, color: COLORS.textDark }}
                >
                  <option value="" disabled>
                    בחר/י נקודת עלייה
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
                  style={{ color: COLORS.accent }}
                />
              </div>
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
              {`נרשמת בהצלחה! ניפגש ב${pickup}`}
            </p>
            {event.price && (
              <p className="text-sm font-medium" style={{ color: COLORS.accent }}>
                סכום לתשלום: {Number(event.price) * ticketCount} ₪
              </p>
            )}
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              נפתחה עבורך כרטיסייה עם דף התשלום. אם היא לא נפתחה - לחצו על הכפתור למטה.
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
            לתשלום מאובטח (גיבוי) {event.price ? `— ${Number(event.price) * ticketCount} ₪` : ""}
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
