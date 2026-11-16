"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

async function api(password, payload) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "שגיאה");
  return json.data;
}

const pad = (n) => String(n).padStart(2, "0");
const extraBirth = (t) =>
  t.birthDate || (t.birthYear ? `${t.birthYear}-${pad(t.birthMonth)}-${pad(t.birthDay)}` : "");

const people = (list) => list.reduce((s, g) => s + (g.ticket_count || 1), 0);

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  if (isNaN(date)) return d;
  return date.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "long" });
}

const ACCENT = "#C6FF3E";

export default function AdminPage() {
  const [password, setPassword] = useState(null);
  const [passInput, setPassInput] = useState("");
  const [error, setError] = useState("");

  async function login() {
    try {
      await api(passInput, { action: "login" });
      setPassword(passInput);
    } catch (e) {
      setError(e.message === "unauthorized" ? "סיסמה שגויה" : "שגיאה: " + e.message);
    }
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-[#0B0B10] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="h-12 w-12 rounded-2xl bg-[#C6FF3E] text-black flex items-center justify-center text-xl font-black mb-5">
            ★
          </div>
          <h1 className="text-2xl font-black mb-1">ניהול אירועים</h1>
          <p className="text-sm text-white/50 mb-6">הכנס/י סיסמה כדי להמשיך</p>
          <input
            type="password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="סיסמה"
            className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-base outline-none focus:border-[#C6FF3E]/60 mb-3"
          />
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <button onClick={login} className="w-full rounded-2xl bg-[#C6FF3E] text-black font-bold py-3.5 text-base active:scale-[0.98] transition">
            כניסה
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard password={password} />;
}

function AdminDashboard({ password }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({}); // event_id -> { total, paid }
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [payFilter, setPayFilter] = useState("all"); // all | paid | unpaid
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [eventDelete, setEventDelete] = useState(null); // { step, name, password, error, busy }

  useEffect(() => {
    loadEvents();
    // כפתור "חזור" של הטלפון מחזיר לרשימת האירועים
    const onPop = () => {
      setSelectedEvent(null);
      loadStats();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data || []);
    await loadStats();
    setLoading(false);
  }

  async function loadStats() {
    try {
      const rows = (await api(password, { action: "summary" })) || [];
      const map = {};
      rows.forEach((g) => {
        const m = (map[g.event_id] ||= { total: 0, paid: 0 });
        const n = g.ticket_count || 1;
        m.total += n;
        if (g.paid) m.paid += n;
      });
      setStats(map);
    } catch {
      // לא קריטי - הכרטיסים פשוט יוצגו בלי מספרים
    }
  }

  async function refreshGuests(event) {
    try {
      setGuests((await api(password, { action: "list", eventId: event.id })) || []);
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  }

  async function openEvent(event) {
    setSelectedEvent(event);
    setGuests([]);
    setActiveTab("all");
    setPayFilter("all");
    setSearch("");
    window.history.pushState({ event: event.id }, "");
    window.scrollTo(0, 0);
    await refreshGuests(event);
  }

  function backToList() {
    window.history.back();
  }

  async function togglePaid(row) {
    try {
      await api(password, { action: "update", id: row.guest.id, data: { paid: !row.guest.paid } });
      await refreshGuests(selectedEvent);
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  }

  // ===== בניית השורות =====
  const q = search.trim().toLowerCase();
  const filtered = guests.filter((g) => {
    if (payFilter === "paid" && !g.paid) return false;
    if (payFilter === "unpaid" && g.paid) return false;
    if (activeTab === "all") return true;
    if (activeTab === "alone") return !g.needs_transport;
    return g.needs_transport && g.pickup_point === activeTab;
  });

  const flatRows = [];
  filtered.forEach((g) => {
    const pickup = g.needs_transport ? g.pickup_point : "מגיע/ה לבד";
    flatRows.push({
      key: g.id + "-main",
      guest: g,
      idx: null,
      name: g.name || "",
      phone: g.phone || "",
      birthDate: g.birth_date || "",
      address: g.address || "",
      dietary: g.dietary_restrictions || "",
      pickup,
      paid: !!g.paid,
      groupWith: null,
    });
    (g.ticket_details || []).forEach((t, i) => {
      flatRows.push({
        key: g.id + "-" + i,
        guest: g,
        idx: i,
        name: t.name || "",
        phone: t.phone || "",
        birthDate: extraBirth(t),
        address: t.address || "",
        dietary: t.dietary || "",
        pickup,
        paid: !!g.paid,
        groupWith: g.name,
      });
    });
  });

  const visibleRows = q
    ? flatRows.filter((r) => r.name.toLowerCase().includes(q) || String(r.phone).includes(q))
    : flatRows;

  const showDietary = flatRows.some((r) => r.dietary);
  const totalPeople = people(filtered);
  const paidPeople = people(filtered.filter((g) => g.paid));

  // ===== ייצוא לאקסל (xlsx אמיתי, עם צבעים) =====
  async function exportXlsx() {
    try {
      const mod = await import("exceljs/dist/exceljs.min.js");
      const ExcelJS = mod.default || mod;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("נרשמים", { views: [{ rightToLeft: true }] });

      const head = [
        "שם",
        "טלפון",
        "תאריך לידה",
        "כתובת",
        ...(showDietary ? ["הגבלות תזונה"] : []),
        "מגיע/ה עם",
        "הסעה",
        "שולם",
      ];
      ws.addRow(head);
      ws.getRow(1).font = { bold: true };
      head.forEach((_, i) => {
        ws.getColumn(i + 1).width = 18;
      });
      ws.getColumn(2).numFmt = "@";

      flatRows.forEach((r) => {
        const row = ws.addRow([
          r.name,
          String(r.phone),
          String(r.birthDate),
          r.address,
          ...(showDietary ? [r.dietary] : []),
          r.groupWith || "",
          r.pickup,
          r.paid ? "כן" : "לא",
        ]);
        row.getCell(head.length).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: r.paid ? "FFC6EFCE" : "FFFFC7CE" },
        };
        row.getCell(head.length).font = {
          bold: true,
          color: { argb: r.paid ? "FF006100" : "FF9C0006" },
        };
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedEvent.slug}-registrants.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("שגיאה בייצוא: " + e.message);
    }
  }

  // ===== עריכה / הוספה / מחיקה =====
  function openAdd() {
    setEditor({
      mode: "add",
      values: { name: "", phone: "", birthDate: "", address: "", dietary: "", pickup: (selectedEvent.pickup_points || [])[0] || "" },
    });
  }

  function openEdit(row) {
    setEditor({
      mode: "edit",
      row,
      values: {
        name: row.name,
        phone: row.phone,
        birthDate: row.birthDate,
        address: row.address,
        dietary: row.dietary,
        pickup: row.guest.pickup_point || "",
      },
    });
  }

  async function saveEditor() {
    const v = editor.values;
    try {
      if (editor.mode === "add") {
        await api(password, {
          action: "add",
          data: {
            event_id: selectedEvent.id,
            name: v.name,
            phone: v.phone,
            birth_date: v.birthDate || null,
            address: v.address,
            dietary_restrictions: v.dietary || null,
            ticket_count: 1,
            ticket_details: [],
            needs_transport: !!v.pickup,
            pickup_point: v.pickup || null,
          },
        });
      } else if (editor.row.idx === null) {
        await api(password, {
          action: "update",
          id: editor.row.guest.id,
          data: {
            name: v.name,
            phone: v.phone,
            birth_date: v.birthDate || null,
            address: v.address,
            dietary_restrictions: v.dietary || null,
            needs_transport: !!v.pickup,
            pickup_point: v.pickup || null,
          },
        });
      } else {
        const g = editor.row.guest;
        const [y, m, d] = (v.birthDate || "").split("-");
        const details = (g.ticket_details || []).map((t, i) =>
          i === editor.row.idx
            ? {
                ...t,
                name: v.name,
                phone: v.phone,
                address: v.address,
                dietary: v.dietary,
                birthDate: v.birthDate,
                birthDay: d ? Number(d) : "",
                birthMonth: m ? Number(m) : "",
                birthYear: y ? Number(y) : "",
              }
            : t
        );
        await api(password, { action: "update", id: g.id, data: { ticket_details: details } });
      }
      setEditor(null);
      await refreshGuests(selectedEvent);
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  }

  async function deleteRow(row) {
    const g = row.guest;
    try {
      if (row.idx === null) {
        const extras = (g.ticket_details || []).length;
        const msg = `למחוק את ${row.name || "ההרשמה"}${extras ? " ואת כל המשתתפים שנרשמו איתו/ה" : ""}?`;
        if (!confirm(msg)) return;
        await api(password, { action: "delete", id: g.id });
      } else {
        if (!confirm(`למחוק את ${row.name || "המשתתף/ת"}?`)) return;
        await api(password, {
          action: "update",
          id: g.id,
          data: {
            ticket_details: (g.ticket_details || []).filter((_, i) => i !== row.idx),
            ticket_count: Math.max(1, (g.ticket_count || 1) - 1),
          },
        });
      }
      await refreshGuests(selectedEvent);
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  }

  // ===== מחיקת אירוע (3 שלבים) =====
  function openEventDelete() {
    setEventDelete({ step: 1, name: "", password: "", error: "", busy: false });
  }

  async function confirmEventDelete() {
    setEventDelete((d) => ({ ...d, busy: true, error: "" }));
    try {
      await api(password, {
        action: "deleteEvent",
        eventId: selectedEvent.id,
        confirmName: eventDelete.name,
        confirmPassword: eventDelete.password,
      });
      setEventDelete(null);
      setGuests([]);
      await loadEvents();
      window.history.back();
    } catch (e) {
      setEventDelete((d) => ({ ...d, busy: false, error: e.message }));
    }
  }

  // ===== רכיבים קטנים =====
  const chip = (active, onClick, label, key, tone = "white") => (
    <button
      key={key}
      onClick={onClick}
      className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition ${
        active
          ? tone === "green"
            ? "bg-green-400 text-black"
            : tone === "red"
            ? "bg-red-400 text-black"
            : "bg-white text-black"
          : "bg-white/5 border border-white/10 text-white/70"
      }`}
    >
      {label}
    </button>
  );

  // ===================== מסך רשימת האירועים =====================
  if (!selectedEvent) {
    const allTotal = Object.values(stats).reduce((s, m) => s + m.total, 0);
    return (
      <div className="min-h-screen bg-[#0B0B10] text-white">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
          <p className="text-xs text-white/40 mb-1">שלום 👋</p>
          <h1 className="text-2xl font-black mb-1">האירועים שלי</h1>
          <p className="text-sm text-white/50 mb-6">
            {events.length} אירועים{allTotal ? ` · ${allTotal} נרשמים בסה״כ` : ""}
          </p>

          {loading && <p className="text-sm text-white/40">טוען...</p>}

          <div className="flex flex-col gap-4">
            {events.map((ev) => {
              const s = stats[ev.id] || { total: 0, paid: 0 };
              const pct = s.total ? Math.round((s.paid / s.total) * 100) : 0;
              return (
                <button
                  key={ev.id}
                  onClick={() => openEvent(ev)}
                  className="text-right rounded-3xl overflow-hidden bg-white/[0.04] border border-white/10 active:scale-[0.98] transition"
                >
                  <div className="relative h-32 bg-gradient-to-br from-[#C6FF3E]/30 to-purple-500/20">
                    {ev.cover_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/40 to-transparent" />
                    {ev.event_date && (
                      <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur px-3 py-1 text-xs font-semibold">
                        {formatDate(ev.event_date)}
                        {ev.event_time ? ` · ${ev.event_time}` : ""}
                      </span>
                    )}
                    <h2 className="absolute bottom-3 right-4 left-4 text-lg font-black leading-tight">{ev.name}</h2>
                  </div>
                  <div className="px-4 pt-3 pb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm">
                        <b className="text-xl font-black">{s.total}</b> <span className="text-white/50">נרשמים</span>
                      </span>
                      <span className="text-xs text-white/50">
                        שילמו <b className="text-green-400">{s.paid}</b>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-green-400" style={{ width: pct + "%" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ===================== מסך אירוע =====================
  const pickupPoints = selectedEvent.pickup_points || [];

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      {/* כותרת עם תמונה */}
      <div className="relative h-40 bg-gradient-to-br from-[#C6FF3E]/30 to-purple-500/20">
        {selectedEvent.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selectedEvent.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/50 to-black/30" />
        <button
          onClick={backToList}
          className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur px-3.5 py-2 text-xs font-bold"
        >
          → כל האירועים
        </button>
        <div className="absolute bottom-3 right-4 left-4 max-w-lg mx-auto">
          <h1 className="text-2xl font-black leading-tight">{selectedEvent.name}</h1>
          <p className="text-xs text-white/60 mt-1">
            {formatDate(selectedEvent.event_date)}
            {selectedEvent.event_time ? ` · ${selectedEvent.event_time}` : ""}
            {selectedEvent.location_name ? ` · ${selectedEvent.location_name}` : ""}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28">
        {/* מספרים */}
        <div className="grid grid-cols-3 gap-2 mt-4 mb-5">
          <Stat label="נרשמים" value={people(guests)} />
          <Stat label="שילמו" value={people(guests.filter((g) => g.paid))} color="text-green-400" />
          <Stat label="לא שילמו" value={people(guests.filter((g) => !g.paid))} color="text-red-400" />
        </div>

        {/* חיפוש */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  חיפוש לפי שם או טלפון"
          className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#C6FF3E]/60 mb-3"
        />

        {/* סינון לפי הסעה */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-1 [scrollbar-width:none]">
          {chip(activeTab === "all", () => setActiveTab("all"), `הכל (${people(guests)})`, "all")}
          {pickupPoints.map((p) =>
            chip(
              activeTab === p,
              () => setActiveTab(p),
              `${p} (${people(guests.filter((g) => g.needs_transport && g.pickup_point === p))})`,
              p
            )
          )}
          {chip(
            activeTab === "alone",
            () => setActiveTab("alone"),
            `מגיעים לבד (${people(guests.filter((g) => !g.needs_transport))})`,
            "alone"
          )}
        </div>

        {/* סינון לפי תשלום */}
        <div className="flex gap-2 mb-4">
          {chip(payFilter === "all", () => setPayFilter("all"), "כולם", "pall")}
          {chip(payFilter === "paid", () => setPayFilter("paid"), "שילמו", "ppaid", "green")}
          {chip(payFilter === "unpaid", () => setPayFilter("unpaid"), "לא שילמו", "punpaid", "red")}
        </div>

        {(activeTab !== "all" || payFilter !== "all") && (
          <p className="text-xs text-white/50 mb-3">
            מוצגים {totalPeople} אנשים · שילמו <b className="text-green-400">{paidPeople}</b>
          </p>
        )}

        {/* רשימת נרשמים */}
        <div className="flex flex-col gap-2">
          {visibleRows.length === 0 && (
            <p className="text-center text-sm text-white/40 py-10">אין נרשמים להצגה</p>
          )}
          {visibleRows.map((r) => (
            <div
              key={r.key}
              className={`rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 ${r.idx !== null ? "mr-4 border-r-2 border-r-white/20" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold truncate">{r.name || "—"}</p>
                  {r.groupWith && <p className="text-xs text-white/40">מגיע/ה עם {r.groupWith}</p>}
                </div>
                {r.idx === null ? (
                  <button
                    onClick={() => togglePaid(r)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                      r.paid ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {r.paid ? "✓ שולם" : "לא שולם"}
                  </button>
                ) : (
                  <span className={`shrink-0 text-xs font-bold ${r.paid ? "text-green-300/70" : "text-red-300/70"}`}>
                    {r.paid ? "✓ שולם" : "לא שולם"}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/60">
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="text-[#C6FF3E]" dir="ltr">
                    {r.phone}
                  </a>
                )}
                <span>🚌 {r.pickup || "—"}</span>
                {r.birthDate && <span>🎂 {r.birthDate}</span>}
                {r.address && <span>📍 {r.address}</span>}
                {r.dietary && <span>🥗 {r.dietary}</span>}
              </div>

              <div className="mt-3 flex gap-4 text-xs">
                <button onClick={() => openEdit(r)} className="text-white/60 font-semibold">עריכה</button>
                <button onClick={() => deleteRow(r)} className="text-red-400/80 font-semibold">מחיקה</button>
              </div>
            </div>
          ))}
        </div>

        {/* אזור מסוכן */}
        <div className="mt-10 pt-5 border-t border-white/10 text-center">
          <button onClick={openEventDelete} className="text-xs text-red-400/80 underline">
            מחיקת האירוע
          </button>
        </div>
      </div>

      {/* סרגל פעולות תחתון */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0B0B10]/90 backdrop-blur border-t border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <button onClick={openAdd} className="flex-1 rounded-2xl bg-white text-black font-bold py-3 text-sm active:scale-[0.98] transition">
            + הוספת נרשם
          </button>
          <button
            onClick={exportXlsx}
            className="flex-1 rounded-2xl font-bold py-3 text-sm text-black active:scale-[0.98] transition"
            style={{ background: ACCENT }}
          >
            ייצוא לאקסל
          </button>
        </div>
      </div>

      {eventDelete && (
        <Sheet>
          <p className="text-xs text-white/40 mb-1">שלב {eventDelete.step} מתוך 3</p>
          <h3 className="font-bold mb-3 text-red-300">מחיקת האירוע &quot;{selectedEvent.name}&quot;</h3>

          {eventDelete.step === 1 && (
            <p className="text-sm text-white/80">
              המחיקה תסיר את האירוע ואת כל <b className="text-white">{people(guests)}</b> הנרשמים אליו.
              הקישור /e/{selectedEvent.slug} יפסיק לעבוד. אי אפשר לשחזר את זה.
            </p>
          )}

          {eventDelete.step === 2 && (
            <Field
              label={`כדי לאשר, הקלד/י את שם האירוע בדיוק: ${selectedEvent.name}`}
              value={eventDelete.name}
              onChange={(v) => setEventDelete({ ...eventDelete, name: v })}
            />
          )}

          {eventDelete.step === 3 && (
            <div>
              <label className="block text-xs text-white/50 mb-1">הקלד/י שוב את סיסמת המנהל</label>
              <input
                type="password"
                value={eventDelete.password}
                onChange={(e) => setEventDelete({ ...eventDelete, password: e.target.value })}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-base outline-none"
              />
            </div>
          )}

          {eventDelete.error && <p className="text-xs text-red-400 mt-2">{eventDelete.error}</p>}

          <div className="flex gap-2 mt-5">
            {eventDelete.step < 3 ? (
              <button
                disabled={eventDelete.step === 2 && eventDelete.name.trim() !== (selectedEvent.name || "").trim()}
                onClick={() => setEventDelete({ ...eventDelete, step: eventDelete.step + 1, error: "" })}
                className="flex-1 rounded-2xl bg-red-500 text-white font-bold py-3 text-sm disabled:opacity-30"
              >
                המשך
              </button>
            ) : (
              <button
                disabled={!eventDelete.password || eventDelete.busy}
                onClick={confirmEventDelete}
                className="flex-1 rounded-2xl bg-red-500 text-white font-bold py-3 text-sm disabled:opacity-30"
              >
                {eventDelete.busy ? "מוחק..." : "מחק לצמיתות"}
              </button>
            )}
            <button onClick={() => setEventDelete(null)} className="flex-1 rounded-2xl bg-white/10 py-3 text-sm">
              ביטול
            </button>
          </div>
        </Sheet>
      )}

      {editor && (
        <Sheet>
          <h3 className="font-bold mb-3">{editor.mode === "add" ? "הוספת נרשם" : "עריכת פרטים"}</h3>
          <div className="flex flex-col gap-2.5">
            <Field label="שם" value={editor.values.name} onChange={(v) => setEditor({ ...editor, values: { ...editor.values, name: v } })} />
            <Field label="טלפון" value={editor.values.phone} onChange={(v) => setEditor({ ...editor, values: { ...editor.values, phone: v } })} />
            <Field label="תאריך לידה (YYYY-MM-DD)" value={editor.values.birthDate} onChange={(v) => setEditor({ ...editor, values: { ...editor.values, birthDate: v } })} placeholder="2001-04-23" />
            <Field label="כתובת" value={editor.values.address} onChange={(v) => setEditor({ ...editor, values: { ...editor.values, address: v } })} />
            {(showDietary || editor.mode === "add") && (
              <Field label="הגבלות תזונה" value={editor.values.dietary} onChange={(v) => setEditor({ ...editor, values: { ...editor.values, dietary: v } })} />
            )}
            {(editor.mode === "add" || editor.row.idx === null) && (
              <div>
                <label className="block text-xs text-white/50 mb-1">נקודת עלייה</label>
                <select
                  value={editor.values.pickup}
                  onChange={(e) => setEditor({ ...editor, values: { ...editor.values, pickup: e.target.value } })}
                  className="w-full rounded-xl bg-[#15151D] border border-white/10 px-3 py-2.5 text-base outline-none"
                >
                  <option value="">מגיע/ה לבד</option>
                  {pickupPoints.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={saveEditor} className="flex-1 rounded-2xl bg-white text-black font-bold py-3 text-sm">שמור</button>
            <button onClick={() => setEditor(null)} className="flex-1 rounded-2xl bg-white/10 py-3 text-sm">ביטול</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// חלון שנפתח מלמטה (נוח לטלפון)
function Sheet({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div
        className="w-full max-w-lg sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#15151D] border border-white/10 p-5 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[11px] text-white/50 mt-0.5">{label}</p>
    </div>
  );
}

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
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-base outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-base outline-none"
        />
      )}
    </div>
  );
}
