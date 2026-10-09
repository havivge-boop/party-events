"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

const C = {
  bg: "#FBF7FF",
  ink: "#1B1740",
  muted: "#6B6785",
  coral: "#FF6F59",
  sun: "#FFC94A",
  lilac: "#E9DDF5",
  line: "#CFC3DD",
};

// ===== הלו"ז: כדי להחליף תמונה, ממלאים img בקישור. x/y = מיקום הנקודה על הקו =====
const STOPS = [
  { time: "18:00–20:30", title: 'קווסט "חפש את המטמון"', place: "רחוב יפו, מכיכר צה״ל עד מחנה יהודה", emoji: "🗺️", img: null, x: 75, y: 50 },
  { time: "20:30", title: "ישיבה משותפת", place: "Taps & Tail", emoji: "🍹", img: null, x: 25, y: 150 },
  { time: "22:00", title: "ערב חופשי", place: "מחנה יהודה", emoji: "🏮", img: null, x: 75, y: 250 },
];

const YEARS = Array.from({ length: 12 }, (_, i) => 2008 - i); // 2008 → 1997
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const daysIn = (m, y) => new Date(y || 2000, m || 1, 0).getDate();
const emptyP = () => ({ name: "", phone: "", d: "", m: "", y: "", address: "" });
const phoneOk = (v) => { const s = v.replace(/\D/g, ""); return s.length === 10 && s[0] === "0"; };
const pOk = (p) => p.name.trim().length > 1 && phoneOk(p.phone) && p.d && p.m && p.y && p.address.trim().length > 1;
const inp = "w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-[15px] outline-none focus:border-[#FF6F59]";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium" style={{ color: C.muted }}>{label}</span>
      {children}
    </label>
  );
}

function Picker({ value, options, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-1">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-right text-[15px]"
        style={{ color: value ? C.ink : C.muted }}>
        {value || placeholder}
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {options.map((o) => (
            <li key={o}>
              <button type="button" className="w-full px-3 py-2.5 text-right text-[15px]"
                onClick={() => { onChange(o); setOpen(false); }}>{o}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Person({ p, set }) {
  const up = (k) => (v) => set({ ...p, [k]: v });
  const days = Array.from({ length: daysIn(p.m, p.y) }, (_, i) => i + 1);
  return (
    <div className="space-y-3">
      <Field label="שם מלא"><input className={inp} value={p.name} onChange={(e) => up("name")(e.target.value)} /></Field>
      <Field label="מספר טלפון">
        <input className={inp} type="tel" inputMode="tel" placeholder="050-1234567" value={p.phone} onChange={(e) => up("phone")(e.target.value)} />
      </Field>
      <Field label="תאריך לידה">
        <div className="flex gap-2">
          <Picker value={p.d} options={days} placeholder="יום" onChange={up("d")} />
          <Picker value={p.m} options={MONTHS} placeholder="חודש" onChange={up("m")} />
          <Picker value={p.y} options={YEARS} placeholder="שנה" onChange={up("y")} />
        </div>
      </Field>
      <Field label="כתובת מגורים">
        <input className={inp} placeholder="עיר, רחוב ומספר" value={p.address} onChange={(e) => up("address")(e.target.value)} />
      </Field>
    </div>
  );
}

function RegForm({ top, f, setF, setCount, event, valid, saving, done, err, onSubmit }) {
  const total = event.price ? event.price * f.count : null;
  if (done) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">🎉</div>
        <h3 className="mt-2 text-xl font-bold">נרשמת בהצלחה!</h3>
        <p className="mt-1" style={{ color: C.muted }}>ניפגש ב{f.pickup}</p>
        {total && <p className="mt-3 font-bold">סכום לתשלום: {total} ₪</p>}
        {event.bit_link && (
          <p className="mt-2 text-sm" style={{ color: C.muted }}>
            נפתחה עבורך כרטיסייה עם דף התשלום. אם היא לא נפתחה, לחצו על הכפתור למטה.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-xl font-bold" style={{ color: C.coral }}>הרשמה לערב</h2>
      <p className="mb-4 rounded-xl px-3 py-2 text-[13px]" style={{ background: C.lilac }}>
        {top
          ? "הפרטים שלך נשמרים אוטומטית גם בטופס שלמטה, אין צורך למלא שוב."
          : "הפרטים שלך כבר מוזנים כאן אוטומטית מהטופס שלמעלה."}
      </p>
      <Person p={f.main} set={(main) => setF((s) => ({ ...s, main }))} />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[15px] font-medium">כמות משתתפים</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCount(f.count - 1)} className="h-9 w-9 rounded-full border border-black/10 text-xl">−</button>
          <span className="w-5 text-center font-bold">{f.count}</span>
          <button type="button" onClick={() => setCount(f.count + 1)} className="h-9 w-9 rounded-full border border-black/10 text-xl">+</button>
        </div>
      </div>
      {total && <p className="mt-1 text-sm" style={{ color: C.muted }}>סה״כ לתשלום: {total} ₪</p>}

      <div className="mt-4">
        <Field label="נקודת עלייה">
          <Picker value={f.pickup} options={event.pickup_points || []} placeholder="בחר/י נקודת עלייה"
            onChange={(pickup) => setF((s) => ({ ...s, pickup }))} />
        </Field>
      </div>

      {f.extras.map((p, i) => (
        <div key={i} className="mt-5 border-t border-black/10 pt-4">
          <h3 className="mb-3 font-bold">משתתף/ת {i + 2} — פרטים</h3>
          <Person p={p} set={(np) => setF((s) => ({ ...s, extras: s.extras.map((x, j) => (j === i ? np : x)) }))} />
        </div>
      ))}

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button type="button" disabled={!valid || saving} onClick={onSubmit}
        className="mt-5 w-full rounded-2xl py-3.5 text-[16px] font-bold text-white transition-colors disabled:bg-gray-300"
        style={{ background: valid && !saving ? C.coral : undefined }}>
        {saving ? "שומר..." : "שמור/י את הפרטים שלי"}
      </button>
    </div>
  );
}

function Schedule() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const r = ref.current.getBoundingClientRect();
      setP(Math.min(1, Math.max(0, (window.innerHeight * 0.65 - r.top) / r.height)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const D = "M50 0 C50 25 75 25 75 50 C75 100 25 100 25 150 C25 200 75 200 75 250 C75 275 50 280 50 300";
  return (
    <div ref={ref} className="relative mx-auto max-w-md" style={{ height: 900 }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id="rev"><rect x="0" y="0" width="100" height={p * 300} /></clipPath></defs>
        <path d={D} fill="none" stroke={C.line} strokeWidth="3" strokeDasharray="6 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <g clipPath="url(#rev)">
          <path d={D} fill="none" stroke={C.coral} strokeWidth="5" strokeDasharray="6 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {STOPS.map((s) => {
        const on = p * 300 >= s.y - 8;
        return (
          <div key={s.title}>
            <div className="absolute flex h-8 w-8 items-center justify-center rounded-full border-4 border-white shadow transition-colors duration-500"
              style={{ left: `${s.x}%`, top: `${s.y / 3}%`, transform: "translate(-50%,-50%)", background: on ? C.coral : C.line }}>
              <span className="h-2 w-2 rounded-full bg-white" />
            </div>
            <div className="absolute w-[52%] overflow-hidden rounded-2xl bg-white shadow-sm"
              style={{ ...(s.x > 50 ? { left: 0 } : { right: 0 }), top: `${s.y / 3}%`, transform: "translateY(-50%)" }}>
              {s.img ? (
                <img src={s.img} alt={s.title} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${C.lilac}, ${C.sun})` }}>{s.emoji}</div>
              )}
              <div className="p-3">
                <span className="rounded-md px-2 py-0.5 text-[12px] font-bold" style={{ background: C.sun }}>{s.time}</span>
                <h3 className="mt-1.5 text-[15px] font-bold leading-snug">{s.title}</h3>
                <p className="text-[13px]" style={{ color: C.muted }}>{s.place}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JerusalemEveningView({ event }) {
  const [f, setF] = useState({ main: emptyP(), count: 1, pickup: "", extras: [] });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const setCount = (n) => setF((s) => {
    const c = Math.max(1, n);
    const ex = s.extras.slice(0, c - 1);
    while (ex.length < c - 1) ex.push(emptyP());
    return { ...s, count: c, extras: ex };
  });
  const valid = pOk(f.main) && !!f.pickup && f.extras.every(pOk);

  const submit = async () => {
    const tab = window.open("", "_blank"); // נפתח מיד בלחיצה כדי שהדפדפן לא יחסום
    setSaving(true); setErr("");
    const bd = (p) => `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    const m = f.main;
    const { error } = await supabase.from("guests").insert({
      event_id: event.id, name: m.name.trim(), phone: m.phone, birth_date: bd(m), address: m.address.trim(),
      ticket_count: f.count,
      ticket_details: f.extras.map((p) => ({ name: p.name, phone: p.phone, birthDay: p.d, birthMonth: p.m, birthYear: p.y, address: p.address })),
      needs_transport: true, pickup_point: f.pickup,
    });
    setSaving(false);
    if (error) { if (tab) tab.close(); setErr("השמירה לא הצליחה, נסו שוב."); return; }
    setDone(true);
    if (event.bit_link && tab) tab.location.href = event.bit_link; else if (tab) tab.close();
  };

  const formProps = { f, setF, setCount, event, valid, saving, done, err, onSubmit: submit };

  return (
    <div dir="rtl" className="min-h-screen pb-28" style={{ background: C.bg, color: C.ink, fontFamily: "var(--font-heebo), sans-serif" }}>
      <header className="px-5 pb-12 pt-10" style={{ background: `linear-gradient(180deg, #6B4AA0 0%, #E4607F 55%, #FFA65C 100%)` }}>
        <div className="mx-auto max-w-md">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[13px] font-bold">אירוע קהילתי</span>
          <h1 className="mt-3 text-4xl font-black text-white">{event.name || "ערב בירושלים"}</h1>
          <p className="mt-1 text-white/90">חמישי בערב · לגילאי 18-28</p>
          {event.event_date && <p className="mt-1 font-bold text-white">{event.event_date}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-10 px-4">
        {event.location_name && (
          <div className="-mt-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div><div className="text-[13px]" style={{ color: C.muted }}>נקודת מפגש</div><div className="font-bold">{event.location_name}</div></div>
            {event.waze_link && <a href={event.waze_link} target="_blank" rel="noreferrer" className="rounded-xl px-4 py-2 font-bold" style={{ background: C.sun }}>נווט</a>}
          </div>
        )}
        <section className={event.location_name ? "" : "-mt-6"}><RegForm top {...formProps} /></section>
        <section>
          <h2 className="mb-6 text-2xl font-black">מה הולך להיות</h2>
          <Schedule />
        </section>
        <section><RegForm {...formProps} /></section>
      </main>

      {event.bit_link && (
        <div className="fixed inset-x-0 bottom-0 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,.08)]">
          {done ? (
            <a href={event.bit_link} target="_blank" rel="noreferrer" className="block rounded-2xl py-3.5 text-center font-bold text-white" style={{ background: C.coral }}>
              לתשלום מאובטח{event.price ? ` — ${event.price * f.count} ₪` : ""}
            </a>
          ) : (
            <div className="rounded-2xl bg-gray-200 py-3.5 text-center font-bold text-gray-500">שמרו את הפרטים למעלה כדי להמשיך לתשלום</div>
          )}
        </div>
      )}
    </div>
  );
}
