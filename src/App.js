/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { 
  Camera, Film, Clock, Award, CheckCircle, Calendar, 
  Zap, Plus, Trash2, Eye, Edit3, Save, 
  Settings, Copy, Share2, AlertCircle, List, ArrowLeft,
  Check, Lock, XCircle, MessageCircle, Trash, Star, Quote
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBV0W6ytsKw5uU32IZn2sOSp8IjwmT0nvs",
  authDomain: "wedding-quote-app.firebaseapp.com",
  projectId: "wedding-quote-app",
  storageBucket: "wedding-quote-app.appspot.com",
  messagingSenderId: "1019978209954",
  appId: "1:1019978209954:web:2ce6ebdb1b42c0b7d495fb",
  measurementId: "G-MK289KSHB8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const finalAppId = typeof __app_id !== 'undefined' ? __app_id : 'the-spark-studios-quotes';
const WHATSAPP_NUMBER = "16478633135";
const EXPIRY_DAYS = 30;
const APP_VERSION = "1.3.6"; 
const LOGO_URL = "https://thesparkstudios.ca/wp-content/uploads/2025/01/logo@2x.png";

const App = () => {
  const [view, setView] = useState('editor'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [fbError, setFbError] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [deletingId, setDeletingId] = useState(null);

  const initialProposalState = {
    clientName: "Ayushi & Family",
    visionStatement: "Three days of celebration, tradition, and joy. From the intimate moments of the engagement to the 17-hour marathon of May 10th, we are here to ensure that your legacy is preserved with the same energy it was lived with.",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    createdAt: Date.now(),
    views: 0,
    lastViewedAt: null,
    days: [
      { id: 1, label: "Pre-Wedding", date: "April 2026", desc: "Engagement Shoot", icon: "Calendar", highlight: false },
      { id: 2, label: "May 8th", date: "Friday", desc: "4 Hours Coverage", icon: "Clock", highlight: false },
      { id: 3, label: "May 9th", date: "Saturday", desc: "4 Hours Photo + Video", icon: "Film", highlight: false },
      { id: 4, label: "May 10th", date: "Sunday", desc: "Full Day Coverage", icon: "Zap", highlight: true },
    ],
    packages: [
      {
        id: 1,
        name: "Essential",
        price: "$9,650",
        description: "Artisan digital coverage designed for couples who prioritize high-end cinema and photography.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "1 Professional Lead Photographer (3 Days)",
          "1 Professional Lead Videographer (Days 2 & 3)",
          "Full Production Team for May 10th",
          "Cinematic Highlight Film (4K)",
          "Full-Length Ceremony Documentary",
          "Curated Fine-Art Digital Gallery",
          "Aerial Drone Cinematography"
        ]
      },
      {
        id: 2,
        name: "Signature",
        price: "$11,550",
        description: "Our most coveted collection, featuring hand-crafted heirlooms to preserve your family legacy.",
        isVisible: true,
        isHighlighted: true,
        features: [
          "Everything in Essential",
          "Two 12x17 Hand-Crafted Wedding Albums",
          "Italian Leather Album Briefcase",
          "Priority Post-Production Queue",
          "Signature USB Archive Collection"
        ]
      },
      {
        id: 3,
        name: "Legacy",
        price: "$13,950",
        description: "The definitive storytelling experience for those who desire no compromises in detail or delivery.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "Everything in Signature",
          "Bespoke Faux Leather USB & Album Suite",
          "Extended Feature Film (7-10 Minutes)",
          "Next-Day Cinematic Teaser",
          "72-Hour Preview Gallery"
        ]
      }
    ],
    reviews: [
      { id: 1, author: "Priya & Raj", text: "The team at Spark Studios didn't just take photos; they became part of the family for those 3 days. Their energy during the 17-hour marathon on our wedding day was unbelievable." },
      { id: 2, author: "Sameer K.", text: "Choosing the Legacy collection was the best decision we made. The teaser film was ready by the time we reached our honeymoon destination. Pure magic." }
    ]
  };

  const [proposalData, setProposalData] = useState(initialProposalState);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const openWhatsApp = (msg) => {
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setFbError("Auth failed.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/quote/')) {
        const id = hash.replace('#/quote/', '');
        setCurrentQuoteId(id);
        if (!user) return; 
        try {
          const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProposalData(data);
            const created = data.createdAt || Date.now();
            if (Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)) {
              setIsExpired(true);
            } else {
              setIsExpired(false);
              if (!isAdmin) {
                await updateDoc(docRef, { views: increment(1), lastViewedAt: Date.now() });
              }
            }
            if (!isUnlocked && hash.includes('/quote/')) setIsUnlocked(true); 
            setView('preview');
            setFbError(null);
          } else {
            setView('dashboard');
          }
        } catch (err) {
          setFbError("Lead load error.");
        }
      } else if (!hash && isUnlocked) {
        if (view !== 'editor') setView('dashboard');
      }
    };
    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user, isUnlocked, view, isAdmin]); 

  useEffect(() => {
    if (!user || !isUnlocked || view === 'preview') return;
    const q = collection(db, 'artifacts', finalAppId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
      setFbError(null);
    }, (err) => {
      setFbError("Rules denied.");
    });
    return () => unsubscribe();
  }, [user, isUnlocked, view]);

  const saveQuote = async () => {
    if (!auth.currentUser) {
      try { await signInAnonymously(auth); } catch (e) { return; }
    }
    setIsSaving(true);
    setFbError(null);
    const id = currentQuoteId || proposalData.clientName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    try {
      const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
      const dataToSave = { 
        ...proposalData, id, updatedAt: Date.now(), 
        createdAt: proposalData.createdAt || Date.now(),
        views: proposalData.views || 0,
        lastViewedAt: proposalData.lastViewedAt || null
      };
      await setDoc(docRef, dataToSave);
      setCurrentQuoteId(id);
      const newHash = `#/quote/${id}`;
      if (window.location.hash !== newHash) window.history.replaceState(null, null, newHash);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    } catch (err) {
      setFbError("Save denied.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id));
      setDeletingId(null);
    } catch (err) {
      setFbError("Delete failed.");
    }
  };

  const updateField = (field, value) => setProposalData(prev => ({ ...prev, [field]: value }));
  const updateDay = (id, field, value) => setProposalData(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? { ...d, [field]: value } : d) }));
  const addDay = () => setProposalData(prev => ({ ...prev, days: [...prev.days, { id: Date.now(), label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }] }));
  const removeDay = (id) => setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  const updatePackage = (id, field, value) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const updatePackageFeatures = (pId, featuresArray) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === pId ? { ...p, features: featuresArray } : p) }));
  
  // Review Handlers
  const updateReview = (id, field, value) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  const addReview = () => setProposalData(prev => ({ ...prev, reviews: [...prev.reviews, { id: Date.now(), author: "New Couple", text: "Write review here..." }] }));
  const removeReview = (id) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.filter(r => r.id !== id) }));

  const createNew = () => { setCurrentQuoteId(null); setProposalData({ ...initialProposalState, createdAt: Date.now() }); window.location.hash = ''; setView('editor'); };
  
  const IconMap = { Calendar: <Calendar size={18} />, Clock: <Clock size={18} />, Film: <Film size={18} />, Zap: <Zap size={18} />, Camera: <Camera size={18} /> };

  if (!isUnlocked && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-6 font-sans">
        <div className="max-w-md w-full bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-slate-100"><Lock size={32} strokeWidth={1.5} /></div>
          <h2 className="text-2xl font-light mb-2 tracking-[0.1em] text-slate-950 uppercase text-center">Spark Portal</h2>
          <p className="text-slate-400 text-xs mb-10 tracking-widest uppercase">Internal Studio Access</p>
          <input type="password" placeholder="KEY CODE" className="w-full p-4 border border-slate-200 bg-slate-50/50 rounded-2xl mb-6 text-center outline-none focus:ring-1 focus:ring-slate-300 transition-all font-mono tracking-[0.4em] text-sm" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && passInput === 'wayssmffss2') { setIsUnlocked(true); setIsAdmin(true); } }} />
          <button onClick={() => { if(passInput === 'wayssmffss2') { setIsUnlocked(true); setIsAdmin(true); } }} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs active:scale-95">Open Portal</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white animate-pulse"><div className="text-[10px] uppercase tracking-[0.4em] text-slate-400">The Spark Studios</div></div>;

  return (
    <div className="min-h-screen bg-[#fdfdfc] selection:bg-slate-200">
      {fbError && view !== 'preview' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3"><XCircle size={18} /><p className="text-xs font-bold uppercase tracking-wider">{fbError}</p></div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto py-12 md:py-20 px-6 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div><h1 className="text-3xl md:text-5xl font-light text-slate-950 tracking-tight mb-4">Proposals</h1><p className="text-slate-500 font-medium tracking-wide uppercase text-[11px]">Lead Intelligence Dashboard</p></div>
            <button onClick={createNew} className="bg-slate-950 text-white px-10 py-5 rounded-full flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-xl font-bold uppercase tracking-widest text-[11px] active:scale-95"><Plus size={16} /> New Entry</button>
          </div>
          <div className="grid gap-6">
            {savedQuotes.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(quote => (
              <div key={quote.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:shadow-xl transition-all duration-500 gap-6">
                <div className="flex items-start md:items-center gap-6 flex-1 min-w-0">
                  <div className="p-4 rounded-[1.5rem] bg-slate-50 text-slate-900 shadow-sm"><Calendar size={24} strokeWidth={1.5} /></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-xl tracking-tight mb-2 truncate">{quote.clientName}</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-tighter"><Eye size={14} className="text-slate-300" /> {quote.views || 0} Opens</div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-tighter"><Clock size={14} className="text-slate-300" /> Seen: {getTimeAgo(quote.lastViewedAt)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                  {deletingId === quote.id ? (
                    <div className="flex gap-2 items-center bg-rose-50 p-2 px-3 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-right-4 duration-300">
                      <button onClick={() => handleDelete(quote.id)} className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"><Check size={16} /></button>
                      <button onClick={() => setDeletingId(null)} className="p-3 bg-white text-slate-400 rounded-xl border border-slate-100"><XCircle size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = `#/quote/${quote.id}`; setView('editor'); }} className="flex-1 py-4 px-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition text-slate-900 font-bold text-[11px] uppercase tracking-widest">Edit</button>
                      <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = `#/quote/${quote.id}`; setView('preview'); }} className="flex-1 py-4 px-6 bg-slate-950 rounded-2xl hover:bg-slate-800 transition text-white font-bold text-[11px] uppercase tracking-widest shadow-lg active:scale-95">Preview</button>
                      <button onClick={() => setDeletingId(quote.id)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-500 transition"><Trash2 size={18} strokeWidth={1.5} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div className="max-w-6xl mx-auto py-12 md:py-20 px-6 font-sans text-slate-900 pb-48 leading-relaxed">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-slate-100 pb-10 gap-8">
            <div className="flex items-center gap-6">
              <button onClick={() => setView('dashboard')} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 hover:shadow-md transition"><ArrowLeft size={20} /></button>
              <div><h1 className="text-3xl font-light tracking-tight text-slate-950">Proposal Editor</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">{currentQuoteId ? `ID: ${currentQuoteId}` : 'New Cinematic Story'}</p></div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button onClick={saveQuote} disabled={isSaving} className={`flex-1 md:flex-none px-10 py-5 rounded-full flex items-center justify-center gap-3 transition shadow-xl disabled:opacity-50 ${copyFeedback ? 'bg-emerald-600' : 'bg-slate-950'} text-white font-bold uppercase tracking-widest text-[11px] active:scale-95`}>{isSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : copyFeedback ? <Check size={16} /> : <Save size={16} />}{isSaving ? "Syncing..." : copyFeedback ? "Entry Secured" : "Save Entry"}</button>
              {currentQuoteId && <button onClick={() => setView('preview')} className="flex-1 md:flex-none bg-indigo-600 text-white px-10 py-5 rounded-full flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl font-bold uppercase tracking-widest text-[11px] active:scale-95"><Eye size={16} /> Preview Mode</button>}
            </div>
          </div>

          <div className="space-y-12">
            {/* 01. Client Narrative */}
            <section className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-slate-100">
              <h2 className="text-xs font-black mb-10 flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em]">01. Client Narrative</h2>
              <div className="grid md:grid-cols-2 gap-8 font-sans">
                <div className="flex flex-col gap-3"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Client Title</label><input type="text" value={proposalData.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold text-slate-900 text-lg" /></div>
                <div className="flex flex-col gap-3"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visual Header URL</label><input type="text" value={proposalData.heroImage} onChange={(e) => updateField('heroImage', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl outline-none focus:bg-white focus:border-slate-300 transition-all text-sm font-medium text-slate-600" /></div>
                <div className="md:col-span-2 flex flex-col gap-3 mt-4"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">The Artistic Vision</label><textarea rows="4" value={proposalData.visionStatement} onChange={(e) => updateField('visionStatement', e.target.value)} className="p-6 border border-slate-100 bg-slate-50/30 rounded-[2rem] outline-none focus:bg-white focus:border-slate-300 transition-all italic text-slate-700 resize-none font-medium leading-relaxed text-lg" /></div>
              </div>
            </section>

            {/* 02. Event Itinerary */}
            <section>
              <div className="flex justify-between items-center mb-10 px-4 font-sans"><h2 className="text-xs font-black flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em]">02. Event Itinerary</h2><button onClick={addDay} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-slate-800 transition shadow-md"><Plus size={14} /> Add Segment</button></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {proposalData.days.map((day) => (
                  <div key={day.id} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${day.highlight ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white'}`}>
                    <div className="flex justify-between items-center mb-6 font-sans"><select value={day.icon} onChange={(e) => updateDay(day.id, 'icon', e.target.value)} className="bg-slate-100 p-2.5 rounded-xl text-[10px] border-none outline-none font-bold text-slate-700 uppercase tracking-widest">{Object.keys(IconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}</select><button onClick={() => removeDay(day.id)} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition"><Trash2 size={18} /></button></div>
                    <div className="space-y-4">
                      <input type="text" value={day.label} onChange={(e) => updateDay(day.id, 'label', e.target.value)} className="w-full font-bold bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none text-slate-900 text-lg py-1" />
                      <input type="text" value={day.date} onChange={(e) => updateDay(day.id, 'date', e.target.value)} className="w-full text-[11px] text-slate-500 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none font-bold uppercase tracking-widest" />
                      <input type="text" value={day.desc} onChange={(e) => updateDay(day.id, 'desc', e.target.value)} className="w-full text-sm text-indigo-700 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none font-bold mt-2" />
                      <label className="flex items-center gap-3 mt-6 cursor-pointer select-none px-1"><input type="checkbox" checked={day.highlight} onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)} className="w-5 h-5 rounded border-slate-200 text-slate-950 focus:ring-slate-950" /><span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Full Day Coverage</span></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 03. Investment Collections */}
            <section>
              <h2 className="text-xs font-black mb-10 px-4 flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em]">03. Investment Collections</h2>
              <div className="space-y-8 font-sans">
                {proposalData.packages.map((pkg) => (
                  <div key={pkg.id} className={`p-8 md:p-12 rounded-[3.5rem] border-2 transition-all duration-500 ${pkg.isVisible ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 opacity-50 border-dashed border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-50 pb-8 gap-6 font-sans"><div className="flex items-center gap-5"><input type="checkbox" checked={pkg.isVisible} onChange={(e) => updatePackage(pkg.id, 'isVisible', e.target.checked)} className="w-7 h-7 rounded-lg border-slate-200 text-slate-950 focus:ring-slate-950 cursor-pointer" /><div><h3 className="font-bold text-slate-950 text-2xl tracking-tight">{pkg.name} Story</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">{pkg.isVisible ? 'Live View Enabled' : 'Currently Hidden'}</p></div></div>{pkg.isVisible && <div className="flex items-center gap-3 bg-slate-950 px-5 py-2.5 rounded-full text-white shadow-lg"><span className="text-[10px] font-bold uppercase tracking-widest">Featured?</span><input type="checkbox" checked={pkg.isHighlighted} onChange={(e) => updatePackage(pkg.id, 'isHighlighted', e.target.checked)} className="w-4 h-4 rounded text-white focus:ring-0 cursor-pointer" /></div>}</div>
                    {pkg.isVisible && (
                      <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Title</label><input type="text" value={pkg.name} onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl font-bold text-slate-950 text-lg" /></div>
                          <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Price Point</label><input type="text" value={pkg.price} onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl font-serif text-3xl text-indigo-700 font-bold" /></div>
                          <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Summary</label><textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl text-sm text-slate-700 h-24 italic resize-none font-medium leading-relaxed" /></div>
                        </div>
                        <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Key Deliverables</label><textarea value={pkg.features.join('\n')} onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))} className="p-6 border border-slate-100 bg-slate-50 rounded-2xl text-sm h-full min-h-[250px] leading-loose text-slate-900 font-medium" /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 04. Client Praise (New!) */}
            <section className="font-sans">
              <div className="flex justify-between items-center mb-10 px-4 font-sans"><h2 className="text-xs font-black flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em]">04. Client Praise (Google Reviews)</h2><button onClick={addReview} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest shadow-md"><Plus size={14} /> Add Review</button></div>
              <div className="grid md:grid-cols-2 gap-6 font-sans">
                {proposalData.reviews?.map((review) => (
                  <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 relative group font-sans">
                    <button onClick={() => removeReview(review.id)} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={16} /></button>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Couple/Author Name</label><input type="text" value={review.author} onChange={(e) => updateReview(review.id, 'author', e.target.value)} className="w-full p-3 border-b border-slate-100 font-bold outline-none focus:border-slate-400 transition-all text-slate-900" /></div>
                      <div className="flex flex-col gap-2"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Review Text</label><textarea rows="3" value={review.text} onChange={(e) => updateReview(review.id, 'text', e.target.value)} className="w-full p-3 bg-slate-50/50 rounded-xl text-sm font-medium italic text-slate-600 outline-none resize-none" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === 'preview' && (
        <div className="min-h-screen font-serif text-[#121212] bg-white relative">
          {isExpired ? (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6 font-sans"><div className="max-w-md w-full bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl text-center border border-slate-100"><div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-10"><AlertCircle size={40} strokeWidth={1} /></div><h1 className="text-3xl font-light mb-6 text-slate-950 tracking-tight leading-none">Proposal Expired</h1><p className="text-slate-500 mb-10 font-medium leading-relaxed">This curated narrative for <span className="text-slate-950 font-black">{proposalData.clientName}</span> is no longer active.</p><div className="h-[1px] bg-slate-100 w-full mb-10"></div><button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} just expired. We'd like to request a formal extension.`)} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-[11px]">Request Re-Activation <ArrowLeft className="rotate-180" size={16} /></button></div></div>
          ) : (
            <>
              {isAdmin && (
                <div className="fixed top-6 left-6 right-6 z-50 flex justify-between pointer-events-none">
                  <button onClick={() => setView('editor')} className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl hover:bg-white transition flex items-center gap-3 px-8 active:scale-95 group font-sans"><Edit3 size={16} className="text-slate-400 group-hover:text-slate-900" /><span className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em]">Editor</span></button>
                  <button onClick={() => setView('dashboard')} className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl hover:bg-white transition flex items-center gap-3 px-8 active:scale-95 group font-sans"><List size={16} className="text-slate-400 group-hover:text-slate-900" /><span className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em]">Portal</span></button>
                </div>
              )}

              <div className="relative h-[80vh] md:h-screen flex items-center justify-center overflow-hidden bg-[#0d0d0d]">
                <div className="absolute inset-0 opacity-60"><img src={proposalData.heroImage} className="w-full h-full object-cover transform scale-105" alt="Background" /></div>
                <div className="relative z-10 text-center text-white px-8">
                  <img src={LOGO_URL} alt="The Spark Studios" className="mx-auto h-12 md:h-20 mb-10 object-contain drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                  <h1 className="text-5xl md:text-[8rem] lg:text-[10rem] mb-12 tracking-tighter leading-[0.9] font-light italic">{proposalData.clientName}</h1>
                  <div className="max-w-lg mx-auto border-t border-white/20 pt-12"><p className="text-sm md:text-xl font-light tracking-[0.2em] uppercase opacity-90">Bespoke Cinematic Narrative</p></div>
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce opacity-40"><div className="w-[1px] h-20 bg-white"></div></div>
              </div>

              <section className="max-w-5xl mx-auto py-40 md:py-64 px-8 text-center leading-relaxed">
                <h2 className="text-[11px] tracking-[0.6em] uppercase text-[#C5A059] font-sans font-black mb-16 md:mb-24">The Vision</h2>
                <p className="text-2xl md:text-5xl lg:text-6xl leading-[1.6] text-[#222222] font-light italic px-4">"{proposalData.visionStatement}"</p>
              </section>

              <section className="bg-[#fcfcfb] py-32 md:py-48 px-8 border-y border-slate-100 leading-normal">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-24 md:mb-32">
                    <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight text-slate-950">The Itinerary</h2>
                    <p className="text-[11px] font-sans font-black text-slate-400 tracking-[0.5em] uppercase">Documenting the Journey</p>
                  </div>
                  <div className={`grid gap-8 md:gap-10 ${
                    proposalData.days.length === 1 ? 'md:grid-cols-1 max-w-xl mx-auto' :
                    proposalData.days.length === 2 ? 'md:grid-cols-2 max-w-5xl mx-auto' :
                    proposalData.days.length === 3 ? 'md:grid-cols-3 max-w-full' : 'md:grid-cols-4'
                  }`}>
                    {proposalData.days.map((day) => (
                      <div key={day.id} className={`relative p-8 md:p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 ${day.highlight ? 'ring-1 ring-[#C5A059]/30' : ''}`}>
                        <div className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] mb-12 ${day.highlight ? 'bg-[#C5A059] text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{IconMap[day.icon] || <Clock size={28} />}</div>
                        <h4 className="font-black text-[11px] font-sans uppercase tracking-[0.4em] text-[#C5A059] mb-4">{day.label}</h4>
                        <p className="text-[#121212] text-[14px] font-sans font-black mb-4 tracking-widest uppercase">{day.date}</p>
                        <p className={`text-xl md:text-2xl font-serif italic ${day.highlight ? 'text-slate-900' : 'text-slate-700'} font-medium leading-relaxed`}>{day.desc}</p>
                        {day.highlight && <div className="mt-12 pt-12 border-t border-slate-50"><p className="text-[11px] font-sans font-black text-slate-800 uppercase tracking-[0.2em] leading-relaxed">Continuous Cinema Unit<br/>Full Day Marathon Production</p></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Collections */}
              <section className="max-w-[1440px] mx-auto py-40 md:py-64 px-8 leading-normal">
                <div className="text-center mb-32 md:mb-48 font-serif">
                  <h2 className="text-5xl md:text-8xl font-light mb-10 text-slate-950 tracking-tighter leading-none">The Collections</h2>
                  <div className="flex items-center justify-center gap-10 text-[11px] font-sans font-black text-slate-400 tracking-[0.6em] uppercase leading-none">
                    <div className="h-[1px] w-12 bg-slate-200"></div>
                    <span>Curated Investment</span>
                    <div className="h-[1px] w-12 bg-slate-200"></div>
                  </div>
                </div>
                <div className={`grid gap-8 md:gap-12 items-stretch justify-center ${proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-2xl mx-auto' : proposalData.packages.filter(p => p.isVisible).length === 2 ? 'md:grid-cols-2 max-w-6xl mx-auto' : 'lg:grid-cols-3'}`}>
                  {proposalData.packages.filter(p => p.isVisible).map((item) => (
                    <div key={item.id} className={`relative flex flex-col p-10 md:p-14 rounded-[3.5rem] border transition-all duration-1000 ${item.isHighlighted ? 'bg-white border-[#C5A059]/40 lg:scale-105 z-10 shadow-2xl' : 'bg-white border-slate-100'}`}>
                      {item.isHighlighted && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#C5A059] text-white px-12 py-3.5 rounded-full text-[10px] font-black font-sans tracking-[0.5em] shadow-xl leading-none uppercase">Recommended</div>}
                      <div className="mb-14 md:mb-16">
                        <h3 className="text-3xl md:text-4xl font-light mb-6 tracking-tight text-slate-950 leading-none">{item.name}</h3>
                        <div className="text-6xl md:text-8xl font-serif mb-10 text-slate-950 tracking-tighter leading-none">{item.price}</div>
                        <p className="text-base md:text-lg text-slate-500 leading-relaxed italic font-medium pr-4">{item.description}</p>
                      </div>
                      <div className="flex-grow space-y-7 md:space-y-8 mb-16 border-t border-slate-50 pt-16">
                        {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-5 group font-sans">
                            <div className={`mt-1.5 flex-shrink-0 transition-all duration-300 ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-300 group-hover:text-slate-950'}`}><CheckCircle size={20} strokeWidth={1.5} /></div>
                            <span className="text-base md:text-lg text-[#333333] leading-snug tracking-tight font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => openWhatsApp(`Hi! I'd like to secure our date for the ${item.name} Story.`)} className="w-full py-7 rounded-[2rem] font-black text-[11px] font-sans tracking-[0.4em] uppercase transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 bg-[#121212] text-white hover:bg-[#C5A059]">Inquire Selection <MessageCircle size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Kind Words (Reviews Section) - NEW! */}
              {proposalData.reviews && proposalData.reviews.length > 0 && (
                <section className="bg-[#fafaf9] py-32 md:py-48 px-8 border-y border-slate-100 leading-relaxed">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-24 md:mb-32">
                      <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight text-slate-950">Kind Words</h2>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C5A059" className="text-[#C5A059]" />)}
                      </div>
                      <p className="text-[11px] font-sans font-black text-slate-400 tracking-[0.5em] uppercase">Trusted by our Spark Couples</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-10 md:gap-14 font-sans">
                      {proposalData.reviews.map((review) => (
                        <div key={review.id} className="relative p-12 md:p-16 bg-white rounded-[3rem] border border-slate-50 shadow-sm group font-sans">
                          <Quote className="absolute top-10 left-10 text-slate-50 group-hover:text-slate-100 transition-colors" size={80} strokeWidth={0.5} />
                          <div className="relative z-10 font-sans">
                            <p className="text-lg md:text-xl text-[#333333] leading-[1.8] italic font-medium mb-10">"{review.text}"</p>
                            <div className="flex items-center gap-4 border-t border-slate-50 pt-8">
                              <div className="h-1px w-12 bg-[#C5A059]"></div>
                              <p className="font-sans font-black text-[12px] uppercase tracking-[0.3em] text-[#C5A059]">{review.author}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-24 text-center">
                      <a href="https://www.google.com/search?q=the+spark+studios+reviews" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-[11px] font-sans font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-950 transition-colors">
                        View All Google Reviews <ArrowLeft className="rotate-180" size={14} />
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* Final Narrative Footer */}
              <section className="bg-[#0a0a0a] text-white py-40 md:py-64 px-8 overflow-hidden relative leading-relaxed">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="max-w-6xl mx-auto relative z-10 leading-relaxed">
                  <div className="grid md:grid-cols-2 gap-24 md:gap-48 items-center leading-relaxed">
                    <div className="text-left leading-relaxed">
                      <h3 className="text-5xl md:text-8xl mb-12 italic leading-[1] text-white font-light tracking-tighter">Your Legacy<br/>Starts Here.</h3>
                      <p className="text-xl md:text-2xl opacity-80 mb-20 font-light leading-relaxed max-w-md text-slate-100">The overture of your family's shared history. We are honored to preserve every chapter.</p>
                      <div className="space-y-16 leading-relaxed">
                        <div className="flex gap-8 leading-relaxed">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50"><Clock size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div><h4 className="font-black text-[11px] tracking-[0.4em] font-sans uppercase mb-4 text-[#C5A059]">Duration</h4><p className="text-xl font-sans font-bold text-white tracking-tight">Active for 30 days — Valid until {new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}</p></div>
                        </div>
                        <div className="flex gap-8 leading-relaxed">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50"><Award size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div><h4 className="font-black text-[11px] tracking-[0.4em] font-sans uppercase mb-4 text-[#C5A059]">Retainer</h4><p className="text-xl font-sans font-bold text-white tracking-tight">30% non-refundable retainer required to lock exclusive dates.</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-slate-950 p-12 md:p-24 rounded-[4rem] md:rounded-[6rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.8)] relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-bl-[10rem] transition-transform duration-[2s] group-hover:scale-125"></div>
                      <h4 className="text-4xl md:text-6xl font-serif mb-10 italic leading-none">Vision Call</h4>
                      <p className="text-slate-600 mb-16 text-lg md:text-2xl leading-relaxed font-sans font-medium pr-4">To ensure our artistic styles align, we invite you to a brief 15-minute introductory session.</p>
                      <button onClick={() => openWhatsApp(`Hi Spark Studios! We'd like to schedule a Vision Call for the ${proposalData.clientName} celebration.`)} className="w-full bg-[#C5A059] text-white py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.5em] font-sans hover:bg-slate-950 transition-all shadow-2xl shadow-[#C5A059]/40 active:scale-95 flex items-center justify-center gap-4">Connect on WhatsApp <MessageCircle size={20} /></button>
                    </div>
                  </div>
                  <div className="mt-48 md:mt-64 pt-20 border-t border-white/10 text-center"><p className="text-[11px] uppercase tracking-[1em] opacity-40 font-sans font-black">The Spark Studios &copy; 2026 — Fine Art Cinematography</p></div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;