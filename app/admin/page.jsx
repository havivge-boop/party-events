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
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

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
          <h1 className="text-lg font-bold mb-4">כניסת מנהל</h1>
          <input
            type="password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="סיסמה"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none mb-3"
          />
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <button onClick={login} className="w-full rounded-xl bg-white text-black font-bold py-3 text-sm">
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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [editor, setEditor] = useState(null);

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
    pickup_points: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data || []);
  }

  async function refreshGuests(event) {
    try {
      setGuests((await api(password, { action: "list", eventId: event.id })) || []);
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  }

  async function loadGuests(event) {
    setSelectedEvent(event);
    setActiveTab("all");
    await refreshGuests(event);
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

  // ===== בניית השורות =====
  const filtered = guests.filter((g) => {
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
        groupWith: g.name,
      });
    });
  });

  const showDietary = flatRows.some((r) => r.dietary);
  const totalPeople = filtered.reduce((sum, g) => sum + (g.ticket_count || 1), 0);

  // ===== ייצוא לאקסל =====
  function exportCsv() {
    const head = [
      "שם",
      "טלפון",
      "תאריך לידה",
      "כתובת",
      ...(showDietary ? ["הגבלות תזונה"] : []),
      "מגיע/ה עם",
      "הסעה",
    ];
    const lines = flatRows.map((r) => [
      r.name,
      `="${r.phone}"`,
      r.birthDate,
      r.address,
      ...(showDietary ? [r.dietary] : []),
      r.groupWith || "",
      r.pickup,
    ]);
    const csv = "\uFEFF" + [head, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEvent.slug}-registrants.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white px-5 py-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">ניהול אירועים</h1>

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
          <Field label="קישור לתשלום (משולם)" value={form.bit_link} onChange={(v) => setForm({ ...form, bit_link: v })} />
          <Field label="מחיר (טקסט חופשי)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="80 ₪" />
          <Field label="נקודות איסוף (מופרד בפסיקים)" value={form.pickup_points} onChange={(v) => setForm({ ...form, pickup_points: v })} placeholder="כיכר רבין, קניון עזריאלי" />
        </div>
        <button onClick={createEvent} className="w-full mt-4 rounded-xl bg-white text-black font-bold py-3 text-sm">
          שמור אירוע
        </button>
        {saved && <p className="text-xs text-[#C6FF3E] mt-2">האירוע נשמר! הקישור: /e/{form.slug}</p>}
      </div>

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

      {selectedEvent && (
        <div>
          <h2 className="font-semibold mb-3">נרשמים ל-{selectedEvent.name}</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === "all" ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
            >
              הכל ({guests.reduce((s, g) => s + (g.ticket_count || 1), 0)})
            </button>
            {(selectedEvent.pickup_points || []).map((p) => {
              const count = guests
                .filter((g) => g.needs_transport && g.pickup_point === p)
                .reduce((s, g) => s + (g.ticket_count || 1), 0);
              return (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === p ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
                >
                  {p} ({count})
                </button>
              );
            })}
            <button
              onClick={() => setActiveTab("alone")}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${activeTab === "alone" ? "bg-white text-black" : "bg-white/5 border border-white/10"}`}
            >
              מגיעים לבד ({guests.filter((g) => !g.needs_transport).reduce((s, g) => s + (g.ticket_count || 1), 0)})
            </button>
          </div>

          <div className="flex items-center gap-4 mb-3 text-xs text-white/60">
            <span>הרשמות: <b className="text-white">{filtered.length}</b></span>
            <span>סה״כ אנשים: <b className="text-white">{totalPeople}</b></span>
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={exportCsv} className="px-3 py-2 rounded-lg text-xs font-bold bg-[#C6FF3E] text-black">
              ייצוא לאקסל
            </button>
            <button onClick={openAdd} className="px-3 py-2 rounded-lg text-xs font-bold bg-white text-black">
              + הוספת נרשם
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/10 text-white/60 text-xs">
                <tr>
                  <th className="p-3">שם</th>
                  <th className="p-3">טלפון</th>
                  <th className="p-3">תאריך לידה</th>
                  <th className="p-3">כתובת</th>
                  {showDietary && <th className="p-3">הגבלות תזונה</th>}
                  <th className="p-3">מגיע/ה עם</th>
                  <th className="p-3">הסעה</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map((r) => (
                  <tr key={r.key} className="border-t border-white/10">
                    <td className="p-3">{r.name || "—"}</td>
                    <td className="p-3">{r.phone || "—"}</td>
                    <td className="p-3">{r.birthDate || "—"}</td>
                    <td className="p-3">{r.address || "—"}</td>
                    {showDietary && <td className="p-3">{r.dietary || "—"}</td>}
                    <td className="p-3 text-white/50">{r.groupWith || "—"}</td>
                    <td className="p-3">{r.pickup || "—"}</td>
                    <td className="p-3 whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="text-xs text-white/70 underline ml-3">ערוך</button>
                      <button onClick={() => deleteRow(r)} className="text-xs text-red-400 underline">מחק</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-5">
          <div className="w-full max-w-sm rounded-2xl bg-[#15151D] border border-white/10 p-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">{editor.mode === "add" ? "הוספת נרשם" : "עריכת פרטים"}</h3>
            <div className="flex flex-col gap-2">
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
                    className="w-full rounded-lg bg-[#15151D] border border-white/10 px-3 py-2 text-sm outline-none"
                  >
                    <option value="">מגיע/ה לבד</option>
                    {(selectedEvent.pickup_points || []).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveEditor} className="flex-1 rounded-xl bg-white text-black font-bold py-2.5 text-sm">שמור</button>
              <button onClick={() => setEditor(null)} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm">ביטול</button>
            </div>
          </div>
        </div>
      )}
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
