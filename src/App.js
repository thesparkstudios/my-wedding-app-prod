import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, addDoc, collection } from "firebase/firestore";

/**
 * Spark Studios – Quote Configurator (Visual Refresh)
 * - Dark, luxury aesthetic
 * - Clear sectioning + cards
 * - Middle package emphasized visually in client view
 * - Manual pricing only
 * - Same Firestore link generation flow you had
 */

// ===== Firebase Boot =====
// These may be injected or read from env. We keep your fallbacks.
// eslint-disable-next-line no-var
var __firebase_config; // injected optionally
// eslint-disable-next-line no-var
var __app_id; // injected optionally
// eslint-disable-next-line no-var
var __initial_auth_token; // injected optionally

let app, auth, db;
let firebaseInitializationError = null;

try {
  let firebaseConfig;
  if (typeof __firebase_config !== "undefined" && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
  } else if (process.env.REACT_APP_FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
    };
  } else {
    throw new Error("Firebase configuration was not provided by the environment.");
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) throw new Error("Firebase config is missing apiKey or projectId.");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("FATAL: Firebase initialization failed.", e);
  firebaseInitializationError = e.message;
}

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const initialAuthToken = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// ===== UI Bits =====
const IconCheck = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
);
const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-amber-400 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wider">{children}</span>
);

// ===== Data =====
const ALL_INCLUSIONS = [
  "Unlimited professionally edited photos",
  "Cinematic Highlight Film (3–5 min)",
  "Full Feature Film (Full Day Edit)",
  "Online Gallery + Delivery (3–6 months)",
  "Drone",
  "E‑Shoot",
  "Content Creation (Reels/TikTok)",
  "Album (Premium Layflat)",
  "Luxury Keepsake Box (USB + 20 Fine Art Prints)",
  "Priority Editing Delivery",
];

const FAQ = [
  { q: "What happens before the event?", a: "We meet to align on timeline, style, and must‑have moments. Share references and mood boards here." },
  { q: "How does payment work?", a: "30% retainer to secure the date. Remaining balance due on the event day unless otherwise agreed." },
  { q: "When do we receive everything?", a: "Typical delivery in 3–6 months. Photos usually arrive earlier than video; we keep you posted." },
  { q: "How do we book?", a: "We’ll finalize with a simple contract covering pricing, deliverables, and timelines." },
];

const newDay = () => ({ id: crypto.randomUUID(), name: "Wedding Day", hours: "", photographers: "", videographers: "" });
const newPackage = (name) => ({
  id: crypto.randomUUID(),
  name,
  days: [newDay()],
  inclusions: ALL_INCLUSIONS.reduce((acc, k) => ({ ...acc, [k]: false }), {}),
  price: "",
});

const initialPackages = [newPackage("Essential"), newPackage("Classic"), newPackage("Signature")];

// ===== Main App =====
export default function App() {
  // Auth state
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Views
  const [currentView, setCurrentView] = useState("loading"); // loading | configurator | viewQuote

  // Quote state
  const [packages, setPackages] = useState(() => {
    try {
      const saved = localStorage.getItem("sparkStudiosConfigurator");
      return saved ? JSON.parse(saved) : initialPackages;
    } catch (e) {
      return initialPackages;
    }
  });
  const [client, setClient] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [quoteData, setQuoteData] = useState(null);

  // Boot auth
  useEffect(() => {
    if (!auth) { setIsAuthReady(true); setCurrentView("configurator"); return; }
    const unsub = onAuthStateChanged(auth, (u) => { setUserId(u ? u.uid : null); setIsAuthReady(true); });
    (async () => {
      try { initialAuthToken ? await signInWithCustomToken(auth, initialAuthToken) : await signInAnonymously(auth); }
      catch (err) { setError(`Authentication failed: ${err.message}`); }
    })();
    return () => unsub();
  }, []);

  // Deep link loader
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quoteId");
    const authorId = params.get("authorId");
    if (quoteId && authorId) loadQuote(authorId, quoteId); else setCurrentView("configurator");
  }, []);

  // Persist local
  useEffect(() => {
    try { localStorage.setItem("sparkStudiosConfigurator", JSON.stringify(packages)); } catch {}
  }, [packages]);

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  // ===== Handlers =====
  const updatePkg = (i, field, value) => setPackages((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  const updateDay = (i, di, field, value) => setPackages((prev) => prev.map((p, idx) => idx === i ? { ...p, days: p.days.map((d, j) => j === di ? { ...d, [field]: value } : d) } : p));
  const addDay = (i) => setPackages((prev) => prev.map((p, idx) => idx === i ? { ...p, days: [...p.days, newDay()] } : p));
  const removeDay = (i, di) => setPackages((prev) => prev.map((p, idx) => idx === i ? { ...p, days: p.days.filter((_, j) => j !== di) } : p));
  const toggleInclusion = (i, key) => setPackages((prev) => prev.map((p, idx) => idx === i ? { ...p, inclusions: { ...p.inclusions, [key]: !p.inclusions[key] } } : p));

  // ===== Firestore save + link =====
  const generateQuoteLink = async () => {
    if (!client.name) { setError("Client name is required."); return; }
    if (!db || !userId) { setError("Not authenticated."); return; }
    setError(""); setIsLoading(true);
    try {
      const collRef = collection(db, `artifacts/${appId}/users/${userId}/quotes`);
      const payload = { client, packages, generatedAt: new Date().toISOString(), authorId: userId };
      const docRef = await addDoc(collRef, payload);
      const url = `${window.location.origin}${window.location.pathname}?authorId=${userId}&quoteId=${docRef.id}`;
      window.open(url, "_blank");
      showMsg("Quote link generated and opened.");
    } catch (err) {
      setError(`Failed to generate link: ${err.message}`);
    } finally { setIsLoading(false); }
  };

  const loadQuote = async (authorId, quoteId) => {
    setCurrentView("loading"); setError("");
    try {
      const ref = doc(db, `artifacts/${appId}/users/${authorId}/quotes`, quoteId);
      const snap = await getDoc(ref);
      if (snap.exists()) { setQuoteData(snap.data()); setCurrentView("viewQuote"); }
      else { setError("Quote not found."); setCurrentView("configurator"); }
    } catch (err) { setError(`Failed to load quote: ${err.message}`); setCurrentView("configurator"); }
  };

  // ===== Views =====
  if (firebaseInitializationError) return <ErrorScreen msg={firebaseInitializationError} />;
  if (currentView === "loading" || !isAuthReady) return <LoadingScreen label="Loading Configurator..." />;

  if (currentView === "configurator") {
    return (
      <Shell>
        <Header title="Quote Configurator" subtitle="Configure up to three packages with manual pricing. Generate a client link when ready." />

        <Card>
          <SectionTitle>Client Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input value={client.name} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} placeholder="Client Name" />
            <Input value={client.email} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} placeholder="Client Email" type="email" />
            <Button onClick={generateQuoteLink} disabled={isLoading}>{isLoading ? "Generating…" : "Generate Client Quote Link"}</Button>
          </div>
          <Feedback error={error} message={message} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {packages.map((pkg, i) => (
            <Card key={pkg.id} className="space-y-6">
              <Input value={pkg.name} onChange={(e) => updatePkg(i, "name", e.target.value)} className="text-2xl font-bold text-amber-400" placeholder="Package Name" />

              <div className="space-y-3">
                <SubTitle>Coverage Days</SubTitle>
                {pkg.days.map((d, di) => (
                  <div key={d.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
                    <Input value={d.name} onChange={(e) => updateDay(i, di, "name", e.target.value)} placeholder="Day Name (e.g., Mehndi)" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={d.hours} onChange={(e) => updateDay(i, di, "hours", e.target.value)} placeholder="Hours" />
                      <Input value={d.photographers} onChange={(e) => updateDay(i, di, "photographers", e.target.value)} placeholder="Photographers" />
                      <Input value={d.videographers} onChange={(e) => updateDay(i, di, "videographers", e.target.value)} placeholder="Videographers" />
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => removeDay(i, di)} className="text-xs text-red-400 hover:text-red-300">Remove Day</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addDay(i)} className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"><IconPlus /> Add Day</button>
              </div>

              <div className="space-y-3">
                <SubTitle>Inclusions</SubTitle>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/40 p-2">
                  {ALL_INCLUSIONS.map((key) => (
                    <label key={key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-800/60 cursor-pointer">
                      <input type="checkbox" className="h-4 w-4" checked={!!pkg.inclusions[key]} onChange={() => toggleInclusion(i, key)} />
                      <span className="text-sm text-neutral-200">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <SubTitle>Total Price (Manual)</SubTitle>
                <Input value={pkg.price} onChange={(e) => updatePkg(i, "price", e.target.value)} placeholder="$0" className="text-right text-3xl font-bold border-amber-500 text-amber-400" />
              </div>
            </Card>
          ))}
        </div>

        <FooterNote />
      </Shell>
    );
  }

  if (currentView === "viewQuote" && quoteData) {
    const sorted = [...quoteData.packages].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    const middleIndex = sorted.length > 1 ? Math.floor(sorted.length / 2) : 0;

    return (
      <Shell>
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-12 w-40 items-center justify-center rounded-lg border border-amber-400/30 bg-neutral-900/60">
            <span className="font-semibold tracking-wide text-amber-400">The Spark Studios</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-light">Your Wedding Proposal</h2>
          <p className="mt-2 text-neutral-400">Prepared for: {quoteData.client?.name}</p>
        </div>

        {/* Packages – vertical list with Classic emphasized */}
        <div className="space-y-8">
          {sorted.map((pkg, idx) => (
            <div key={pkg.id} className={`rounded-2xl border p-8 transition-all ${idx === middleIndex ? "border-amber-400/80 shadow-2xl shadow-amber-500/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/[0.06] via-neutral-900 to-neutral-950 scale-[1.01]" : "border-neutral-800 bg-neutral-900/40"}`}>
              {idx === middleIndex && (
                <div className="mb-4 flex justify-center"><Badge>Most Popular</Badge></div>
              )}
              <h3 className="text-center text-3xl font-bold text-amber-400">{pkg.name}</h3>
              {pkg.price && <p className="my-4 text-center text-5xl font-thin">${Number(pkg.price).toLocaleString()}</p>}

              {/* Coverage Summary */}
              {pkg.days?.length > 0 && (
                <div className="my-6">
                  <h4 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">Coverage</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {pkg.days.map((d) => (
                      <div key={d.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-center text-sm">
                        <div className="font-medium text-neutral-200">{d.name || "Day"}</div>
                        <div className="text-neutral-400">{d.hours || "—"} hrs</div>
                        <div className="text-[11px] text-neutral-500">{d.photographers || 0} Photo • {d.videographers || 0} Video</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions */}
              <ul className="grid gap-2 sm:grid-cols-2">
                {Object.entries(pkg.inclusions || {}).filter(([_, v]) => v).map(([k]) => (
                  <li key={k} className="flex items-start gap-2 text-neutral-200"><span className="mt-1 text-amber-400"><IconCheck /></span><span>{k}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 border-t border-neutral-800 pt-10">
          <h2 className="mb-6 text-center text-3xl font-semibold text-amber-400">Frequently Asked Questions</h2>
          <div className="mx-auto max-w-3xl space-y-2">
            {FAQ.map((f, i) => (
              <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900/40">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between p-4 text-left text-lg font-medium">
                  <span>{f.q}</span>
                  <span className={`transition-transform ${openFaq === i ? "rotate-180" : ""}`}>▾</span>
                </button>
                {openFaq === i && <div className="px-4 pb-4 pt-0 text-neutral-400">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-neutral-500">This quote was generated on {quoteData.generatedAt ? new Date(quoteData.generatedAt).toLocaleDateString() : ""}.</div>
      </Shell>
    );
  }

  return <ErrorScreen msg="Something went wrong."/>;
}

// ===== Layout primitives =====
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-7xl space-y-8">{children}</div>
    </div>
  );
}
function Header({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
      <div className="pointer-events-none absolute -top-24 right-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-amber-400">{title}</h1>
      <p className="mt-2 text-neutral-400">{subtitle}</p>
    </div>
  );
}
function Card({ className = "", children }) {
  return <div className={`rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 ${className}`}>{children}</div>;
}
function SectionTitle({ children }) {
  return <h2 className="mb-3 text-lg font-semibold">{children}</h2>;
}
function SubTitle({ children }) {
  return <h3 className="mb-2 text-sm font-semibold tracking-wide text-neutral-400">{children}</h3>;
}
function Input(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${className}`} />;
}
function Button({ children, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black shadow hover:bg-amber-400 disabled:opacity-50">
      {children}
    </button>
  );
}
function Feedback({ error, message }) {
  if (!error && !message) return null;
  return (
    <div className="mt-4 text-center text-sm">
      {error && <p className="text-red-400">{error}</p>}
      {message && <p className="text-emerald-400">{message}</p>}
    </div>
  );
}
function LoadingScreen({ label = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">{label}</div>
  );
}
function ErrorScreen({ msg }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-center text-red-400">{msg}</div>
  );
}
function FooterNote() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-xs text-neutral-400">Prices shown are CAD and manually entered. Dates are confirmed only upon retainer & signed agreement.</div>
  );
}
