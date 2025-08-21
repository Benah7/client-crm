# 1) דרוס את src/App.tsx עם הממשק המלא (הדבק הכל כמו שהוא)
cat > src/App.tsx <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ===== Spec (v3.4 mobile-first, colorful, autofill, ranges) =====
// - צבעוני: כותרת גרדיאנט, כפתורי ניווט צבעוניים, תגיות סטטוס.
// - ימי צילום קרובים: כל תאריך מהיום והלאה.
// - אנליטיקס: טווחים לבחירה 12/6/3 חודשים.
// - אוטופיל בטופס יום צילום: שם לקוח שמופיע בלידים ימלא טלפון אוטומטית + הצעות datalist.
// - LTV לפי טלפון. בדיקות קונסול נשמרו והורחבו.

// ===== Types =====
interface Shoot {
  id: string;
  date: string; // yyyy-mm-dd
  clientName: string;
  phone: string;
  location: string;
  deliverables: string;
  price: number; // ILS
  notes?: string;
  createdAt: string; // ISO
}

type LeadStatus = "חדש" | "נוצר קשר" | "מוקצה" | "הצעה נשלחה" | "נסגר חיובי" | "נסגר שלילי";

interface Lead {
  id: string;
  name: string;
  phone: string;
  company?: string;
  notes?: string;
  lastContact?: string; // yyyy-mm-dd
  nextFollow?: string;  // yyyy-mm-dd
  status: LeadStatus;
  createdAt: string; // ISO
}

// ===== Utils =====
const SHOOTS_KEY = "ben-crm-shoots-v4";
const LEADS_KEY = "ben-crm-leads-v3";
const formatILS = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);
const formatDate = (iso: string) => iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const todayStr = () => new Date().toISOString().slice(0,10);
const isFutureOrToday = (dateYYYYMMDD: string) => dateYYYYMMDD >= todayStr();

function computeRevenueSeries(shoots: Shoot[], months: number) {
  const arr: { month: string; total: number }[] = [];
  const base = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = monthKey(d);
    const total = shoots
      .filter(s => monthKey(new Date(s.date + "T00:00:00")) === key)
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    arr.push({ month: key, total });
  }
  return arr;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal] as const;
}

const uid = () => (crypto as any)?.randomUUID?.() ?? String(Date.now() + Math.random());

// ===== Main Component =====
export default function CRMApp() {
  const [shoots, setShoots] = useLocalStorage<Shoot[]>(SHOOTS_KEY, []);
  const [leads, setLeads] = useLocalStorage<Lead[]>(LEADS_KEY, []);

  type Tab = "leads" | "shoots" | "history" | "analytics";
  const [tab, setTab] = useState<Tab>("shoots");
  const [query, setQuery] = useState("");
  const [selectedShoot, setSelectedShoot] = useState<Shoot | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingShoot, setEditingShoot] = useState<Shoot | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showShootForm, setShowShootForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [monthsRange, setMonthsRange] = useState<12 | 6 | 3>(12);

  // ===== Derivations: Shoots =====
  const upcomingShoots = useMemo(() =>
    shoots
      .filter(s => isFutureOrToday(s.date))
      .sort((a,b) => a.date.localeCompare(b.date))
  , [shoots]);

  const historyShoots = useMemo(() =>
    shoots
      .filter(s => !isFutureOrToday(s.date))
      .sort((a,b) => b.date.localeCompare(a.date))
  , [shoots]);

  // Revenue variable months
  const revenueSeries = useMemo(() => computeRevenueSeries(shoots, monthsRange), [shoots, monthsRange]);

  const totalPast = useMemo(() =>
    shoots
      .filter(s => !isFutureOrToday(s.date) && new Date(s.date + "T00:00:00") < startOfMonth(new Date()))
      .reduce((acc, s) => acc + (Number(s.price) || 0), 0)
  , [shoots]);

  // LTV by phone
  const clientLTV = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string; total: number; count: number }>();
    for (const s of shoots) {
      const key = s.phone.trim();
      const prev = map.get(key) || { key, name: s.clientName.trim(), phone: key, total: 0, count: 0 };
      prev.name = s.clientName.trim() || prev.name;
      prev.total += Number(s.price) || 0;
      prev.count += 1;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a,b) => b.total - a.total);
  }, [shoots]);

  // ===== Derivations: Leads =====
  const overdueCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0,10);
    return leads.filter(l => l.nextFollow && l.nextFollow < todayStr && l.status !== "נסגר חיובי" && l.status !== "נסגר שלילי").length;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter(l => !q || `${l.name} ${l.phone} ${l.company ?? ''} ${l.notes ?? ''}`.toLowerCase().includes(q))
      .sort((a,b) => (a.nextFollow ?? "").localeCompare(b.nextFollow ?? ""));
  }, [leads, query]);

  // ===== CRUD =====
  const saveShoot = (data: Omit<Shoot, "id" | "createdAt"> & { id?: string }) => {
    if (data.id) setShoots(prev => prev.map(x => x.id === data.id ? { ...x, ...data } as Shoot : x));
    else setShoots(prev => [{ id: uid(), createdAt: new Date().toISOString(), ...data } as Shoot, ...prev]);
    setShowShootForm(false); setEditingShoot(null);
  };
  const deleteShoot = (id: string) => { if (confirm("למחוק את יום הצילום?")) setShoots(prev => prev.filter(x => x.id !== id)); setSelectedShoot(null); };

  const saveLead = (data: Omit<Lead, "id" | "createdAt"> & { id?: string }) => {
    if (data.id) setLeads(prev => prev.map(x => x.id === data.id ? { ...x, ...data } as Lead : x));
    else setLeads(prev => [{ id: uid(), createdAt: new Date().toISOString(), ...data } as Lead, ...prev]);
    setShowLeadForm(false); setEditingLead(null);
  };
  const deleteLead = (id: string) => { if (confirm("למחוק ליד?")) setLeads(prev => prev.filter(x => x.id !== id)); setSelectedLead(null); };

  // ===== Seed for tests =====
  const seedTests = () => {
    const today = new Date();
    const ym = (y:number,m:number,d:number) => new Date(y,m,d).toISOString().slice(0,10);
    const y = today.getFullYear(); const m = today.getMonth();
    const sampleShoots: Shoot[] = [
      { id: uid(), createdAt: new Date().toISOString(), date: ym(y, m-1, 12), clientName: "דנה כהן", phone: "050-1111111", location: "ת"+"א", deliverables: "30 תמונות", price: 2000 },
      { id: uid(), createdAt: new Date().toISOString(), date: ym(y, m-2, 5), clientName: "דנה כהן", phone: "050-1111111", location: "ת"+"א", deliverables: "וידאו + 20 תמונות", price: 1800 },
      { id: uid(), createdAt: new Date().toISOString(), date: ym(y, m, 20), clientName: "אושר לוי", phone: "052-2222222", location: "חיפה", deliverables: "40 תמונות", price: 2600 },
    ];
    const sampleLeads: Lead[] = [
      { id: uid(), createdAt: new Date().toISOString(), name: "מאיה רוזן", phone: "054-3333333", company: "סטודיו רוזן", status: "נוצר קשר", lastContact: ym(y, m, Math.max(1, new Date().getDate()-2)), nextFollow: ym(y, m, Math.max(1, new Date().getDate()-1)) },
      { id: uid(), createdAt: new Date().toISOString(), name: "דנה כהן", phone: "050-1111111", company: "עצמאית", status: "הצעה נשלחה", nextFollow: ym(y, m, new Date().getDate()+2) },
    ];
    setShoots(sampleShoots);
    setLeads(sampleLeads);
  };

  return (
    <div dir="rtl" className="min-h-screen text-neutral-900 bg-gradient-to-b from-purple-50 via-white to-blue-50" style={{ paddingBottom: `calc(64px + env(safe-area-inset-bottom))` }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 text-white" style={{ paddingTop: `env(safe-area-inset-top)` }}>
        <div className="mx-auto max-w-[480px] px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-white font-bold">BH</span>
            <h1 className="text-lg font-semibold">CRM צלם</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={seedTests} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm">נתוני בדיקה</button>
            {tab === "shoots" && (
              <button onClick={() => { setEditingShoot(null); setShowShootForm(true); }} className="px-3 py-2 rounded-xl bg-white text-indigo-700 text-sm">הוסף יום</button>
            )}
            {tab === "leads" && (
              <button onClick={() => { setEditingLead(null); setShowLeadForm(true); }} className="px-3 py-2 rounded-xl bg-white text-fuchsia-700 text-sm">הוסף ליד</button>
            )}
          </div>
        </div>
      </header>

      {/* Search / KPI */}
      <section className="mx-auto max-w-[480px] px-3 pt-3 pb-2">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "leads" ? "חיפוש לידים" : "חיפוש ימי צילום"} className="w-full h-11 px-4 rounded-2xl border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[15px]" />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">סה"כ הכנסות עבר</span>
              <span className="font-semibold">{formatILS(totalPast)}</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">עד סוף חודש קודם</div>
          </div>
        </div>
      </section>

      {/* Content by tab */}
      <main className="mx-auto max-w-[480px] px-3 pb-4">
        {tab === "shoots" && (
          <Card title="ימי צילום קרובים" subtitle="כל הימים מהיום והלאה">
            <ShootList items={upcomingShoots} onOpen={setSelectedShoot} />
          </Card>
        )}

        {tab === "history" && (
          <Card title="היסטוריית ימי צילום" subtitle="תאריכים שעברו">
            <ShootList items={historyShoots} onOpen={setSelectedShoot} />
          </Card>
        )}

        {tab === "analytics" && (
          <>
            <Card title="הכנסה חודשית">
              <div className="flex items-center gap-2 px-1 pb-2">
                <RangeBtn active={monthsRange===12} onClick={() => setMonthsRange(12)} label="12ח'" color="indigo" />
                <RangeBtn active={monthsRange===6} onClick={() => setMonthsRange(6)} label="6ח'" color="fuchsia" />
                <RangeBtn active={monthsRange===3} onClick={() => setMonthsRange(3)} label="3ח'" color="pink" />
                <div className="text-xs text-neutral-500 mr-auto">טווח נוכחי: {monthsRange} חוד'</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueSeries} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatILS(Number(v))} />
                    <Line type="monotone" dataKey="total" strokeWidth={2} dot={{ r: 2.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="שווי לקוח מצטבר" subtitle="קיבוץ לפי טלפון">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-neutral-600">
                      <th className="text-right py-2 pr-2">שם</th>
                      <th className="text-right py-2">טלפון</th>
                      <th className="text-right py-2">מס' פרויקטים</th>
                      <th className="text-left py-2 pl-2">סה"כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientLTV.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-neutral-500">אין נתונים</td></tr>
                    ) : clientLTV.map((c) => (
                      <tr key={c.key} className="border-t">
                        <td className="py-2 pr-2">{c.name}</td>
                        <td className="py-2">{c.phone}</td>
                        <td className="py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">{c.count}</span>
                        </td>
                        <td className="py-2 pl-2 text-left font-medium">{formatILS(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {tab === "leads" && (
          <Card title="ניהול לידים" subtitle="תזכורות ושיחות">
            <LeadList items={filteredLeads} onOpen={setSelectedLead} />
          </Card>
        )}
      </main>

      {/* Shoot bubble */}
      {selectedShoot && (
        <Bubble onClose={() => setSelectedShoot(null)}>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{selectedShoot.clientName}</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Field label="תאריך" value={formatDate(selectedShoot.date)} />
              <Field label="מחיר" value={formatILS(selectedShoot.price)} />
              <Field label="טלפון" value={selectedShoot.phone} copyable />
              <Field label="מיקום" value={selectedShoot.location} className="col-span-3" />
              <Field label="תוצר" value={selectedShoot.deliverables} className="col-span-3" />
              {selectedShoot.notes ? (<Field label="הערות" value={selectedShoot.notes} className="col-span-3" />) : null}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <button onClick={() => { setEditingShoot(selectedShoot); setShowShootForm(true); }} className="px-4 h-11 rounded-2xl border border-neutral-300 bg-white">עריכה</button>
              <button onClick={() => deleteShoot(selectedShoot.id)} className="px-4 h-11 rounded-2xl bg-red-600 text-white">מחק</button>
            </div>
          </div>
        </Bubble>
      )}

      {/* Lead bubble */}
      {selectedLead && (
        <Bubble onClose={() => setSelectedLead(null)}>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Field label="טלפון" value={selectedLead.phone} copyable />
              <Field label="חברה" value={selectedLead.company || ""} />
              <Field label="סטטוס" value={selectedLead.status} />
              <Field label="יצירת קשר אחרונה" value={selectedLead.lastContact ? formatDate(selectedLead.lastContact) : ""} />
              <Field label="תזכורת הבאה" value={selectedLead.nextFollow ? formatDate(selectedLead.nextFollow) : ""} />
              {selectedLead.notes ? (<Field label="הערות" value={selectedLead.notes} className="col-span-3" />) : null}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <button onClick={() => { setEditingLead(selectedLead); setShowLeadForm(true); }} className="px-4 h-11 rounded-2xl border border-neutral-300 bg-white">עריכה</button>
              <button onClick={() => deleteLead(selectedLead.id)} className="px-4 h-11 rounded-2xl bg-red-600 text-white">מחק</button>
            </div>
          </div>
        </Bubble>
      )}

      {/* Forms */}
      {showShootForm && (
        <Drawer onClose={() => { setShowShootForm(false); setEditingShoot(null); }}>
          <ShootForm leads={leads} initial={editingShoot || undefined} onCancel={() => { setShowShootForm(false); setEditingShoot(null); }} onSave={saveShoot} />
        </Drawer>
      )}

      {showLeadForm && (
        <Drawer onClose={() => { setShowLeadForm(false); setEditingLead(null); }}>
          <LeadForm initial={editingLead || undefined} onCancel={() => { setShowLeadForm(false); setEditingLead(null); }} onSave={saveLead} />
        </Drawer>
      )}

      {/* Bottom Nav – iPhone safe-area */}
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-neutral-200 bg-gradient-to-r from-indigo-50 via-fuchsia-50 to-pink-50" style={{ paddingBottom: `calc(8px + env(safe-area-inset-bottom))` }}>
        <div className="mx-auto max-w-[480px] px-3 py-2 grid grid-cols-4 gap-6">
          <NavBtn active={tab === "leads"} onClick={() => setTab("leads")} label={`לידים${overdueCount ? ` (${overdueCount})` : ''}`} color="fuchsia" />
          <NavBtn active={tab === "shoots"} onClick={() => setTab("shoots")} label="ימי צילום" color="indigo" />
          <NavBtn active={tab === "history"} onClick={() => setTab("history")} label="היסטוריה" color="blue" />
          <NavBtn active={tab === "analytics"} onClick={() => setTab("analytics")} label="אנליטיקס" color="pink" />
        </div>
      </nav>

      <footer className="fixed bottom-[68px] left-1/2 -translate-x-1/2 text-xs text-neutral-600 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
        שמירה אוטומטית · נתוני בדיקה זמינים
      </footer>
    </div>
  );
}

// ===== Reusable UI =====
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-neutral-200 bg-white mb-3">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <div className="text-xs text-neutral-500 mt-0.5">{subtitle}</div> : null}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Field({ label, value, copyable, className = "" }: { label: string; value: string; copyable?: boolean; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-neutral-500 text-xs">{label}</div>
      <div className="flex items-center gap-2">
        <div className="truncate" title={value}>{value || "—"}</div>
        {copyable ? (
          <button onClick={() => navigator.clipboard?.writeText(value)} className="text-xs px-2 py-1 rounded-xl border border-neutral-300">העתק</button>
        ) : null}
      </div>
    </div>
  );
}

function Bubble({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[92vw] max-w-[480px]">
        <div className="relative rounded-3xl border border-neutral-200 bg-white p-4 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white border-l border-neutral-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">עריכה</h3>
          <button onClick={onClose} className="px-4 h-11 rounded-2xl border border-neutral-300">סגור</button>
        </div>
        <div className="p-5 overflow-auto h-[calc(100%-64px)]">{children}</div>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, label, color = "indigo" }: { active: boolean; onClick: () => void; label: string; color?: "indigo"|"fuchsia"|"pink"|"blue" }) {
  const activeCls = active ? `bg-${color}-600 text-white border-${color}-700` : `bg-white text-${color}-700 border-${color}-200`;
  return (
    <button onClick={onClick} className={`h-11 rounded-2xl text-[13px] border px-3 ${activeCls}`}>{label}</button>
  );
}

function RangeBtn({ active, onClick, label, color = "indigo" }: { active: boolean; onClick: () => void; label: string; color?: "indigo"|"fuchsia"|"pink" }) {
  const cls = active ? `bg-${color}-600 text-white border-${color}-700` : `bg-white text-${color}-700 border-${color}-200`;
  return <button onClick={onClick} className={`h-8 rounded-xl text-[12px] border px-2 ${cls}`}>{label}</button>;
}

function ShootList({ items, onOpen }: { items: Shoot[]; onOpen: (s: Shoot) => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="grid grid-cols-12 bg-neutral-50 text-sm font-medium text-neutral-700 px-3 py-2">
        <div className="col-span-6">שם</div>
        <div className="col-span-3">תאריך</div>
        <div className="col-span-3 text-left">מחיר</div>
      </div>
      <ul>
        {items.length === 0 && (
          <li className="px-4 py-6 text-neutral-500 text-sm">אין רשומות.</li>
        )}
        {items.map((s) => (
          <li key={s.id} onClick={() => onOpen(s)} className="grid grid-cols-12 items-center px-3 py-3 active:bg-neutral-100 hover:bg-neutral-50 cursor-pointer border-t border-neutral-100">
            <div className="col-span-6 flex items-center gap-2 truncate">
              <div className="h-8 w-8 rounded-2xl bg-indigo-600 text-white text-xs flex items-center justify-center">{s.clientName.slice(0,2)}</div>
              <span className="truncate" title={s.clientName}>{s.clientName}</span>
            </div>
            <div className="col-span-3 text-neutral-700">{formatDate(s.date)}</div>
            <div className="col-span-3 text-left font-medium">{formatILS(s.price)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeadList({ items, onOpen }: { items: Lead[]; onOpen: (l: Lead) => void }) {
  const todayStr = new Date().toISOString().slice(0,10);
  const badge = (s: LeadStatus) => {
    const map: Record<LeadStatus, string> = {
      "חדש": "bg-blue-50 text-blue-700 border-blue-200",
      "נוצר קשר": "bg-indigo-50 text-indigo-700 border-indigo-200",
      "מוקצה": "bg-purple-50 text-purple-700 border-purple-200",
      "הצעה נשלחה": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      "נסגר חיובי": "bg-emerald-50 text-emerald-700 border-emerald-200",
      "נסגר שלילי": "bg-rose-50 text-rose-700 border-rose-200",
    };
    return map[s];
  };
  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="grid grid-cols-12 bg-neutral-50 text-sm font-medium text-neutral-700 px-3 py-2">
        <div className="col-span-5">שם</div>
        <div className="col-span-3">סטטוס</div>
        <div className="col-span-2">תזכורת</div>
        <div className="col-span-2 text-left">טלפון</div>
      </div>
      <ul>
        {items.length === 0 && <li className="px-4 py-6 text-neutral-500 text-sm">אין לידים.</li>}
        {items.map((l) => {
          const overdue = l.nextFollow && l.nextFollow < todayStr && l.status !== "נסגר חיובי" && l.status !== "נסגר שלילי";
          return (
            <li key={l.id} onClick={() => onOpen(l)} className={`grid grid-cols-12 items-center px-3 py-3 cursor-pointer border-t border-neutral-100 ${overdue ? "bg-rose-50" : "active:bg-neutral-100 hover:bg-neutral-50"}`}>
              <div className="col-span-5 truncate">
                <span className="font-medium">{l.name}</span>
                {l.company ? <span className="text-neutral-500"> · {l.company}</span> : null}
              </div>
              <div className="col-span-3">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${badge(l.status)}`}>{l.status}</span>
              </div>
              <div className="col-span-2">{l.nextFollow ? formatDate(l.nextFollow) : ""}</div>
              <div className="col-span-2 text-left">{l.phone}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ===== Forms =====
function ShootForm({ leads, initial, onSave, onCancel }: { leads: Lead[]; initial?: Shoot; onSave: (data: Omit<Shoot, "id" | "createdAt"> & { id?: string }) => void; onCancel: () => void }) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [clientName, setClientName] = useState(initial?.clientName || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [deliverables, setDeliverables] = useState(initial?.deliverables || "");
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [notes, setNotes] = useState(initial?.notes || "");

  // Autofill phone from leads by name
  useEffect(() => {
    const match = leads.find(l => l.name.trim().toLowerCase() === clientName.trim().toLowerCase());
    if (match && !phone) setPhone(match.phone);
  }, [clientName, leads]);

  const canSave = clientName.trim() && date && !Number.isNaN(Number(price));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ id: initial?.id, date, clientName: clientName.trim(), phone: phone.trim(), location: location.trim(), deliverables: deliverables.trim(), price: Number(price) || 0, notes: notes.trim() });
  };

  const leadNames = Array.from(new Set(leads.map(l => l.name))).sort();

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldInput label="תאריך" type="date" value={date} onChange={setDate} />
        <div>
          <label className="text-sm text-neutral-600">שם לקוח</label>
          <input list="lead-names" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="שם מלא" className="w-full h-11 px-4 rounded-2xl border border-neutral-300 bg-white" />
          <datalist id="lead-names">
            {leadNames.map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <FieldInput label="טלפון" value={phone} onChange={setPhone} placeholder="05x-xxxxxxx" />
        <FieldInput label="מיקום" value={location} onChange={setLocation} placeholder="עיר/כתובת" />
        <FieldInput label="תוצר" value={deliverables} onChange={setDeliverables} placeholder="30 תמונות + וידאו" />
        <FieldInput label='מחיר (ש"ח)' type="number" value={String(price)} onChange={(v) => setPrice(Number(v))} />
        <FieldTextarea label="הערות" value={notes} onChange={setNotes} placeholder="אופציונלי" className="md:col-span-2" />
      </div>
      <FormActions canSave={!!canSave} onCancel={onCancel} />
    </form>
  );
}

function LeadForm({ initial, onSave, onCancel }: { initial?: Lead; onSave: (data: Omit<Lead, "id" | "createdAt"> & { id?: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [status, setStatus] = useState<LeadStatus>(initial?.status || "חדש");
  const [lastContact, setLastContact] = useState<string>(initial?.lastContact || "");
  const [nextFollow, setNextFollow] = useState<string>(initial?.nextFollow || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const canSave = name.trim() && phone.trim();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ id: initial?.id, name: name.trim(), phone: phone.trim(), company: company.trim(), status, lastContact: lastContact || undefined, nextFollow: nextFollow || undefined, notes: notes.trim() });
  };

  const advanceFollow = (days: number) => {
    const base = nextFollow ? new Date(nextFollow) : new Date();
    base.setDate(base.getDate() + days);
    setNextFollow(base.toISOString().slice(0,10));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldInput label="שם" value={name} onChange={setName} />
        <FieldInput label="טלפון" value={phone} onChange={setPhone} />
        <FieldInput label="חברה" value={company} onChange={setCompany} />
        <div>
          <label className="text-sm text-neutral-600">סטטוס</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="w-full px-3 py-3 rounded-2xl border border-neutral-300 bg-white">
            {(["חדש","נוצר קשר","מוקצה","הצעה נשלחה","נסגר חיובי","נסגר שלילי"] as LeadStatus[]).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <FieldInput label="יצירת קשר אחרונה" type="date" value={lastContact} onChange={setLastContact} />
        <FieldInput label="תזכורת הבאה" type="date" value={nextFollow} onChange={setNextFollow} />
        <FieldTextarea label="הערות" value={notes} onChange={setNotes} className="md:col-span-2" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => advanceFollow(1)} className="px-4 h-11 rounded-2xl border border-neutral-300">מחר</button>
        <button type="button" onClick={() => advanceFollow(3)} className="px-4 h-11 rounded-2xl border border-neutral-300">+3 ימים</button>
        <button type="button" onClick={() => advanceFollow(7)} className="px-4 h-11 rounded-2xl border border-neutral-300">+שבוע</button>
        <div className="flex-1" />
      </div>
      <FormActions canSave={!!canSave} onCancel={onCancel} />
    </form>
  );
}

function FieldInput({ label, value, onChange, type = "text", placeholder = "", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm text-neutral-600">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-11 px-4 rounded-2xl border border-neutral-300 bg-white" />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder = "", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm text-neutral-600">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white min-h-[92px]" />
    </div>
  );
}

function FormActions({ canSave, onCancel }: { canSave: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button type="button" onClick={onCancel} className="px-4 h-11 rounded-2xl border border-neutral-300">בטל</button>
      <button type="submit" disabled={!canSave} className="px-4 h-11 rounded-2xl bg-indigo-600 text-white disabled:opacity-40">שמור</button>
    </div>
  );
}

// ===== Lightweight tests (console only) =====
(function runDevTests(){
  try {
    const results: [string, boolean, string?][] = [];
    // Existing tests
    results.push(["monthKey Jan pads zero", monthKey(new Date(2025,0,1)) === "2025-01"]);
    results.push(["monthKey Oct pads zero", monthKey(new Date(2025,9,1)) === "2025-10"]);
    const som = startOfMonth(new Date(2025,7,21));
    results.push(["startOfMonth day=1", som.getDate() === 1]);
    const eom = endOfMonth(new Date(2025,1,5));
    results.push(["endOfMonth Feb >=28", eom.getDate() >= 28]);

    // New tests
    results.push(["isFutureOrToday(today) => true", isFutureOrToday(new Date().toISOString().slice(0,10)) === true]);
    results.push(["isFutureOrToday(past) => false", isFutureOrToday("2000-01-01") === false]);

    const dummyShoots: Shoot[] = [
      { id: "1", createdAt: "", date: new Date().toISOString().slice(0,10), clientName: "א", phone: "050", location: "", deliverables: "", price: 100 },
      { id: "2", createdAt: "", date: "2000-01-01", clientName: "ב", phone: "051", location: "", deliverables: "", price: 200 },
    ];
    const r3 = computeRevenueSeries(dummyShoots, 3);
    results.push(["computeRevenueSeries length=3", r3.length === 3]);

    if (typeof window !== 'undefined') {
      console.group("CRM sanity tests");
      for (const [name, ok] of results) console[ok ? 'log' : 'error'](`${ok ? '✔' : '✘'} ${name}`);
      console.groupEnd();
    }
  } catch (e) {
    console.error("Test runner error", e);
  }
})();
EOF

# 2) בנייה ופריסה ל-GitHub Pages
npm run build
rm -rf docs/*
cp -R dist/* docs/
git add docs src/App.tsx
git commit -m "Replace App with full CRM UI and deploy"
git push
