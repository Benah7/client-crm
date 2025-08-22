// src/App.tsx
import { useState } from "react";
import {
  Plus,
  Filter,
  Search,
  CalendarDays,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "leads" | "projects" | "tasks">(
    "dashboard"
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-brand to-brand/90 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-extrabold tracking-tight">BH <span className="opacity-80">CRM</span></div>

          <div className="flex-1 max-w-xl hidden md:flex items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-white/70" />
              <input
                placeholder="חיפוש לידים / פרויקטים / לקוחות"
                className="w-full rounded-2xl bg-white/15 placeholder-white/70 text-white border border-white/20 px-10 py-2.5 outline-none focus:ring-4 ring-white/20"
              />
            </div>
            <button className="btn-ghost text-white/90 border-white/25 hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Filter className="size-4" />מסננים</span>
            </button>
          </div>

          <button className="btn-primary inline-flex items-center gap-2">
            <Plus className="size-4" /> חדש
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6 py-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block space-y-6">
          <nav className="space-y-2">
            {[
              { k: "dashboard", label: "ראשי", icon: <TrendingUp className="size-4" /> },
              { k: "leads", label: "לידים", icon: <Users className="size-4" /> },
              { k: "projects", label: "פרויקטים", icon: <ClipboardList className="size-4" /> },
              { k: "tasks", label: "משימות", icon: <CheckCircle2 className="size-4" /> },
            ].map(({ k, label, icon }) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  tab === k
                    ? "bg-brand text-white border-brand"
                    : "border-slate-200 hover:bg-slate-100"
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Smart suggestions */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="size-4 text-brand" />
              <h3 className="font-semibold">הצעות חכמות</h3>
            </div>
            <ul className="space-y-3">
              {[
                { title: "שיחת פולו-אפ", sub: "לקוח: נעמה לוי", badge: "דחוף" },
                { title: "שליחת הצעת מחיר", sub: "דירה 4 חדרים — גבעתיים", badge: "היום" },
                { title: "תזכורת גבייה", sub: "פרויקט: מטבח אורבני", badge: "7 ימים" },
              ].map((x, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{x.title}</p>
                    <p className="text-slate-500 text-sm">{x.sub}</p>
                  </div>
                  <button className="btn-primary text-sm px-3 py-1.5">הוסף</button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-6">
          {/* Tabs (mobile) */}
          <div className="lg:hidden grid grid-cols-4 gap-2">
            {[
              { k: "dashboard", label: "ראשי" },
              { k: "leads", label: "לידים" },
              { k: "projects", label: "פרויקטים" },
              { k: "tasks", label: "משימות" },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={`py-2 rounded-xl text-sm border ${
                  tab === k ? "bg-brand text-white border-brand" : "border-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "dashboard" && <Dashboard />}
          {tab === "leads" && <Leads />}
          {tab === "projects" && <Projects />}
          {tab === "tasks" && <Tasks />}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
        <div className="mx-auto max-w-3xl grid grid-cols-4">
          {[
            { k: "dashboard", label: "ראשי", icon: <TrendingUp className="size-5" /> },
            { k: "leads", label: "לידים", icon: <Users className="size-5" /> },
            { k: "projects", label: "פרויקטים", icon: <ClipboardList className="size-5" /> },
            { k: "tasks", label: "משימות", icon: <CheckCircle2 className="size-5" /> },
          ].map(({ k, label, icon }) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`py-2.5 flex flex-col items-center ${
                tab === k ? "text-brand" : "text-slate-500"
              }`}
            >
              {icon}
              <span className="text-xs mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* helpers */
function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <span className="text-brand">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-slate-500 text-sm mt-1">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* screens */
function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat icon={<CalendarDays className="size-4" />} label="הכנסה החודש" value="₪ 35,200" sub="יעד: ₪ 50,000" />
        <Stat icon={<TrendingUp className="size-4" />} label="הכנסה מצטברת" value="₪ 312,000" sub="שנה זו" />
        <Stat icon={<Users className="size-4" />} label="לידים פתוחים" value="12" sub="4 דחופים" />
        <Stat icon={<CheckCircle2 className="size-4" />} label="משימות היום" value="5" sub="2 הושלמו" />
      </div>

      <Section
        title="ציר זמן אחרונים"
        action={<button className="btn-ghost px-3 py-1.5">הצג הכל</button>}
      >
        <ul className="space-y-3">
          {[
            { t: "08:30", a: "שיחת היכרות — הדר בן עמי" },
            { t: "10:15", a: "תיאום צילום — דירה נווה צדק" },
            { t: "12:00", a: "הצעת מחיר נשלחה — מטבח רמת השרון" },
          ].map((x, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="w-16 text-slate-500 text-sm">{x.t}</div>
              <div className="flex-1 rounded-xl border border-slate-200 p-3">{x.a}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="התראות" action={<button className="text-sm text-brand">סמן הכל כנקרא</button>}>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { title: "חסר טלפון בליד", msg: "פרויקטים סה" },
            { title: "אין נתונים", msg: "להשלמה בפרופיל לקוח" },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="size-5 text-amber-600" />
              <div>
                <p className="font-medium">{x.title}</p>
                <p className="text-sm text-amber-800">{x.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Leads() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {["הכל", "חדשים", "בתהליך", "נסגרו"].map((f) => (
          <button key={f} className="btn-ghost rounded-full px-3 py-1.5 text-sm">
            {f}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[1, 2, 3].map((i) => (
          <article key={i} className="card p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">נעמה לוי</h4>
              <span className="text-xs px-2 py-1 rounded-full bg-brand/10 text-brand border border-brand/20">
                חדש
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">צילום דירה 4 חדרים — גבעתיים</p>
            <div className="flex items-center gap-2 text-sm mt-3 text-slate-600">
              <CalendarDays className="size-4" />
              <span>התקבל אתמול</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 btn-primary py-2">התקשר</button>
              <button className="flex-1 btn-ghost py-2">פרטים</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {["פרויקט", "לקוח", "סטטוס", "דדליין", "תקציב"].map((h) => (
                <th key={h} className="px-4 py-2 text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["מטבח סקנדינבי", "טל בורנשטיין", "עריכה", "01.09", "₪ 3,500"],
              ["וילת בוטיק", "נוי פרדו", "צילום", "05.09", "₪ 6,500"],
              ["מלון Urban", "H TLV", "תיאום", "15.09", "₪ 12,000"],
            ].map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {r.map((c, j) => (
                  <td key={j} className="px-4 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tasks() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <label key={i} className="card p-4 flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 rounded border-slate-300" />
          <div className="flex-1">
            <p className="font-medium">יצירת קשר — ליד חם</p>
            <p className="text-sm text-slate-500">טלפון חסר. בקשה לחזור דרך ווטסאפ</p>
          </div>
        </label>
      ))}
    </div>
  );
}
