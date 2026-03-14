import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Home, Users, Heart, Pill, ClipboardList, Plus, ArrowLeft, ChevronRight,
  Save, Trash2, Edit3, Calendar, AlertTriangle, Check, X, Search,
  Camera, Download, Settings, Activity, Baby, Syringe, Truck, Skull,
  Tag, FileText, Package, BarChart3, Clock, Filter, SortAsc, RefreshCw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import _ from "lodash";

// ─── Style Tag ───────────────────────────────────────────────────────────────
const StyleTag = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap');
    * { font-family: 'Source Sans 3', sans-serif; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: #FAF8F5; color: #2D2A26; }
    input, select, textarea, button { font-family: 'Source Sans 3', sans-serif; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#FAF8F5", surface: "#FFFFFF", border: "#E8E4DF", borderLight: "#F0EDE9",
  primary: "#5B7F5E", primaryLight: "#EBF2EC", primaryDark: "#4A6A4D",
  accent: "#C5944B", accentLight: "#FDF6ED",
  text: "#2D2A26", textMuted: "#7A756F", textLight: "#A09A93",
  danger: "#B54A4A", dangerLight: "#FBEAEA",
  statusActive: "#5B7F5E", statusSold: "#7A756F", statusSlaughtered: "#7A756F", statusDead: "#B54A4A",
};

const SEX_LABELS = { ewe: "Ewe", ram: "Ram", wether: "Wether", ram_lamb: "Ram Lamb", ewe_lamb: "Ewe Lamb" };
const SEX_ICONS = { ewe: "♀", ram: "♂", wether: "♂", ram_lamb: "♂", ewe_lamb: "♀" };
const STATUS_COLORS = { active: COLORS.statusActive, sold: COLORS.statusSold, slaughtered: COLORS.statusSlaughtered, dead: COLORS.statusDead };
const ROUTE_LABELS = { oral: "Oral", injection: "Injection", "pour-on": "Pour-on", other: "Other" };
const REASON_LABELS = { purchase: "Purchase", sale: "Sale", slaughter: "Slaughter", grazing: "Grazing", other: "Other" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const toUKDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};
const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const todayISO = () => new Date().toISOString().split("T")[0];
const getAnimalLabel = (a) => a.name || a.visualTag || a.eidTag || "Unknown";

// ─── Seed Data ───────────────────────────────────────────────────────────────
const seedAnimals = () => {
  const animals = [];
  for (let i = 1; i <= 8; i++) {
    animals.push({
      id: genId(), eidTag: "", visualTag: "", name: `Ewe ${i}`, breed: "Easycare",
      sex: "ewe", dateOfBirth: null, approxAge: "~3 years", dateTagged: null,
      tagType: "adult", bornOnHolding: false, source: "", damId: null, sireId: null,
      status: "active", statusDate: null, photoUrl: null, createdAt: now(), notes: ""
    });
  }
  animals.push({
    id: genId(), eidTag: "", visualTag: "", name: "Leroy", breed: "Easycare",
    sex: "ram", dateOfBirth: null, approxAge: "~3 years", dateTagged: null,
    tagType: "adult", bornOnHolding: false, source: "", damId: null, sireId: null,
    status: "active", statusDate: null, photoUrl: null, createdAt: now(), notes: ""
  });
  animals.push({
    id: genId(), eidTag: "", visualTag: "", name: "Snowy", breed: "Welsh Mountain",
    sex: "wether", dateOfBirth: null, approxAge: "~3 years", dateTagged: null,
    tagType: "adult", bornOnHolding: false, source: "", damId: null, sireId: null,
    status: "active", statusDate: null, photoUrl: null, createdAt: now(), notes: ""
  });
  return animals;
};

const seedSettings = () => ({
  holderName: "", holdingAddress: "", cphNumber: "", flockNumber: "",
  productionType: "Meat", tuppingStart: "2025-11-01", tuppingEnd: "2025-12-13",
  ramId: null, gestationMin: 145, gestationMax: 152
});

// ─── Storage Hook ────────────────────────────────────────────────────────────
function useStorage(key, defaultValue) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(key);
        if (!cancelled) { setData(typeof result.value === "string" ? JSON.parse(result.value) : result.value); setLoaded(true); }
      } catch {
        if (!cancelled) {
          const def = typeof defaultValue === "function" ? defaultValue() : defaultValue;
          setData(def);
          setLoaded(true);
          try { await window.storage.set(key, JSON.stringify(def)); } catch {}
        }
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const debouncedSave = useCallback(
    _.debounce(async (k, v) => {
      try { await window.storage.set(k, JSON.stringify(v)); } catch (e) { console.error("Save error:", e); }
    }, 500),
    [key]
  );

  const update = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      debouncedSave(key, next);
      return next;
    });
  }, [key, debouncedSave]);

  return [data, update, loaded];
}

// ─── UI Components ───────────────────────────────────────────────────────────
const Card = ({ children, className = "", onClick, style }) => (
  <div onClick={onClick} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, ...style }}
    className={`p-4 ${onClick ? "cursor-pointer active:bg-gray-50" : ""} ${className}`}>{children}</div>
);

const Badge = ({ label, color, small }) => (
  <span style={{ background: color + "20", color, fontSize: small ? 11 : 12, fontWeight: 600 }}
    className={`inline-flex items-center rounded-full ${small ? "px-2 py-0.5" : "px-2.5 py-1"}`}>{label}</span>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, className = "", style = {} }) => {
  const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-4 py-3 text-base", lg: "px-6 py-4 text-lg" };
  const variants = {
    primary: { background: COLORS.primary, color: "#fff", border: "none" },
    secondary: { background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.danger, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: COLORS.text, border: "none" },
    accent: { background: COLORS.accent, color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], opacity: disabled ? 0.5 : 1, minHeight: 44, ...style }}
      className={`${base} ${sizes[size]} ${className}`}>{children}</button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>{label}</label>}
    <input {...props} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", width: "100%", fontSize: 16, background: COLORS.surface, color: COLORS.text, ...props.style }} />
  </div>
);

const TextArea = ({ label, ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>{label}</label>}
    <textarea {...props} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", width: "100%", fontSize: 16, minHeight: 80, resize: "vertical", background: COLORS.surface, color: COLORS.text, ...props.style }} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>{label}</label>}
    <select {...props} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", width: "100%", fontSize: 16, background: COLORS.surface, color: COLORS.text, ...props.style }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ToggleButtons = ({ label, options, value, onChange }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>{label}</label>}
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{
            background: value === o.value ? COLORS.primary : COLORS.surface,
            color: value === o.value ? "#fff" : COLORS.text,
            border: `1px solid ${value === o.value ? COLORS.primary : COLORS.border}`,
            borderRadius: 10, padding: "10px 16px", fontSize: 15, fontWeight: 600, minHeight: 44, minWidth: 60,
          }}>{o.label}</button>
      ))}
    </div>
  </div>
);

const Header = ({ title, onBack, right }) => (
  <div className="flex items-center gap-3 mb-4 pt-2">
    {onBack && <button onClick={onBack} style={{ minWidth: 44, minHeight: 44 }} className="flex items-center justify-center rounded-xl"><ArrowLeft size={22} /></button>}
    <h2 className="text-xl font-bold flex-1" style={{ color: COLORS.text }}>{title}</h2>
    {right}
  </div>
);

const Empty = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: COLORS.textMuted }}>
    <Icon size={40} strokeWidth={1.5} className="mb-3" />
    <p className="text-sm">{message}</p>
  </div>
);

const Confirm = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
    <Card className="max-w-sm w-full">
      <p className="text-base mb-4 font-medium">{message}</p>
      <div className="flex gap-3">
        <Btn variant="secondary" onClick={onCancel} className="flex-1">Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm} className="flex-1">Confirm</Btn>
      </div>
    </Card>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex flex-col items-center justify-center h-screen" style={{ background: COLORS.bg }}>
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full" style={{ background: COLORS.primaryLight }} />
      <div className="h-4 w-32 rounded" style={{ background: COLORS.borderLight }} />
      <p className="text-sm" style={{ color: COLORS.textMuted }}>Loading your flock…</p>
    </div>
  </div>
);


// ─── Main App ────────────────────────────────────────────────────────────────
export default function FlockManager() {
  const [animals, setAnimals, animalsLoaded] = useStorage("flock:animals", seedAnimals);
  const [movements, setMovements, movementsLoaded] = useStorage("flock:movements", []);
  const [medPurchases, setMedPurchases, medPurchasesLoaded] = useStorage("flock:medicines-purchases", []);
  const [medAdmin, setMedAdmin, medAdminLoaded] = useStorage("flock:medicines-admin", []);
  const [deaths, setDeaths, deathsLoaded] = useStorage("flock:deaths", []);
  const [tagReplacements, setTagReplacements, tagReplacementsLoaded] = useStorage("flock:tag-replacements", []);
  const [notes, setNotes, notesLoaded] = useStorage("flock:notes", []);
  const [settings, setSettings, settingsLoaded] = useStorage("flock:settings", seedSettings);
  const [feedLog, setFeedLog, feedLogLoaded] = useStorage("flock:feed-log", []);
  const [lambings, setLambings, lambingsLoaded] = useStorage("flock:lambings", []);
  const [inventories, setInventories, inventoriesLoaded] = useStorage("flock:inventories", []);

  const [tab, setTab] = useState("home");
  const [navStack, setNavStack] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const allLoaded = animalsLoaded && movementsLoaded && medPurchasesLoaded && medAdminLoaded &&
    deathsLoaded && tagReplacementsLoaded && notesLoaded && settingsLoaded && feedLogLoaded &&
    lambingsLoaded && inventoriesLoaded;

  const push = useCallback((view) => setNavStack(s => [...s, view]), []);
  const pop = useCallback(() => setNavStack(s => s.slice(0, -1)), []);
  const currentView = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  const activeAnimals = useMemo(() => (animals || []).filter(a => a.status === "active"), [animals]);
  const ewes = useMemo(() => activeAnimals.filter(a => a.sex === "ewe"), [activeAnimals]);
  const rams = useMemo(() => activeAnimals.filter(a => a.sex === "ram"), [activeAnimals]);

  // Lambing season detection
  const lambingSeason = useMemo(() => {
    if (!settings?.tuppingStart || !settings?.tuppingEnd) return null;
    const earliest = addDays(settings.tuppingStart, settings.gestationMin || 145);
    const latest = addDays(settings.tuppingEnd, settings.gestationMax || 152);
    const today = todayISO();
    const windowStart = addDays(earliest, -14);
    const windowEnd = addDays(latest, 14);
    const isActive = today >= windowStart && today <= windowEnd;
    return { earliest, latest, windowStart, windowEnd, isActive };
  }, [settings]);

  // Current season lambings
  const seasonLambings = useMemo(() => {
    if (!lambingSeason || !lambings) return [];
    return lambings.filter(l => l.date >= lambingSeason.earliest && l.date <= lambingSeason.latest);
  }, [lambings, lambingSeason]);

  const ewesLambed = useMemo(() => new Set(seasonLambings.map(l => l.eweId)), [seasonLambings]);
  const ewesToLamb = useMemo(() => ewes.filter(e => !ewesLambed.has(e.id)), [ewes, ewesLambed]);

  // Withdrawal alerts
  const withdrawalAlerts = useMemo(() => {
    if (!medAdmin) return [];
    const today = todayISO();
    return medAdmin.filter(m => m.earliestSlaughterDate && m.earliestSlaughterDate > today);
  }, [medAdmin]);

  // Ram from settings
  const settingsRam = useMemo(() => {
    if (!settings?.ramId || !animals) return null;
    return animals.find(a => a.id === settings.ramId);
  }, [settings, animals]);

  if (!allLoaded) return <><StyleTag /><LoadingSkeleton /></>;

  const handleTabChange = (t) => { setTab(t); setNavStack([]); };

  const renderContent = () => {
    if (currentView) {
      const { type, ...props } = currentView;
      const viewProps = {
        ...props, animals, setAnimals, movements, setMovements, medPurchases, setMedPurchases,
        medAdmin, setMedAdmin, deaths, setDeaths, tagReplacements, setTagReplacements,
        notes, setNotes, settings, setSettings, feedLog, setFeedLog, lambings, setLambings,
        inventories, setInventories, push, pop, setConfirm, activeAnimals, ewes, rams,
        lambingSeason, seasonLambings, ewesLambed, ewesToLamb, settingsRam, withdrawalAlerts,
      };
      switch (type) {
        case "animalProfile": return <AnimalProfile {...viewProps} />;
        case "animalForm": return <AnimalForm {...viewProps} />;
        case "lambingRecord": return <LambingRecord {...viewProps} />;
        case "treatmentForm": return <TreatmentForm {...viewProps} />;
        case "purchaseForm": return <PurchaseForm {...viewProps} />;
        case "movementForm": return <MovementForm {...viewProps} />;
        case "deathForm": return <DeathForm {...viewProps} />;
        case "tagForm": return <TagReplacementForm {...viewProps} />;
        case "settingsView": return <SettingsView {...viewProps} />;
        case "movementsList": return <MovementsList {...viewProps} />;
        case "deathsList": return <DeathsList {...viewProps} />;
        case "tagsList": return <TagsList {...viewProps} />;
        case "inventoryView": return <InventoryView {...viewProps} />;
        case "feedLogView": return <FeedLogView {...viewProps} />;
        case "exportView": return <ExportView {...viewProps} />;
        case "treatmentDetail": return <TreatmentDetail {...viewProps} />;
        case "movementDetail": return <MovementDetail {...viewProps} />;
        default: return null;
      }
    }
    const sharedProps = {
      animals, setAnimals, movements, setMovements, medPurchases, setMedPurchases,
      medAdmin, setMedAdmin, deaths, setDeaths, tagReplacements, setTagReplacements,
      notes, setNotes, settings, setSettings, feedLog, setFeedLog, lambings, setLambings,
      inventories, setInventories, push, pop, setConfirm, activeAnimals, ewes, rams,
      lambingSeason, seasonLambings, ewesLambed, ewesToLamb, settingsRam, withdrawalAlerts,
    };
    switch (tab) {
      case "home": return <HomeScreen {...sharedProps} />;
      case "flock": return <FlockScreen {...sharedProps} />;
      case "lambing": return <LambingScreen {...sharedProps} />;
      case "health": return <HealthScreen {...sharedProps} />;
      case "records": return <RecordsScreen {...sharedProps} />;
      default: return <HomeScreen {...sharedProps} />;
    }
  };

  const tabs = [
    { id: "home", label: "Home", Icon: Home },
    { id: "flock", label: "Flock", Icon: Users },
    { id: "lambing", label: "Lambing", Icon: Heart },
    { id: "health", label: "Health", Icon: Pill },
    { id: "records", label: "Records", Icon: ClipboardList },
  ];

  return (
    <>
      <StyleTag />
      <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg, paddingBottom: 72 }}>
        <div className="flex-1 px-4 pb-4 max-w-3xl mx-auto w-full">
          {renderContent()}
        </div>
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center"
          style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, height: 64, zIndex: 40 }}>
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={{ color: tab === id ? COLORS.primary : COLORS.textMuted, minWidth: 44 }}>
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </nav>
        {confirm && <Confirm message={confirm.message} onConfirm={() => { confirm.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      </div>
    </>
  );
}


// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen(p) {
  const { settings, activeAnimals, lambingSeason, seasonLambings, ewes, ewesToLamb, withdrawalAlerts, push, tagReplacements, inventories, medAdmin, movements, deaths, lambings, animals } = p;
  const today = todayISO();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();

  const hasInventoryThisYear = (inventories || []).some(inv => inv.year === year);
  const needsInventory = (month === 10 || month === 11) && !hasInventoryThisYear;

  const oldTagReplacements = (tagReplacements || []).filter(t => {
    const d = daysBetween(t.date, today);
    return d > 28;
  });

  const overdueCount = oldTagReplacements.length + (needsInventory ? 1 : 0);

  const totalLiveLambs = seasonLambings.reduce((sum, l) => sum + (l.liveBorn || 0), 0);
  const lambingPct = seasonLambings.length > 0 ? Math.round((totalLiveLambs / seasonLambings.length) * 100) : 0;

  // Recent activity
  const recentItems = useMemo(() => {
    const items = [];
    (lambings || []).forEach(l => {
      const ewe = (animals || []).find(a => a.id === l.eweId);
      items.push({ date: l.date, type: "lambing", label: `${getAnimalLabel(ewe || {})} lambed — ${l.liveBorn} live`, id: l.id });
    });
    (medAdmin || []).forEach(m => {
      items.push({ date: m.date, type: "treatment", label: `${m.productName} — ${m.animalGroupDescription || `${m.animalIds?.length || 0} animal(s)`}`, id: m.id });
    });
    (movements || []).forEach(m => {
      items.push({ date: m.date, type: "movement", label: `${m.direction === "on" ? "On" : "Off"} — ${m.animalIds?.length || 0} animal(s)`, id: m.id });
    });
    (deaths || []).forEach(d => {
      const animal = (animals || []).find(a => a.id === d.animalId);
      items.push({ date: d.createdAt, type: "death", label: `${getAnimalLabel(animal || {})} — ${d.cause || "death recorded"}`, id: d.id });
    });
    return _.orderBy(items, ["date"], ["desc"]).slice(0, 5);
  }, [lambings, medAdmin, movements, deaths, animals]);

  const daysToLambing = lambingSeason ? daysBetween(today, lambingSeason.earliest) : null;

  let lambingStatus = "";
  if (lambingSeason) {
    if (today < lambingSeason.earliest) lambingStatus = `${Math.max(0, daysToLambing)} days to first due`;
    else if (today <= lambingSeason.latest) lambingStatus = ewesToLamb.length > 0 ? `${ewesToLamb.length} ewes still to lamb` : "All ewes lambed!";
    else lambingStatus = "Season complete";
  }

  return (
    <div>
      <div className="pt-4 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>
          {settings?.holderName ? `${settings.holderName}'s Flock` : "Flock Manager"}
        </h1>
        {!settings?.holderName && (
          <button onClick={() => push({ type: "settingsView" })} className="text-sm font-medium mt-1" style={{ color: COLORS.primary }}>
            Set up your holding →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card><div className="text-2xl font-bold" style={{ color: COLORS.primary }}>{activeAnimals.length}</div><div className="text-sm" style={{ color: COLORS.textMuted }}>Active animals</div></Card>
        <Card>
          <div className="text-sm font-semibold" style={{ color: lambingSeason?.isActive ? COLORS.accent : COLORS.textMuted }}>
            {lambingSeason ? (lambingSeason.isActive ? "🐑" : "📅") : "—"}
          </div>
          <div className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{lambingStatus || "Set tupping dates"}</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold" style={{ color: withdrawalAlerts.length > 0 ? COLORS.accent : COLORS.primary }}>{withdrawalAlerts.length}</div>
          <div className="text-sm" style={{ color: COLORS.textMuted }}>Withdrawal alerts</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold" style={{ color: overdueCount > 0 ? COLORS.accent : COLORS.primary }}>{overdueCount}</div>
          <div className="text-sm" style={{ color: COLORS.textMuted }}>Actions needed</div>
        </Card>
      </div>

      {lambingSeason?.isActive && (
        <Card className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Lambing Progress</span>
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{seasonLambings.length} / {ewes.length} ewes</span>
          </div>
          <div className="w-full rounded-full h-3 mb-2" style={{ background: COLORS.borderLight }}>
            <div className="h-3 rounded-full transition-all" style={{ width: `${ewes.length > 0 ? (seasonLambings.length / ewes.length * 100) : 0}%`, background: COLORS.primary }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: COLORS.textMuted }}>
            <span>{totalLiveLambs} live lambs</span>
            <span>{lambingPct}% lambing rate</span>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {lambingSeason?.isActive && (
          <Btn onClick={() => push({ type: "lambingRecord" })} size="lg" className="w-full gap-2">
            <Heart size={20} /> Record Lambing
          </Btn>
        )}
        <div className="flex gap-2">
          <Btn onClick={() => push({ type: "treatmentForm" })} variant="secondary" className="flex-1 gap-2">
            <Syringe size={18} /> Treatment
          </Btn>
          <Btn onClick={() => push({ type: "movementForm" })} variant="secondary" className="flex-1 gap-2">
            <Truck size={18} /> Movement
          </Btn>
        </div>
      </div>

      {recentItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Recent Activity</h3>
          {recentItems.map((item, i) => (
            <Card key={i} className="mb-2 flex items-center gap-3" onClick={() => {
              if (item.type === "treatment") push({ type: "treatmentDetail", treatmentId: item.id });
              if (item.type === "movement") push({ type: "movementDetail", movementId: item.id });
            }}>
              <div className="flex-shrink-0" style={{ color: COLORS.textMuted }}>
                {item.type === "lambing" && <Baby size={18} />}
                {item.type === "treatment" && <Syringe size={18} />}
                {item.type === "movement" && <Truck size={18} />}
                {item.type === "death" && <Skull size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>{toUKDate(item.date)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── FLOCK SCREEN ────────────────────────────────────────────────────────────
function FlockScreen(p) {
  const { animals, push } = p;
  const [statusFilter, setStatusFilter] = useState("active");
  const [sexFilter, setSexFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const filtered = useMemo(() => {
    let list = animals || [];
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    if (sexFilter !== "all") list = list.filter(a => a.sex === sexFilter);
    list = _.orderBy(list, [a => {
      if (sortBy === "name") return getAnimalLabel(a).toLowerCase();
      if (sortBy === "tag") return a.visualTag || a.eidTag || "";
      return a.createdAt;
    }], ["asc"]);
    // Put active first regardless
    if (statusFilter === "all") {
      list = [...list.filter(a => a.status === "active"), ...list.filter(a => a.status !== "active")];
    }
    return list;
  }, [animals, statusFilter, sexFilter, sortBy]);

  return (
    <div>
      <Header title="Flock Register" />
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, background: COLORS.surface }}>
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="sold">Sold</option>
          <option value="slaughtered">Slaughtered</option>
          <option value="dead">Dead</option>
        </select>
        <select value={sexFilter} onChange={e => setSexFilter(e.target.value)}
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, background: COLORS.surface }}>
          <option value="all">All types</option>
          <option value="ewe">Ewes</option>
          <option value="ram">Rams</option>
          <option value="wether">Wethers</option>
          <option value="ewe_lamb">Ewe Lambs</option>
          <option value="ram_lamb">Ram Lambs</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, background: COLORS.surface }}>
          <option value="name">Name</option>
          <option value="tag">Tag</option>
          <option value="date">Date added</option>
        </select>
      </div>

      <div className="text-xs mb-3" style={{ color: COLORS.textMuted }}>{filtered.length} animal{filtered.length !== 1 ? "s" : ""}</div>

      {filtered.map(animal => (
        <Card key={animal.id} onClick={() => push({ type: "animalProfile", animalId: animal.id })} className="mb-2 flex items-center gap-3"
          style={{ opacity: animal.status !== "active" ? 0.6 : 1 }}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
            {animal.photoUrl ? <img src={animal.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" /> : SEX_ICONS[animal.sex] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{getAnimalLabel(animal)}</div>
            <div className="text-xs" style={{ color: COLORS.textMuted }}>{animal.breed} · {SEX_LABELS[animal.sex] || animal.sex}</div>
          </div>
          <Badge label={animal.status} color={STATUS_COLORS[animal.status] || COLORS.textMuted} small />
          <ChevronRight size={18} style={{ color: COLORS.textLight }} />
        </Card>
      ))}

      {filtered.length === 0 && <Empty icon={Users} message="No animals match your filters" />}

      <button onClick={() => push({ type: "animalForm" })}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-30"
        style={{ background: COLORS.primary, color: "#fff" }}>
        <Plus size={26} />
      </button>
    </div>
  );
}


// ─── ANIMAL PROFILE ──────────────────────────────────────────────────────────
function AnimalProfile(p) {
  const { animalId, animals, setAnimals, lambings, medAdmin, movements, deaths, tagReplacements, notes, setNotes, push, pop, setConfirm } = p;
  const animal = (animals || []).find(a => a.id === animalId);
  if (!animal) return <div><Header title="Not Found" onBack={pop} /><p>Animal not found.</p></div>;

  const dam = animal.damId ? (animals || []).find(a => a.id === animal.damId) : null;
  const sire = animal.sireId ? (animals || []).find(a => a.id === animal.sireId) : null;
  const offspring = (animals || []).filter(a => a.damId === animalId || a.sireId === animalId);

  const animalLambings = (lambings || []).filter(l => l.eweId === animalId);
  const animalTreatments = (medAdmin || []).filter(m => (m.animalIds || []).includes(animalId));
  const animalMovements = (movements || []).filter(m => (m.animalIds || []).includes(animalId));
  const animalDeaths = (deaths || []).filter(d => d.animalId === animalId);
  const animalTags = (tagReplacements || []).filter(t => t.animalId === animalId);
  const animalNotes = (notes || []).filter(n => n.animalId === animalId);

  const timeline = useMemo(() => {
    const items = [];
    animalLambings.forEach(l => items.push({ date: l.date, type: "Lambing", detail: `${l.liveBorn} live, ${l.deadBorn} dead` }));
    animalTreatments.forEach(t => items.push({ date: t.date, type: "Treatment", detail: `${t.productName} — ${t.dose}` }));
    animalMovements.forEach(m => items.push({ date: m.date, type: "Movement", detail: `${m.direction === "on" ? "On" : "Off"} — ${m.reason}` }));
    animalDeaths.forEach(d => items.push({ date: d.createdAt, type: "Death", detail: d.cause }));
    animalTags.forEach(t => items.push({ date: t.date, type: "Tag change", detail: `${t.originalTag} → ${t.newTag}` }));
    animalNotes.forEach(n => items.push({ date: n.date, type: "Note", detail: n.text }));
    return _.orderBy(items, ["date"], ["desc"]);
  }, [animalLambings, animalTreatments, animalMovements, animalDeaths, animalTags, animalNotes]);

  const [noteText, setNoteText] = useState("");

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { id: genId(), animalId, date: todayISO(), text: noteText.trim(), createdAt: now() }]);
    setNoteText("");
  };

  const recordDeath = () => {
    setConfirm({
      message: `Record ${getAnimalLabel(animal)} as dead? This will mark them as no longer active.`,
      onConfirm: () => push({ type: "deathForm", preselectedAnimalId: animalId })
    });
  };

  const age = animal.dateOfBirth
    ? `${Math.floor(daysBetween(animal.dateOfBirth, todayISO()) / 365)} years`
    : animal.approxAge || "Unknown";

  return (
    <div>
      <Header title={getAnimalLabel(animal)} onBack={pop}
        right={<Btn variant="ghost" size="sm" onClick={() => push({ type: "animalForm", editId: animalId })}><Edit3 size={18} /></Btn>} />

      <Card className="mb-4">
        <div className="flex gap-4 items-start">
          {animal.photoUrl ? (
            <img src={animal.photoUrl} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{SEX_ICONS[animal.sex]}</div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{getAnimalLabel(animal)}</span>
              <Badge label={animal.status} color={STATUS_COLORS[animal.status]} small />
            </div>
            <div className="text-sm" style={{ color: COLORS.textMuted }}>
              {animal.breed} · {SEX_LABELS[animal.sex]} · {age}
            </div>
            {animal.eidTag && <div className="text-xs mt-1" style={{ color: COLORS.textMuted }}>EID: {animal.eidTag}</div>}
            {animal.visualTag && <div className="text-xs" style={{ color: COLORS.textMuted }}>Visual: {animal.visualTag}</div>}
          </div>
        </div>
      </Card>

      {(dam || sire) && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Parentage</h3>
          {dam && (
            <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => push({ type: "animalProfile", animalId: dam.id })}>
              <span className="text-sm">Dam: <strong>{getAnimalLabel(dam)}</strong></span>
              <ChevronRight size={14} style={{ color: COLORS.textLight }} />
            </div>
          )}
          {sire && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => push({ type: "animalProfile", animalId: sire.id })}>
              <span className="text-sm">Sire: <strong>{getAnimalLabel(sire)}</strong></span>
              <ChevronRight size={14} style={{ color: COLORS.textLight }} />
            </div>
          )}
        </Card>
      )}

      {offspring.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Offspring ({offspring.length})</h3>
          {offspring.map(o => (
            <div key={o.id} className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => push({ type: "animalProfile", animalId: o.id })}>
              <span className="text-sm">{getAnimalLabel(o)} — {SEX_LABELS[o.sex]}</span>
              <Badge label={o.status} color={STATUS_COLORS[o.status]} small />
              <ChevronRight size={14} style={{ color: COLORS.textLight }} />
            </div>
          ))}
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Timeline</h3>
        {timeline.length === 0 && <p className="text-sm" style={{ color: COLORS.textMuted }}>No events recorded yet.</p>}
        {timeline.map((item, i) => (
          <div key={i} className="flex gap-3 mb-2 pb-2" style={{ borderBottom: i < timeline.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
            <div className="text-xs font-medium w-20 flex-shrink-0" style={{ color: COLORS.textMuted }}>{toUKDate(item.date)}</div>
            <div>
              <div className="text-xs font-semibold" style={{ color: COLORS.primary }}>{item.type}</div>
              <div className="text-sm">{item.detail}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Add Note</h3>
        <div className="flex gap-2">
          <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Quick note…"
            style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", flex: 1, fontSize: 14 }} />
          <Btn size="sm" onClick={addNote} disabled={!noteText.trim()}>Add</Btn>
        </div>
      </Card>

      {animal.status === "active" && (
        <div className="flex gap-2 mb-4">
          <Btn variant="danger" size="sm" onClick={recordDeath} className="gap-1"><Skull size={16} /> Record Death</Btn>
        </div>
      )}
    </div>
  );
}


// ─── ANIMAL FORM ─────────────────────────────────────────────────────────────
function AnimalForm(p) {
  const { editId, animals, setAnimals, activeAnimals, pop } = p;
  const existing = editId ? (animals || []).find(a => a.id === editId) : null;

  const [form, setForm] = useState(existing || {
    eidTag: "", visualTag: "", name: "", breed: "Easycare", sex: "ewe",
    dateOfBirth: "", approxAge: "", dateTagged: "", tagType: "adult",
    bornOnHolding: false, source: "", damId: "", sireId: "",
    status: "active", photoUrl: null, notes: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = maxW / img.width;
      canvas.width = img.width > maxW ? maxW : img.width;
      canvas.height = img.width > maxW ? img.height * scale : img.height;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      set("photoUrl", canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = URL.createObjectURL(file);
  };

  const save = () => {
    if (existing) {
      setAnimals(prev => prev.map(a => a.id === editId ? { ...a, ...form } : a));
    } else {
      setAnimals(prev => [...prev, { ...form, id: genId(), createdAt: now(), status: "active" }]);
    }
    pop();
  };

  const dams = activeAnimals.filter(a => a.sex === "ewe" && a.id !== editId);
  const sires = activeAnimals.filter(a => a.sex === "ram" && a.id !== editId);

  return (
    <div>
      <Header title={existing ? "Edit Animal" : "Add Animal"} onBack={pop} />
      <Card>
        <Input label="Name (optional)" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Daisy" />
        <Input label="EID Tag" value={form.eidTag} onChange={e => set("eidTag", e.target.value)} />
        <Input label="Visual Tag" value={form.visualTag} onChange={e => set("visualTag", e.target.value)} />
        <Input label="Breed" value={form.breed} onChange={e => set("breed", e.target.value)} />

        <ToggleButtons label="Sex" value={form.sex} onChange={v => set("sex", v)}
          options={[{ value: "ewe", label: "Ewe" }, { value: "ram", label: "Ram" }, { value: "wether", label: "Wether" },
            { value: "ewe_lamb", label: "Ewe Lamb" }, { value: "ram_lamb", label: "Ram Lamb" }]} />

        <ToggleButtons label="Tag Type" value={form.tagType} onChange={v => set("tagType", v)}
          options={[{ value: "adult", label: "Adult (2 tags)" }, { value: "slaughter", label: "Slaughter (EID)" }]} />

        <Input label="Date of Birth" type="date" value={form.dateOfBirth || ""} onChange={e => set("dateOfBirth", e.target.value)} />
        <Input label="Approximate Age (if DOB unknown)" value={form.approxAge} onChange={e => set("approxAge", e.target.value)} placeholder="e.g. ~3 years" />

        <div className="mb-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.bornOnHolding} onChange={e => set("bornOnHolding", e.target.checked)}
              className="w-5 h-5 rounded" />
            <span className="text-sm font-medium">Born on holding</span>
          </label>
        </div>

        {!form.bornOnHolding && <Input label="Source (if bought in)" value={form.source} onChange={e => set("source", e.target.value)} />}

        <Select label="Dam" value={form.damId || ""} onChange={e => set("damId", e.target.value || null)}
          options={dams.map(a => ({ value: a.id, label: getAnimalLabel(a) }))} />
        <Select label="Sire" value={form.sireId || ""} onChange={e => set("sireId", e.target.value || null)}
          options={sires.map(a => ({ value: a.id, label: getAnimalLabel(a) }))} />

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>Photo</label>
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto}
            className="text-sm" style={{ color: COLORS.textMuted }} />
          {form.photoUrl && <img src={form.photoUrl} className="mt-2 w-24 h-24 rounded-xl object-cover" alt="" />}
        </div>

        <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />

        <Btn onClick={save} className="w-full mt-2">{existing ? "Save Changes" : "Add Animal"}</Btn>
      </Card>
    </div>
  );
}


// ─── LAMBING SCREEN ──────────────────────────────────────────────────────────
function LambingScreen(p) {
  const { settings, lambingSeason, ewes, ewesToLamb, seasonLambings, ewesLambed, animals, push } = p;
  const [showLambed, setShowLambed] = useState(false);
  const totalLive = seasonLambings.reduce((s, l) => s + (l.liveBorn || 0), 0);
  const totalDead = seasonLambings.reduce((s, l) => s + (l.deadBorn || 0), 0);
  const pct = seasonLambings.length > 0 ? Math.round((totalLive / seasonLambings.length) * 100) : 0;
  const avgLitter = seasonLambings.length > 0 ? (totalLive / seasonLambings.length).toFixed(1) : "—";
  const assisted = seasonLambings.filter(l => l.assistance && l.assistance !== "none").length;

  return (
    <div>
      <Header title="Lambing Tracker" />

      {lambingSeason && (
        <Card className="mb-4">
          <div className="text-sm" style={{ color: COLORS.textMuted }}>
            Tupping: {toUKDate(settings?.tuppingStart)} – {toUKDate(settings?.tuppingEnd)}
          </div>
          <div className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            Lambing window: {toUKDate(lambingSeason.earliest)} – {toUKDate(lambingSeason.latest)}
          </div>
        </Card>
      )}

      <Btn onClick={() => push({ type: "lambingRecord" })} size="lg" className="w-full mb-4 gap-2">
        <Heart size={20} /> Record Lambing
      </Btn>

      <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>
        Ewes Due ({ewesToLamb.length})
      </h3>
      {ewesToLamb.length === 0 && <Card className="mb-4"><p className="text-sm" style={{ color: COLORS.textMuted }}>All ewes have lambed or no ewes in flock.</p></Card>}
      {ewesToLamb.map(ewe => (
        <Card key={ewe.id} className="mb-2 flex items-center gap-3" onClick={() => push({ type: "animalProfile", animalId: ewe.id })}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ background: COLORS.primaryLight, color: COLORS.primary }}>♀</div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{getAnimalLabel(ewe)}</div>
            {lambingSeason && <div className="text-xs" style={{ color: COLORS.textMuted }}>
              Due: {toUKDate(lambingSeason.earliest)} – {toUKDate(lambingSeason.latest)}
            </div>}
          </div>
        </Card>
      ))}

      <div className="mt-4">
        <button onClick={() => setShowLambed(!showLambed)} className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>
          Ewes Lambed ({seasonLambings.length}) <ChevronRight size={14} style={{ transform: showLambed ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {showLambed && seasonLambings.map(l => {
          const ewe = (animals || []).find(a => a.id === l.eweId);
          return (
            <Card key={l.id} className="mb-2 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{getAnimalLabel(ewe || {})}</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>
                  {toUKDate(l.date)} · {l.liveBorn} live{l.deadBorn > 0 ? `, ${l.deadBorn} dead` : ""}
                  {l.assistance && l.assistance !== "none" ? ` · ${l.assistance} assist` : ""}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {seasonLambings.length > 0 && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Season Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Ewes lambed: <strong>{seasonLambings.length} / {ewes.length}</strong></div>
            <div>Lambing %: <strong>{pct}%</strong></div>
            <div>Live lambs: <strong>{totalLive}</strong></div>
            <div>Dead lambs: <strong>{totalDead}</strong></div>
            <div>Avg litter: <strong>{avgLitter}</strong></div>
            <div>Assisted: <strong>{assisted}</strong></div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── LAMBING RECORD ──────────────────────────────────────────────────────────
function LambingRecord(p) {
  const { ewesToLamb, ewes, animals, setAnimals, lambings, setLambings, settings, pop } = p;
  const [step, setStep] = useState(1);
  const [eweId, setEweId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [liveBorn, setLiveBorn] = useState(1);
  const [deadBorn, setDeadBorn] = useState(0);
  const [lambs, setLambs] = useState([]);
  const [assistance, setAssistance] = useState("none");
  const [eweCondition, setEweCondition] = useState("");
  const [lNotes, setLNotes] = useState("");

  useEffect(() => {
    const arr = [];
    for (let i = 0; i < liveBorn; i++) {
      arr.push(lambs[i] || { sex: "ewe_lamb", name: "" });
    }
    setLambs(arr);
  }, [liveBorn]);

  const selectedEwe = (animals || []).find(a => a.id === eweId);
  const ramId = settings?.ramId || null;

  const save = () => {
    const lambIds = [];
    const newAnimals = lambs.map((lamb, i) => {
      const id = genId();
      lambIds.push(id);
      return {
        id, eidTag: "", visualTag: "", name: lamb.name || "",
        breed: "Easycare", sex: lamb.sex, dateOfBirth: date,
        approxAge: "", dateTagged: null, tagType: "slaughter",
        bornOnHolding: true, source: "", damId: eweId, sireId: ramId,
        status: "active", statusDate: null, photoUrl: null, createdAt: now(), notes: ""
      };
    });

    setAnimals(prev => [...prev, ...newAnimals]);
    setLambings(prev => [...(prev || []), {
      id: genId(), eweId, date, liveBorn, deadBorn, assistance,
      eweCondition, lambIds, notes: lNotes, createdAt: now()
    }]);
    pop();
  };

  const eweList = ewesToLamb.length > 0 ? ewesToLamb : ewes;

  return (
    <div>
      <Header title="Record Lambing" onBack={pop} />

      {step === 1 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>Select Ewe</h3>
          {eweList.map(ewe => (
            <Card key={ewe.id} onClick={() => { setEweId(ewe.id); setStep(2); }}
              className="mb-2 flex items-center gap-3"
              style={{ border: eweId === ewe.id ? `2px solid ${COLORS.primary}` : undefined }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: COLORS.primaryLight, color: COLORS.primary }}>♀</div>
              <div className="text-sm font-semibold">{getAnimalLabel(ewe)}</div>
            </Card>
          ))}
          {eweList.length === 0 && <Empty icon={Heart} message="No ewes available" />}
        </div>
      )}

      {step === 2 && (
        <Card>
          <div className="text-sm font-semibold mb-3">Ewe: {getAnimalLabel(selectedEwe || {})}</div>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <ToggleButtons label="Live born" value={liveBorn} onChange={v => setLiveBorn(v)}
            options={[{ value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]} />
          <ToggleButtons label="Dead born" value={deadBorn} onChange={v => setDeadBorn(v)}
            options={[{ value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" }]} />
          <Btn onClick={() => setStep(liveBorn > 0 ? 3 : 4)} className="w-full mt-2">Next</Btn>
        </Card>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>Lamb Details</h3>
          {lambs.map((lamb, i) => (
            <Card key={i} className="mb-3">
              <div className="text-sm font-semibold mb-2">Lamb {i + 1}</div>
              <ToggleButtons label="Sex" value={lamb.sex} onChange={v => {
                const arr = [...lambs]; arr[i] = { ...arr[i], sex: v }; setLambs(arr);
              }} options={[{ value: "ewe_lamb", label: "Ewe" }, { value: "ram_lamb", label: "Ram" }]} />
              <Input label="Name (optional)" value={lamb.name} onChange={e => {
                const arr = [...lambs]; arr[i] = { ...arr[i], name: e.target.value }; setLambs(arr);
              }} placeholder="Leave blank if unnamed" />
            </Card>
          ))}
          <Btn onClick={() => setStep(4)} className="w-full">Next</Btn>
        </div>
      )}

      {step === 4 && (
        <Card>
          <ToggleButtons label="Assistance" value={assistance} onChange={v => setAssistance(v)}
            options={[{ value: "none", label: "None" }, { value: "minor", label: "Minor" }, { value: "vet", label: "Vet" }]} />
          <TextArea label="Ewe condition" value={eweCondition} onChange={e => setEweCondition(e.target.value)} placeholder="Any concerns?" />
          <TextArea label="Notes" value={lNotes} onChange={e => setLNotes(e.target.value)} />
          <Btn onClick={() => setStep(5)} className="w-full mt-2">Review</Btn>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Review</h3>
          <div className="text-sm space-y-1 mb-4">
            <div>Ewe: <strong>{getAnimalLabel(selectedEwe || {})}</strong></div>
            <div>Date: <strong>{toUKDate(date)}</strong></div>
            <div>Live: <strong>{liveBorn}</strong> · Dead: <strong>{deadBorn}</strong></div>
            {lambs.map((l, i) => (
              <div key={i}>Lamb {i+1}: {SEX_LABELS[l.sex]}{l.name ? ` — ${l.name}` : ""}</div>
            ))}
            <div>Assistance: <strong>{assistance}</strong></div>
            {eweCondition && <div>Condition: {eweCondition}</div>}
            {lNotes && <div>Notes: {lNotes}</div>}
          </div>
          <Btn onClick={save} className="w-full" size="lg">Save Lambing</Btn>
        </Card>
      )}
    </div>
  );
}


// ─── HEALTH SCREEN ───────────────────────────────────────────────────────────
function HealthScreen(p) {
  const { medAdmin, medPurchases, push } = p;
  const [subTab, setSubTab] = useState("treatments");
  const today = todayISO();

  return (
    <div>
      <Header title="Health Records" />
      <div className="flex gap-2 mb-4">
        {["treatments", "purchases"].map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            style={{
              background: subTab === t ? COLORS.primary : COLORS.surface,
              color: subTab === t ? "#fff" : COLORS.text,
              border: `1px solid ${subTab === t ? COLORS.primary : COLORS.border}`,
              borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 600, minHeight: 44,
            }}>{t === "treatments" ? "Treatments" : "Purchases"}</button>
        ))}
      </div>

      {subTab === "treatments" && (
        <div>
          <Btn onClick={() => push({ type: "treatmentForm" })} className="w-full mb-4 gap-2"><Syringe size={18} /> Record Treatment</Btn>
          {(medAdmin || []).length === 0 && <Empty icon={Syringe} message="No treatments recorded yet" />}
          {_.orderBy(medAdmin || [], ["date"], ["desc"]).map(t => {
            const inWithdrawal = t.earliestSlaughterDate && t.earliestSlaughterDate > today;
            const daysLeft = inWithdrawal ? daysBetween(today, t.earliestSlaughterDate) : 0;
            return (
              <Card key={t.id} className="mb-2" onClick={() => push({ type: "treatmentDetail", treatmentId: t.id })}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">{t.productName}</div>
                    <div className="text-xs" style={{ color: COLORS.textMuted }}>
                      {toUKDate(t.date)} · {t.animalGroupDescription || `${t.animalIds?.length || 0} animal(s)`}
                    </div>
                  </div>
                  {inWithdrawal ? (
                    <Badge label={`${daysLeft}d left`} color={COLORS.accent} small />
                  ) : t.withdrawalDays > 0 ? (
                    <Badge label="Clear" color={COLORS.statusActive} small />
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {subTab === "purchases" && (
        <div>
          <Btn onClick={() => push({ type: "purchaseForm" })} className="w-full mb-4 gap-2"><Package size={18} /> Record Purchase</Btn>
          {(medPurchases || []).length === 0 && <Empty icon={Package} message="No purchases recorded yet" />}
          {_.orderBy(medPurchases || [], ["date"], ["desc"]).map(mp => (
            <Card key={mp.id} className="mb-2">
              <div className="text-sm font-semibold">{mp.productName}</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>
                {toUKDate(mp.date)} · Batch: {mp.batchNumber} · Qty: {mp.quantity}
              </div>
              {mp.supplier && <div className="text-xs" style={{ color: COLORS.textMuted }}>Supplier: {mp.supplier}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TREATMENT DETAIL ────────────────────────────────────────────────────────
function TreatmentDetail(p) {
  const { treatmentId, medAdmin, animals, pop } = p;
  const t = (medAdmin || []).find(m => m.id === treatmentId);
  if (!t) return <div><Header title="Not Found" onBack={pop} /></div>;
  const today = todayISO();
  const inWithdrawal = t.earliestSlaughterDate && t.earliestSlaughterDate > today;
  const treatedAnimals = (t.animalIds || []).map(id => (animals || []).find(a => a.id === id)).filter(Boolean);

  return (
    <div>
      <Header title="Treatment Detail" onBack={pop} />
      <Card>
        <div className="space-y-2 text-sm">
          <div><span style={{ color: COLORS.textMuted }}>Product:</span> <strong>{t.productName}</strong></div>
          <div><span style={{ color: COLORS.textMuted }}>Date:</span> {toUKDate(t.date)}</div>
          <div><span style={{ color: COLORS.textMuted }}>Batch:</span> {t.batchNumber}</div>
          <div><span style={{ color: COLORS.textMuted }}>Dose:</span> {t.dose}</div>
          <div><span style={{ color: COLORS.textMuted }}>Route:</span> {ROUTE_LABELS[t.route] || t.route}</div>
          {t.animalGroupDescription && <div><span style={{ color: COLORS.textMuted }}>Group:</span> {t.animalGroupDescription}</div>}
          {treatedAnimals.length > 0 && (
            <div><span style={{ color: COLORS.textMuted }}>Animals:</span> {treatedAnimals.map(a => getAnimalLabel(a)).join(", ")}</div>
          )}
          <div><span style={{ color: COLORS.textMuted }}>Withdrawal:</span> {t.withdrawalDays || 0} days</div>
          {t.earliestSlaughterDate && (
            <div style={{ color: inWithdrawal ? COLORS.accent : COLORS.statusActive, fontWeight: 600 }}>
              Earliest slaughter: {toUKDate(t.earliestSlaughterDate)} {inWithdrawal ? `(${daysBetween(today, t.earliestSlaughterDate)} days)` : "(Clear)"}
            </div>
          )}
          <div><span style={{ color: COLORS.textMuted }}>Given by:</span> {t.givenBy || "—"}</div>
          {t.notes && <div><span style={{ color: COLORS.textMuted }}>Notes:</span> {t.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

// ─── TREATMENT FORM ──────────────────────────────────────────────────────────
function TreatmentForm(p) {
  const { activeAnimals, medAdmin, setMedAdmin, pop } = p;
  const [form, setForm] = useState({
    date: todayISO(), productName: "", batchNumber: "", animalIds: [],
    animalGroupDescription: "", dose: "", route: "injection",
    withdrawalDays: "", givenBy: "", notes: ""
  });
  const [mode, setMode] = useState("group"); // group | individual
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const recentProducts = useMemo(() => {
    const names = (medAdmin || []).map(m => m.productName).filter(Boolean);
    return [...new Set(names)].slice(0, 5);
  }, [medAdmin]);

  const withdrawalDays = parseInt(form.withdrawalDays) || 0;
  const earliestSlaughterDate = withdrawalDays > 0 ? addDays(form.date, withdrawalDays) : null;

  const toggleAnimal = (id) => {
    set("animalIds", form.animalIds.includes(id) ? form.animalIds.filter(a => a !== id) : [...form.animalIds, id]);
  };

  const save = () => {
    setMedAdmin(prev => [...(prev || []), {
      ...form, id: genId(), withdrawalDays, earliestSlaughterDate, createdAt: now(),
      animalIds: mode === "individual" ? form.animalIds : []
    }]);
    pop();
  };

  return (
    <div>
      <Header title="Record Treatment" onBack={pop} />
      <Card>
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <Input label="Product Name" value={form.productName} onChange={e => set("productName", e.target.value)} />
        {recentProducts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 -mt-2">
            {recentProducts.map(name => (
              <button key={name} onClick={() => set("productName", name)}
                className="text-xs px-2 py-1 rounded-full" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{name}</button>
            ))}
          </div>
        )}
        <Input label="Batch Number" value={form.batchNumber} onChange={e => set("batchNumber", e.target.value)} />

        <ToggleButtons label="Animals" value={mode} onChange={v => setMode(v)}
          options={[{ value: "group", label: "Group" }, { value: "individual", label: "Individual" }]} />

        {mode === "group" && (
          <Input label="Group Description" value={form.animalGroupDescription} onChange={e => set("animalGroupDescription", e.target.value)}
            placeholder="e.g. all ewes, twin-bearing ewes" />
        )}
        {mode === "individual" && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>Select Animals ({form.animalIds.length})</label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2" style={{ borderColor: COLORS.border }}>
              {activeAnimals.map(a => (
                <label key={a.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={form.animalIds.includes(a.id)} onChange={() => toggleAnimal(a.id)} className="w-4 h-4" />
                  <span className="text-sm">{getAnimalLabel(a)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Input label="Dose" value={form.dose} onChange={e => set("dose", e.target.value)} />
        <ToggleButtons label="Route" value={form.route} onChange={v => set("route", v)}
          options={[{ value: "oral", label: "Oral" }, { value: "injection", label: "Injection" },
            { value: "pour-on", label: "Pour-on" }, { value: "other", label: "Other" }]} />
        <Input label="Withdrawal Period (days)" type="number" value={form.withdrawalDays} onChange={e => set("withdrawalDays", e.target.value)} />

        {earliestSlaughterDate && (
          <div className="mb-3 p-3 rounded-lg" style={{ background: COLORS.accentLight, border: `1px solid ${COLORS.accent}` }}>
            <div className="text-sm font-semibold" style={{ color: COLORS.accent }}>
              Earliest slaughter: {toUKDate(earliestSlaughterDate)}
            </div>
          </div>
        )}

        <Input label="Given By" value={form.givenBy} onChange={e => set("givenBy", e.target.value)} />
        <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />

        <Btn onClick={save} className="w-full mt-2" disabled={!form.productName}>Save Treatment</Btn>
      </Card>
    </div>
  );
}

// ─── PURCHASE FORM ───────────────────────────────────────────────────────────
function PurchaseForm(p) {
  const { setMedPurchases, pop } = p;
  const [form, setForm] = useState({
    date: todayISO(), productName: "", batchNumber: "", quantity: "", supplier: "", prescribingVet: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    setMedPurchases(prev => [...(prev || []), { ...form, id: genId(), createdAt: now() }]);
    pop();
  };

  return (
    <div>
      <Header title="Record Purchase" onBack={pop} />
      <Card>
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <Input label="Product Name" value={form.productName} onChange={e => set("productName", e.target.value)} />
        <Input label="Batch Number" value={form.batchNumber} onChange={e => set("batchNumber", e.target.value)} />
        <Input label="Quantity" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
        <Input label="Supplier" value={form.supplier} onChange={e => set("supplier", e.target.value)} />
        <Input label="Prescribing Vet (optional)" value={form.prescribingVet} onChange={e => set("prescribingVet", e.target.value)} />
        <Btn onClick={save} className="w-full mt-2" disabled={!form.productName}>Save Purchase</Btn>
      </Card>
    </div>
  );
}


// ─── RECORDS SCREEN ──────────────────────────────────────────────────────────
function RecordsScreen(p) {
  const { push } = p;
  const items = [
    { label: "Movements", icon: Truck, type: "movementsList" },
    { label: "Deaths", icon: Skull, type: "deathsList" },
    { label: "Tag Replacements", icon: Tag, type: "tagsList" },
    { label: "Annual Inventory", icon: ClipboardList, type: "inventoryView" },
    { label: "Feed Log", icon: Package, type: "feedLogView" },
    { label: "Holding Settings", icon: Settings, type: "settingsView" },
    { label: "Export Data", icon: Download, type: "exportView" },
  ];

  return (
    <div>
      <Header title="Records" />
      {items.map(({ label, icon: Icon, type }) => (
        <Card key={type} onClick={() => push({ type })} className="mb-2 flex items-center gap-3">
          <Icon size={20} style={{ color: COLORS.primary }} />
          <span className="text-sm font-semibold flex-1">{label}</span>
          <ChevronRight size={18} style={{ color: COLORS.textLight }} />
        </Card>
      ))}
    </div>
  );
}

// ─── MOVEMENTS LIST ──────────────────────────────────────────────────────────
function MovementsList(p) {
  const { movements, push, pop } = p;
  return (
    <div>
      <Header title="Movements" onBack={pop} />
      <Btn onClick={() => push({ type: "movementForm" })} className="w-full mb-4 gap-2"><Truck size={18} /> Record Movement</Btn>
      {(movements || []).length === 0 && <Empty icon={Truck} message="No movements recorded" />}
      {_.orderBy(movements || [], ["date"], ["desc"]).map(m => (
        <Card key={m.id} className="mb-2" onClick={() => push({ type: "movementDetail", movementId: m.id })}>
          <div className="flex items-center gap-2">
            <Badge label={m.direction === "on" ? "ON" : "OFF"} color={m.direction === "on" ? COLORS.primary : COLORS.accent} small />
            <div className="flex-1">
              <div className="text-sm font-semibold">{REASON_LABELS[m.reason] || m.reason}</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>{toUKDate(m.date)} · {m.animalIds?.length || 0} animal(s)</div>
            </div>
            <ChevronRight size={16} style={{ color: COLORS.textLight }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── MOVEMENT DETAIL ─────────────────────────────────────────────────────────
function MovementDetail(p) {
  const { movementId, movements, animals, pop } = p;
  const m = (movements || []).find(mv => mv.id === movementId);
  if (!m) return <div><Header title="Not Found" onBack={pop} /></div>;
  const movedAnimals = (m.animalIds || []).map(id => (animals || []).find(a => a.id === id)).filter(Boolean);

  return (
    <div>
      <Header title="Movement Detail" onBack={pop} />
      <Card>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Badge label={m.direction === "on" ? "ON" : "OFF"} color={m.direction === "on" ? COLORS.primary : COLORS.accent} /></div>
          <div><span style={{ color: COLORS.textMuted }}>Date:</span> {toUKDate(m.date)}</div>
          <div><span style={{ color: COLORS.textMuted }}>From:</span> {m.fromName} ({m.fromCph})</div>
          <div><span style={{ color: COLORS.textMuted }}>To:</span> {m.toName} ({m.toCph})</div>
          <div><span style={{ color: COLORS.textMuted }}>Reason:</span> {REASON_LABELS[m.reason] || m.reason}</div>
          {m.movementDocRef && <div><span style={{ color: COLORS.textMuted }}>Doc Ref:</span> {m.movementDocRef}</div>}
          {movedAnimals.length > 0 && <div><span style={{ color: COLORS.textMuted }}>Animals:</span> {movedAnimals.map(a => getAnimalLabel(a)).join(", ")}</div>}
          {m.notes && <div><span style={{ color: COLORS.textMuted }}>Notes:</span> {m.notes}</div>}
        </div>
      </Card>
    </div>
  );
}

// ─── MOVEMENT FORM ───────────────────────────────────────────────────────────
function MovementForm(p) {
  const { activeAnimals, animals, setAnimals, setMovements, settings, setConfirm, pop } = p;
  const [form, setForm] = useState({
    date: todayISO(), direction: "off", animalIds: [],
    fromCph: settings?.cphNumber || "", fromName: settings?.holderName || "",
    toCph: "", toName: "", movementDocRef: "", reason: "sale", notes: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleAnimal = (id) => {
    set("animalIds", form.animalIds.includes(id) ? form.animalIds.filter(a => a !== id) : [...form.animalIds, id]);
  };

  const save = () => {
    const movement = { ...form, id: genId(), createdAt: now() };
    setMovements(prev => [...(prev || []), movement]);

    // If off-movement for slaughter, prompt to update status
    if (form.direction === "off" && form.reason === "slaughter" && form.animalIds.length > 0) {
      setConfirm({
        message: `Mark ${form.animalIds.length} animal(s) as slaughtered?`,
        onConfirm: () => {
          setAnimals(prev => prev.map(a =>
            form.animalIds.includes(a.id) ? { ...a, status: "slaughtered", statusDate: form.date } : a
          ));
        }
      });
    }
    pop();
  };

  return (
    <div>
      <Header title="Record Movement" onBack={pop} />
      <Card>
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <ToggleButtons label="Direction" value={form.direction} onChange={v => set("direction", v)}
          options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textMuted }}>Select Animals ({form.animalIds.length})</label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2" style={{ borderColor: COLORS.border }}>
            {activeAnimals.map(a => (
              <label key={a.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={form.animalIds.includes(a.id)} onChange={() => toggleAnimal(a.id)} className="w-4 h-4" />
                <span className="text-sm">{getAnimalLabel(a)}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="From CPH" value={form.fromCph} onChange={e => set("fromCph", e.target.value)} />
        <Input label="From Name" value={form.fromName} onChange={e => set("fromName", e.target.value)} />
        <Input label="To CPH" value={form.toCph} onChange={e => set("toCph", e.target.value)} />
        <Input label="To Name" value={form.toName} onChange={e => set("toName", e.target.value)} />
        <Input label="Movement Doc Reference" value={form.movementDocRef} onChange={e => set("movementDocRef", e.target.value)} />

        <ToggleButtons label="Reason" value={form.reason} onChange={v => set("reason", v)}
          options={[{ value: "purchase", label: "Purchase" }, { value: "sale", label: "Sale" },
            { value: "slaughter", label: "Slaughter" }, { value: "grazing", label: "Grazing" }, { value: "other", label: "Other" }]} />

        <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
        <Btn onClick={save} className="w-full mt-2">Save Movement</Btn>
      </Card>
    </div>
  );
}


// ─── DEATHS LIST ─────────────────────────────────────────────────────────────
function DeathsList(p) {
  const { deaths, animals, push, pop } = p;
  return (
    <div>
      <Header title="Death Records" onBack={pop} />
      <Btn onClick={() => push({ type: "deathForm" })} className="w-full mb-4 gap-2"><Skull size={18} /> Record Death</Btn>
      {(deaths || []).length === 0 && <Empty icon={Skull} message="No death records" />}
      {_.orderBy(deaths || [], ["createdAt"], ["desc"]).map(d => {
        const animal = (animals || []).find(a => a.id === d.animalId);
        return (
          <Card key={d.id} className="mb-2">
            <div className="text-sm font-semibold">{getAnimalLabel(animal || {})}</div>
            <div className="text-xs" style={{ color: COLORS.textMuted }}>
              {d.monthYear} · {d.cause} · {d.disposalMethod}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── DEATH FORM ──────────────────────────────────────────────────────────────
function DeathForm(p) {
  const { preselectedAnimalId, activeAnimals, animals, setAnimals, setDeaths, setConfirm, pop } = p;
  const [form, setForm] = useState({
    animalId: preselectedAnimalId || "", monthYear: "", cause: "", disposalMethod: "", notes: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const now2 = new Date();
  const defaultMonthYear = `${now2.toLocaleString("en-GB", { month: "long" })} ${now2.getFullYear()}`;

  const save = () => {
    setConfirm({
      message: "Record this death? The animal will be marked as dead.",
      onConfirm: () => {
        setDeaths(prev => [...(prev || []), { ...form, id: genId(), monthYear: form.monthYear || defaultMonthYear, createdAt: now() }]);
        setAnimals(prev => prev.map(a => a.id === form.animalId ? { ...a, status: "dead", statusDate: now() } : a));
        pop();
      }
    });
  };

  return (
    <div>
      <Header title="Record Death" onBack={pop} />
      <Card>
        <Select label="Animal" value={form.animalId} onChange={e => set("animalId", e.target.value)}
          options={activeAnimals.map(a => ({ value: a.id, label: getAnimalLabel(a) }))} />
        <Input label="Month/Year" value={form.monthYear} onChange={e => set("monthYear", e.target.value)} placeholder={defaultMonthYear} />
        <Input label="Cause" value={form.cause} onChange={e => set("cause", e.target.value)} />
        <Input label="Disposal Method" value={form.disposalMethod} onChange={e => set("disposalMethod", e.target.value)} />
        <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
        <Btn onClick={save} variant="danger" className="w-full mt-2" disabled={!form.animalId}>Record Death</Btn>
      </Card>
    </div>
  );
}

// ─── TAG REPLACEMENTS ────────────────────────────────────────────────────────
function TagsList(p) {
  const { tagReplacements, animals, push, pop } = p;
  const today = todayISO();
  return (
    <div>
      <Header title="Tag Replacements" onBack={pop} />
      <Btn onClick={() => push({ type: "tagForm" })} className="w-full mb-4 gap-2"><Tag size={18} /> Record Replacement</Btn>
      {(tagReplacements || []).length === 0 && <Empty icon={Tag} message="No tag replacements recorded" />}
      {_.orderBy(tagReplacements || [], ["date"], ["desc"]).map(t => {
        const animal = (animals || []).find(a => a.id === t.animalId);
        const overdue = daysBetween(t.date, today) > 28;
        return (
          <Card key={t.id} className="mb-2" style={overdue ? { border: `1px solid ${COLORS.accent}` } : {}}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold">{getAnimalLabel(animal || {})}</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>
                  {toUKDate(t.date)} · {t.originalTag} → {t.newTag}
                </div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>Colour: {t.tagColour} · {t.reason}</div>
              </div>
              {overdue && <Badge label="⚠ >28 days" color={COLORS.accent} small />}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── TAG FORM ────────────────────────────────────────────────────────────────
function TagReplacementForm(p) {
  const { activeAnimals, animals, setAnimals, setTagReplacements, pop } = p;
  const [form, setForm] = useState({
    animalId: "", date: todayISO(), originalTag: "", newTag: "", reason: "", tagColour: "yellow", notes: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-suggest tag colour based on bornOnHolding
  useEffect(() => {
    if (form.animalId) {
      const animal = (animals || []).find(a => a.id === form.animalId);
      if (animal) {
        set("tagColour", animal.bornOnHolding ? "yellow" : "red");
      }
    }
  }, [form.animalId]);

  const save = () => {
    setTagReplacements(prev => [...(prev || []), { ...form, id: genId(), createdAt: now() }]);
    // Update animal's tag numbers
    if (form.animalId && form.newTag) {
      setAnimals(prev => prev.map(a => a.id === form.animalId ? { ...a, visualTag: form.newTag } : a));
    }
    pop();
  };

  return (
    <div>
      <Header title="Record Tag Replacement" onBack={pop} />
      <Card>
        <Select label="Animal" value={form.animalId} onChange={e => set("animalId", e.target.value)}
          options={activeAnimals.map(a => ({ value: a.id, label: getAnimalLabel(a) }))} />
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <Input label="Original Tag" value={form.originalTag} onChange={e => set("originalTag", e.target.value)} />
        <Input label="New Tag" value={form.newTag} onChange={e => set("newTag", e.target.value)} />
        <Input label="Reason" value={form.reason} onChange={e => set("reason", e.target.value)} />
        <ToggleButtons label="Tag Colour" value={form.tagColour} onChange={v => set("tagColour", v)}
          options={[{ value: "yellow", label: "Yellow (born here)" }, { value: "red", label: "Red (bought in)" }]} />
        <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
        <Btn onClick={save} className="w-full mt-2" disabled={!form.animalId}>Save Replacement</Btn>
      </Card>
    </div>
  );
}


// ─── INVENTORY VIEW ──────────────────────────────────────────────────────────
function InventoryView(p) {
  const { activeAnimals, inventories, setInventories, pop } = p;
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const canSnapshot = month === 10 || month === 11; // Nov or Dec

  const counts = useMemo(() => {
    const c = { ewes: 0, rams: 0, wethers: 0, ewe_lambs: 0, ram_lambs: 0, total: activeAnimals.length };
    activeAnimals.forEach(a => {
      if (a.sex === "ewe") c.ewes++;
      else if (a.sex === "ram") c.rams++;
      else if (a.sex === "wether") c.wethers++;
      else if (a.sex === "ewe_lamb") c.ewe_lambs++;
      else if (a.sex === "ram_lamb") c.ram_lambs++;
    });
    return c;
  }, [activeAnimals]);

  const hasThisYear = (inventories || []).some(inv => inv.year === year);

  const saveInventory = () => {
    setInventories(prev => [...(prev || []), { id: genId(), year, date: todayISO(), counts: { ...counts }, createdAt: now() }]);
  };

  return (
    <div>
      <Header title="Annual Inventory" onBack={pop} />
      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.textMuted }}>Current Active Animals</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Ewes: <strong>{counts.ewes}</strong></div>
          <div>Rams: <strong>{counts.rams}</strong></div>
          <div>Wethers: <strong>{counts.wethers}</strong></div>
          <div>Ewe Lambs: <strong>{counts.ewe_lambs}</strong></div>
          <div>Ram Lambs: <strong>{counts.ram_lambs}</strong></div>
          <div className="col-span-2 pt-2 border-t" style={{ borderColor: COLORS.borderLight }}>
            Total: <strong>{counts.total}</strong>
          </div>
        </div>
      </Card>

      {canSnapshot && !hasThisYear && (
        <Btn onClick={saveInventory} className="w-full mb-4 gap-2" variant="accent">
          <ClipboardList size={18} /> Save 1 December {year} Inventory
        </Btn>
      )}
      {hasThisYear && <p className="text-sm mb-4" style={{ color: COLORS.primary }}>✓ {year} inventory saved</p>}

      {(inventories || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>History</h3>
          {_.orderBy(inventories || [], ["year"], ["desc"]).map(inv => (
            <Card key={inv.id} className="mb-2">
              <div className="text-sm font-semibold">{inv.year} Inventory</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>
                Saved: {toUKDate(inv.date)} · Total: {inv.counts?.total || 0}
              </div>
              <div className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                Ewes: {inv.counts?.ewes || 0} · Rams: {inv.counts?.rams || 0} · Wethers: {inv.counts?.wethers || 0} · Lambs: {(inv.counts?.ewe_lambs || 0) + (inv.counts?.ram_lambs || 0)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FEED LOG ────────────────────────────────────────────────────────────────
function FeedLogView(p) {
  const { feedLog, setFeedLog, pop } = p;
  const [form, setForm] = useState({ date: todayISO(), group: "", buckets: "1", kgPerBucket: "1.2", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [bagsRemaining, setBagsRemaining] = useState("");

  const save = () => {
    setFeedLog(prev => [...(prev || []), {
      id: genId(), ...form, buckets: parseFloat(form.buckets) || 0,
      kgPerBucket: parseFloat(form.kgPerBucket) || 1.2, createdAt: now()
    }]);
    setShowForm(false);
    setForm({ date: todayISO(), group: "", buckets: "1", kgPerBucket: "1.2", notes: "" });
  };

  const sortedLog = _.orderBy(feedLog || [], ["date"], ["desc"]);

  // Weekly/monthly totals
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const weekTotal = (feedLog || []).filter(f => new Date(f.date) >= weekAgo).reduce((s, f) => s + (f.buckets || 0) * (f.kgPerBucket || 1.2), 0);
  const monthTotal = (feedLog || []).filter(f => new Date(f.date) >= monthAgo).reduce((s, f) => s + (f.buckets || 0) * (f.kgPerBucket || 1.2), 0);

  const dailyAvg = weekTotal / 7;
  const bagsKg = (parseFloat(bagsRemaining) || 0) * 25;
  const daysRemaining = dailyAvg > 0 ? Math.round(bagsKg / dailyAvg) : 0;

  return (
    <div>
      <Header title="Feed Log" onBack={pop} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <div className="text-lg font-bold" style={{ color: COLORS.primary }}>{weekTotal.toFixed(1)} kg</div>
          <div className="text-xs" style={{ color: COLORS.textMuted }}>This week</div>
        </Card>
        <Card>
          <div className="text-lg font-bold" style={{ color: COLORS.primary }}>{monthTotal.toFixed(1)} kg</div>
          <div className="text-xs" style={{ color: COLORS.textMuted }}>This month</div>
        </Card>
      </div>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>Bags Calculator</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="25kg bags remaining" type="number" value={bagsRemaining} onChange={e => setBagsRemaining(e.target.value)} />
          </div>
          {bagsRemaining && dailyAvg > 0 && (
            <div className="pb-3 text-sm font-semibold" style={{ color: COLORS.accent }}>
              ~{daysRemaining} days
            </div>
          )}
        </div>
      </Card>

      {!showForm ? (
        <Btn onClick={() => setShowForm(true)} className="w-full mb-4 gap-2"><Plus size={18} /> Log Feed</Btn>
      ) : (
        <Card className="mb-4">
          <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          <Input label="Group" value={form.group} onChange={e => set("group", e.target.value)} placeholder="e.g. twin-bearing ewes" />
          <div className="flex gap-2">
            <div className="flex-1"><Input label="Buckets" type="number" value={form.buckets} onChange={e => set("buckets", e.target.value)} /></div>
            <div className="flex-1"><Input label="Kg/bucket" type="number" value={form.kgPerBucket} onChange={e => set("kgPerBucket", e.target.value)} /></div>
          </div>
          <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Btn>
            <Btn onClick={save} className="flex-1">Save</Btn>
          </div>
        </Card>
      )}

      {sortedLog.length === 0 && <Empty icon={Package} message="No feed entries logged" />}
      {sortedLog.slice(0, 20).map(f => (
        <Card key={f.id} className="mb-2">
          <div className="flex justify-between">
            <div>
              <div className="text-sm font-semibold">{f.group || "General"}</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>{toUKDate(f.date)}</div>
            </div>
            <div className="text-sm font-semibold" style={{ color: COLORS.primary }}>
              {((f.buckets || 0) * (f.kgPerBucket || 1.2)).toFixed(1)} kg
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}


// ─── SETTINGS VIEW ──────────────────────────────────────────────────────────
function SettingsView(p) {
  const { settings, setSettings, rams, pop } = p;
  const [form, setForm] = useState({ ...settings });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    setSettings(form);
    pop();
  };

  return (
    <div>
      <Header title="Holding Settings" onBack={pop} />
      <Card>
        <Input label="Holder Name" value={form.holderName || ""} onChange={e => set("holderName", e.target.value)} />
        <Input label="Holding Address" value={form.holdingAddress || ""} onChange={e => set("holdingAddress", e.target.value)} />
        <Input label="CPH Number" value={form.cphNumber || ""} onChange={e => set("cphNumber", e.target.value)} placeholder="XX/XXX/XXXX" />
        <Input label="Flock Number" value={form.flockNumber || ""} onChange={e => set("flockNumber", e.target.value)} />
        <Input label="Production Type" value={form.productionType || "Meat"} onChange={e => set("productionType", e.target.value)} />

        <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: COLORS.textMuted }}>Tupping & Lambing</h3>
        <Input label="Tupping Start" type="date" value={form.tuppingStart || ""} onChange={e => set("tuppingStart", e.target.value)} />
        <Input label="Tupping End" type="date" value={form.tuppingEnd || ""} onChange={e => set("tuppingEnd", e.target.value)} />
        <Select label="Ram" value={form.ramId || ""} onChange={e => set("ramId", e.target.value || null)}
          options={(rams || []).map(a => ({ value: a.id, label: getAnimalLabel(a) }))} />
        <div className="flex gap-2">
          <div className="flex-1"><Input label="Min Gestation (days)" type="number" value={form.gestationMin || 145} onChange={e => set("gestationMin", parseInt(e.target.value) || 145)} /></div>
          <div className="flex-1"><Input label="Max Gestation (days)" type="number" value={form.gestationMax || 152} onChange={e => set("gestationMax", parseInt(e.target.value) || 152)} /></div>
        </div>

        <Btn onClick={save} className="w-full mt-2">Save Settings</Btn>
      </Card>
    </div>
  );
}

// ─── EXPORT VIEW ─────────────────────────────────────────────────────────────
function ExportView(p) {
  const { animals, movements, medPurchases, medAdmin, deaths, tagReplacements, lambings, settings, feedLog, inventories, notes, pop } = p;

  const exportJSON = () => {
    const data = { animals, movements, medPurchases, medAdmin, deaths, tagReplacements, lambings, settings, feedLog, inventories, notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flock-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportInspection = () => {
    const lines = [];
    lines.push("═══════════════════════════════════════════");
    lines.push("        FLOCK REGISTER & RECORDS");
    lines.push("═══════════════════════════════════════════");
    lines.push("");
    lines.push("HOLDING DETAILS");
    lines.push("───────────────");
    lines.push(`Holder: ${settings?.holderName || "—"}`);
    lines.push(`Address: ${settings?.holdingAddress || "—"}`);
    lines.push(`CPH: ${settings?.cphNumber || "—"}`);
    lines.push(`Flock No: ${settings?.flockNumber || "—"}`);
    lines.push(`Production: ${settings?.productionType || "—"}`);
    lines.push("");

    lines.push("FLOCK REGISTER");
    lines.push("──────────────");
    (animals || []).forEach(a => {
      lines.push(`${getAnimalLabel(a)} | ${a.breed} | ${SEX_LABELS[a.sex] || a.sex} | ${a.status} | EID: ${a.eidTag || "—"} | Visual: ${a.visualTag || "—"} | Born on holding: ${a.bornOnHolding ? "Yes" : "No"}`);
    });
    lines.push("");

    lines.push("MOVEMENT RECORDS");
    lines.push("────────────────");
    (movements || []).forEach(m => {
      const names = (m.animalIds || []).map(id => { const a = (animals || []).find(x => x.id === id); return getAnimalLabel(a || {}); }).join(", ");
      lines.push(`${toUKDate(m.date)} | ${m.direction.toUpperCase()} | ${m.fromCph} → ${m.toCph} | ${m.reason} | Doc: ${m.movementDocRef || "—"} | Animals: ${names}`);
    });
    lines.push("");

    lines.push("MEDICINE PURCHASE RECORDS");
    lines.push("────────────────────────");
    (medPurchases || []).forEach(mp => {
      lines.push(`${toUKDate(mp.date)} | ${mp.productName} | Batch: ${mp.batchNumber} | Qty: ${mp.quantity} | Supplier: ${mp.supplier || "—"} | Vet: ${mp.prescribingVet || "—"}`);
    });
    lines.push("");

    lines.push("MEDICINE ADMINISTRATION RECORDS");
    lines.push("──────────────────────────────");
    (medAdmin || []).forEach(t => {
      const names = (t.animalIds || []).map(id => { const a = (animals || []).find(x => x.id === id); return getAnimalLabel(a || {}); }).join(", ");
      lines.push(`${toUKDate(t.date)} | ${t.productName} | Batch: ${t.batchNumber} | Dose: ${t.dose} | Route: ${t.route} | Withdrawal: ${t.withdrawalDays || 0}d | Slaughter from: ${toUKDate(t.earliestSlaughterDate)} | By: ${t.givenBy || "—"} | Animals: ${names || t.animalGroupDescription || "—"}`);
    });
    lines.push("");

    lines.push("DEATH RECORDS");
    lines.push("─────────────");
    (deaths || []).forEach(d => {
      const a = (animals || []).find(x => x.id === d.animalId);
      lines.push(`${d.monthYear} | ${getAnimalLabel(a || {})} | Cause: ${d.cause} | Disposal: ${d.disposalMethod}`);
    });
    lines.push("");

    lines.push("TAG REPLACEMENT RECORDS");
    lines.push("──────────────────────");
    (tagReplacements || []).forEach(t => {
      const a = (animals || []).find(x => x.id === t.animalId);
      lines.push(`${toUKDate(t.date)} | ${getAnimalLabel(a || {})} | ${t.originalTag} → ${t.newTag} | Colour: ${t.tagColour} | Reason: ${t.reason}`);
    });
    lines.push("");

    lines.push("ANNUAL INVENTORIES");
    lines.push("──────────────────");
    (inventories || []).forEach(inv => {
      lines.push(`${inv.year} (${toUKDate(inv.date)}): Total ${inv.counts?.total || 0} — Ewes: ${inv.counts?.ewes || 0}, Rams: ${inv.counts?.rams || 0}, Wethers: ${inv.counts?.wethers || 0}, Ewe Lambs: ${inv.counts?.ewe_lambs || 0}, Ram Lambs: ${inv.counts?.ram_lambs || 0}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flock-inspection-${todayISO()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header title="Export Data" onBack={pop} />
      <Card className="mb-4">
        <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>Export all flock data as a JSON backup or a formatted text file for inspection.</p>
        <div className="flex flex-col gap-2">
          <Btn onClick={exportJSON} className="w-full gap-2"><Download size={18} /> Export All Data (JSON)</Btn>
          <Btn onClick={exportInspection} variant="secondary" className="w-full gap-2"><FileText size={18} /> Export for Inspection (Text)</Btn>
        </div>
      </Card>
    </div>
  );
}
