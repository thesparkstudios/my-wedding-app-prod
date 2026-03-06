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
  Check, Lock, XCircle, MessageCircle, Trash, Star, Quote,
  Play, Link as LinkIcon, HelpCircle, ShieldCheck, Map,
  LockKeyhole, Sparkles, Youtube, RefreshCw
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
const LOGO_URL = "https://thesparkstudios.ca/wp-content/uploads/2025/01/logo@2x.png";

const App = () => {
  // Logic to bypass password screen if accessing a direct quote link
  const isDirectClientLink = window.location.hash.startsWith('#/quote/');
  
  const [view, setView] = useState(isDirectClientLink ? 'preview' : 'dashboard'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [fbError, setFbError] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(isDirectClientLink); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [deletingId, setDeletingId] = useState(null);

  const initialProposalState = {
    clientName: "Ayushi & Family",
    visionStatement: "To craft a cinematic narrative that encapsulates the vibrant tapestry of your wedding celebrations, weaving together the intimate moments, cultural richness, and joyous festivities into a timeless visual heirloom that resonates with love, tradition, and the unique spirit of her family.",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    loomUrl: "", 
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
      { id: 1, author: "Zeewarad", text: "The Spark Studio’s filmed my Nikkah and pre-shoot! Honestly choosing them to cover my event was one of the best decisions I have ever made! Waqar is truly a gem of a person and so easy to work with!" },
      { id: 2, author: "Hanni", text: "We are beyond happy with our wedding photos and videos! This team is incredibly talented, professional, and made the entire experience so smooth and fun. From the very beginning, they were attentive to our vision, made us feel so comfortable in front of the camera, and truly brought our dream wedding to life." }
    ],
    workLinks: [
      { id: 1, title: "Private Cinema Playlist", url: "https://www.youtube.com/playlist?list=PL7sciwbrUIXV51kVZ5ooqXdMh0BuP8709", note: "Private Gallery" },
      { id: 2, title: "Official Studio Portfolio", url: "https://thesparkstudios.ca/portfolio/", note: "Locked Code: SPARK123" }
    ]
  };

  const [proposalData, setProposalData] = useState(initialProposalState);

  // Browser Tab Title
  useEffect(() => {
    if (view === 'preview' && proposalData.clientName) {
      document.title = `The Spark Studios | Proposal for ${proposalData.clientName}`;
    } else if (view === 'editor') {
      document.title = `Editor | ${proposalData.clientName}`;
    } else {
      document.title = "Spark Portal | Dashboard";
    }
  }, [view, proposalData.clientName]);

  // WhatsApp helper
  const openWhatsApp = (msg) => {
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
  };

  // Auth
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

  // Fetch Logic
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/quote/')) {
        const id = hash.replace('#/quote/', '');
        if (view === 'editor' && currentQuoteId === id) return;

        setCurrentQuoteId(id);
        if (!user) return; 
        try {
          const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProposalData(data);
            const created = data.createdAt || Date.now();
            setIsExpired(Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000));
            if (!isAdmin) {
              await updateDoc(docRef, { views: increment(1), lastViewedAt: Date.now() });
            }
            setIsUnlocked(true);
            setView('preview');
          }
        } catch (err) { console.error(err); }
      }
    };
    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user, isAdmin, view, currentQuoteId]); 

  // Dashboard Sync
  useEffect(() => {
    if (!user || !isAdmin || view === 'preview') return;
    const q = collection(db, 'artifacts', finalAppId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
    }, (err) => { setFbError("Rules denied."); });
    return () => unsubscribe();
  }, [user, isAdmin, view]);

  const saveQuote = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    const id = currentQuoteId || proposalData.clientName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    try {
      const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
      const payload = { 
        ...proposalData, id, updatedAt: Date.now(), 
        createdAt: proposalData.createdAt || Date.now(),
        views: proposalData.views || 0,
        lastViewedAt: proposalData.lastViewedAt || null
      };
      await setDoc(docRef, payload);
      setCurrentQuoteId(id);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    } catch (err) {
      setFbError("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id));
      setDeletingId(null);
    } catch (err) { setFbError("Delete failed."); }
  };

  const handlePortalLogin = () => {
    if (passInput === 'wayssmffss2') {
      setIsUnlocked(true);
      setIsAdmin(true);
      setView('dashboard');
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  // State Helpers
  const updateField = (f, v) => setProposalData(prev => ({ ...prev, [f]: v }));
  const updateDay = (id, f, v) => setProposalData(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? { ...d, [f]: v } : d) }));
  const addDay = () => setProposalData(prev => ({ ...prev, days: [...prev.days, { id: Date.now(), label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }] }));
  const removeDay = (id) => setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  const updatePackage = (id, f, v) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, [f]: v } : p) }));
  const updatePackageFeatures = (id, arr) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, features: arr } : p) }));
  const updateWorkLink = (id, f, v) => setProposalData(prev => ({ ...prev, workLinks: prev.workLinks.map(l => l.id === id ? { ...l, [f]: v } : l) }));
  const updateReview = (id, f, v) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === id ? { ...r, [f]: v } : r) }));
  
  const createNew = () => { window.location.hash = ''; setCurrentQuoteId(null); setProposalData({ ...initialProposalState, createdAt: Date.now() }); setView('editor'); };

  const IconMap = { Calendar: <Calendar size={18} />, Clock: <Clock size={18} />, Film: <Film size={18} />, Zap: <Zap size={18} />, Camera: <Camera size={18} /> };

  if (!isUnlocked && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-6 font-sans leading-relaxed">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Montserrat:wght@100..900&display=swap');
          .font-serif { font-family: 'Cormorant Garamond', serif !important; }
          .font-sans { font-family: 'Montserrat', sans-serif !important; }
        `}</style>
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-slate-100 shadow-sm"><Lock size={32} strokeWidth={1.5} /></div>
          <h2 className="text-3xl font-light mb-2 text-slate-950 uppercase font-serif">Spark Portal</h2>
          <p className="text-slate-400 text-[10px] mb-10 tracking-[0.3em] uppercase font-sans font-black">Internal Studio Access</p>
          <input type="password" placeholder="KEY CODE" className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl mb-6 text-center outline-none focus:ring-1 focus:ring-slate-300 font-sans font-black tracking-[0.4em]" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePortalLogin()} />
          <button onClick={handlePortalLogin} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs active:scale-95 font-sans font-black">Open Portal</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white animate-pulse font-sans font-black tracking-widest uppercase text-slate-400">The Spark Studios</div>;

  return (
    <div className="min-h-screen bg-[#fdfdfc] selection:bg-[#C5A059]/20 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Montserrat:wght@100..900&display=swap');
        .font-serif { font-family: 'Cormorant Garamond', serif !important; }
        .font-sans { font-family: 'Montserrat', sans-serif !important; }
        body { font-family: 'Montserrat', sans-serif; -webkit-font-smoothing: antialiased; }
        h1, h2, h3, h4 { font-family: 'Cormorant Garamond', serif !important; }
      `}</style>

      {fbError && view !== 'preview' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 font-sans font-black">
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3"><XCircle size={18} /> {fbError}</div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto py-16 px-6 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-light text-slate-950 tracking-tight leading-none font-serif mb-4">Proposals</h1>
              <p className="text-slate-500 font-black tracking-widest uppercase text-[11px]">Lead Intelligence Dashboard</p>
            </div>
            <button onClick={createNew} className="bg-slate-950 text-white px-10 py-5 rounded-full flex items-center gap-3 shadow-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition active:scale-95"><Plus size={16} /> New Entry</button>
          </div>
          {/* Dashboard quote list centralization logic */}
          <div className={`grid gap-6 ${savedQuotes.length <= 2 ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {savedQuotes.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(quote => (
              <div key={quote.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:shadow-xl transition-all duration-500 gap-6">
                <div className="flex items-center gap-6 font-sans">
                  <div className="p-4 rounded-3xl bg-slate-50 text-slate-900 shadow-sm"><Calendar size={28} strokeWidth={1.2} /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-2xl tracking-tight font-serif leading-none">{quote.clientName}</h3>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans"><Eye size={14} className="text-slate-300" /> {quote.views || 0} Views</div>
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans"><Clock size={14} className="text-slate-300" /> Seen: {getTimeAgo(quote.lastViewedAt)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full lg:w-auto font-black font-sans font-black">
                  <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = ''; setView('editor'); }} className="flex-1 px-8 py-4 bg-slate-50 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-100 transition">Edit</button>
                  <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = `#/quote/${quote.id}`; setView('preview'); }} className="flex-1 px-8 py-4 bg-slate-950 text-white rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95">Preview</button>
                  {deletingId === quote.id ? (
                    <div className="flex gap-2 p-1 bg-rose-50 rounded-2xl animate-in fade-in">
                      <button onClick={() => handleDelete(quote.id)} className="p-3 bg-rose-600 text-white rounded-xl"><Check size={16} /></button>
                      <button onClick={() => setDeletingId(null)} className="p-3 bg-white text-slate-400 rounded-xl"><XCircle size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(quote.id)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-500 transition font-sans font-black"><Trash2 size={18} strokeWidth={1.5} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div className="max-w-6xl mx-auto py-16 px-6 text-slate-900 pb-48 leading-relaxed font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-slate-100 pb-10 gap-8">
            <div className="flex items-center gap-6">
              <button onClick={() => { setView('dashboard'); window.location.hash = ''; }} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 transition"><ArrowLeft size={20} /></button>
              <div><h1 className="text-4xl font-light text-slate-950 font-serif leading-none mb-1">Editor</h1><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] font-sans">{currentQuoteId ? `Editing: ${currentQuoteId}` : 'New Narrative'}</p></div>
            </div>
            <div className="flex gap-4 w-full md:w-auto font-black font-sans font-black">
              <button onClick={saveQuote} disabled={isSaving} className={`flex-1 px-10 py-5 rounded-full flex items-center justify-center gap-3 transition shadow-xl ${copyFeedback ? 'bg-emerald-600' : 'bg-slate-950'} text-white uppercase tracking-widest text-[11px]`}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin font-sans font-black" /> : copyFeedback ? <Check size={16} /> : <Save size={16} />}
                {isSaving ? "Syncing..." : currentQuoteId ? "Update Link" : "Save Proposal"}
              </button>
              {currentQuoteId && <button onClick={() => { window.location.hash = `#/quote/${currentQuoteId}`; setView('preview'); }} className="flex-1 px-10 py-5 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] shadow-xl font-sans font-black"><Eye size={16} /> Preview Mode</button>}
            </div>
          </div>

          <div className="space-y-12">
            <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <h2 className="text-xs font-black mb-10 flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans font-black">01. Client Narrative</h2>
              <div className="grid md:grid-cols-2 gap-8 font-sans">
                <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Client Name</label><input type="text" value={proposalData.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white font-bold text-slate-900 text-lg font-sans font-black" /></div>
                <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hero Image URL</label><input type="text" value={proposalData.heroImage} onChange={(e) => updateField('heroImage', e.target.value)} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl text-xs font-black" /></div>
                <div className="flex flex-col gap-2 mt-4 font-sans font-black font-sans font-black"><label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Loom Embed URL</label><input type="text" value={proposalData.loomUrl} onChange={(e) => updateField('loomUrl', e.target.value)} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl text-xs font-black" /></div>
                <div className="md:col-span-2 flex flex-col gap-2 mt-4 font-sans font-black font-sans font-black font-sans font-black"><label className="text-[11px] font-black uppercase tracking-widest text-slate-500 font-black">The Artistic Vision</label><textarea rows="4" value={proposalData.visionStatement} onChange={(e) => updateField('visionStatement', e.target.value)} className="p-6 border border-slate-100 bg-slate-50 rounded-2xl italic resize-none font-medium text-slate-700 font-sans font-black font-sans font-black" /></div>
              </div>
            </section>

            <section className="font-sans">
              <div className="flex justify-between items-center mb-10 px-4 font-sans font-black font-sans font-black"><h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 font-sans font-black">02. Itinerary</h2><button onClick={addDay} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest font-sans font-black font-sans font-black"><Plus size={14} /> Add Day</button></div>
              <div className="grid md:grid-cols-4 gap-6 font-sans font-black font-sans font-black">
                {proposalData.days.map((day) => (
                  <div key={day.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 relative group font-sans font-black font-sans font-black">
                    <button onClick={() => removeDay(day.id)} className="absolute top-6 right-6 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity font-sans font-black font-sans font-black"><Trash2 size={16} /></button>
                    <div className="space-y-4 font-sans font-black font-sans font-black font-sans font-black font-sans font-black">
                      <select value={day.icon} onChange={(e) => updateDay(day.id, 'icon', e.target.value)} className="bg-slate-50 p-2 rounded-xl text-[10px] font-black uppercase outline-none mb-2 font-sans font-black font-sans font-black">{Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}</select>
                      <input type="text" value={day.label} onChange={(e) => updateDay(day.id, 'label', e.target.value)} className="w-full font-bold border-b border-dashed text-slate-900 font-serif text-lg outline-none font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                      <input type="text" value={day.date} onChange={(e) => updateDay(day.id, 'date', e.target.value)} className="w-full text-[11px] uppercase tracking-widest font-black text-slate-500 outline-none font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                      <input type="text" value={day.desc} onChange={(e) => updateDay(day.id, 'desc', e.target.value)} className="w-full text-sm text-indigo-700 font-bold outline-none font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                      <label className="flex items-center gap-2 mt-4 cursor-pointer font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><input type="checkbox" checked={day.highlight} onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)} className="rounded text-slate-950 font-sans font-black font-sans font-black font-sans font-black font-sans font-black" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-black font-sans font-black font-sans font-black font-sans font-black">Full Day Team</span></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="font-sans">
              <h2 className="text-xs font-black mb-10 px-4 uppercase tracking-[0.3em] text-slate-400 font-sans font-black font-sans font-black font-sans font-black">03. Collections</h2>
              <div className="space-y-8 font-sans font-black font-sans font-black font-sans font-black font-sans font-black">
                {proposalData.packages.map((pkg) => (
                  <div key={pkg.id} className={`p-10 rounded-[3.5rem] border-2 transition-all ${pkg.isVisible ? 'bg-white border-slate-100' : 'bg-slate-50 opacity-50 border-dashed border-slate-200'} font-sans font-black font-sans font-black font-sans font-black font-sans font-black`}>
                    <div className="flex justify-between items-center mb-8 border-b pb-6 border-slate-50 font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><div className="flex items-center gap-4 font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><input type="checkbox" checked={pkg.isVisible} onChange={(e) => updatePackage(pkg.id, 'isVisible', e.target.checked)} className="w-6 h-6 rounded border-slate-200 text-slate-950 font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" /><h3 className="text-2xl font-serif text-slate-950 leading-none font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black">{pkg.name} Story</h3></div>{pkg.isVisible && <label className="flex items-center gap-2 bg-slate-950 text-white px-5 py-2 rounded-full cursor-pointer font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><span className="text-[10px] font-black uppercase tracking-widest font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black">Featured</span><input type="checkbox" checked={pkg.isHighlighted} onChange={(e) => updatePackage(pkg.id, 'isHighlighted', e.target.checked)} className="rounded font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" /></label>}</div>
                    {pkg.isVisible && (
                      <div className="grid md:grid-cols-2 gap-12 font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black">
                        <div className="space-y-6 font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black">
                          <input type="text" value={pkg.name} onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold font-serif text-lg outline-none font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                          <input type="text" value={pkg.price} onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-serif text-3xl font-bold text-indigo-700 outline-none font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                          <textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl italic text-sm resize-none outline-none font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" />
                        </div>
                        <textarea value={pkg.features.join('\n')} onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))} className="w-full p-6 bg-slate-50 rounded-2xl text-sm leading-loose min-h-[200px] outline-none font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black" placeholder="Features (one per line)" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === 'preview' && (
        <div className="min-h-screen bg-white relative selection:bg-[#C5A059]/20 font-sans leading-relaxed">
          {isExpired ? (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6 font-black font-sans font-black">
              <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-slate-100 font-black">
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-10"><AlertCircle size={40} strokeWidth={1} /></div>
                <h1 className="text-3xl font-light mb-6 text-slate-950 font-serif font-black font-black font-black">Proposal Expired</h1>
                <p className="text-slate-500 mb-10 font-medium font-black font-black font-black font-black font-black">This proposal for <span className="text-slate-950 font-black font-sans font-black font-black font-black font-black">{proposalData.clientName}</span> is inactive.</p>
                <button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} expired.`)} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest font-black font-black">Contact Studio</button>
              </div>
            </div>
          ) : (
            <div className="font-sans font-sans font-sans font-sans font-sans">
              <div className="relative h-[80vh] md:h-screen flex items-center justify-center overflow-hidden bg-[#0d0d0d]">
                <div className="absolute inset-0 opacity-60 font-sans font-sans"><img src={proposalData.heroImage} className="w-full h-full object-cover transform scale-105 font-sans font-sans" alt="Hero" /></div>
                <div className="relative z-10 text-center text-white px-8 font-sans font-sans">
                  <img src={LOGO_URL} alt="Spark" className="mx-auto h-12 md:h-20 mb-10 object-contain drop-shadow-xl font-black font-sans font-black font-sans" />
                  <h1 className="text-6xl md:text-[8rem] lg:text-[10rem] mb-12 font-serif font-light italic leading-none font-serif font-serif font-serif">{proposalData.clientName}</h1>
                  <div className="max-w-lg mx-auto border-t border-white/20 pt-12 font-sans font-black font-sans font-black font-sans font-black"><p className="text-sm md:text-xl font-light tracking-[0.2em] uppercase opacity-90 font-black font-black font-black">Bespoke Cinematic Narrative</p></div>
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce opacity-40 font-black font-black font-black font-black font-black font-black font-black font-black"><div className="w-[1px] h-20 bg-white font-black font-black font-black font-black font-black font-black font-black"></div></div>
              </div>

              {/* Tighter Spacing py-24 */}
              <section className="max-w-5xl mx-auto py-24 md:py-32 px-8 text-center leading-relaxed font-sans font-sans">
                <h2 className="text-[11px] tracking-[0.6em] uppercase text-[#C5A059] font-sans font-black mb-10 md:mb-16 font-sans font-sans">The Vision</h2>
                <p className="text-3xl md:text-5xl lg:text-6xl text-[#222222] font-light italic font-serif leading-[1.3] font-serif font-serif font-serif">"{proposalData.visionStatement}"</p>
              </section>

              <section className="max-w-6xl mx-auto pb-24 md:pb-32 px-8 font-sans font-sans font-sans">
                <div className="relative aspect-video bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden shadow-inner font-sans font-sans font-sans">
                  {proposalData.loomUrl ? (
                    <iframe title="Loom" src={proposalData.loomUrl.replace("loom.com/share", "loom.com/embed")} frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowFullScreen className="w-full h-full font-sans font-sans font-sans"></iframe>
                  ) : (
                    <div className="font-sans p-10 text-center font-black font-sans font-black font-sans">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-[#C5A059] font-black font-sans font-black font-sans"><Play size={32} fill="currentColor" strokeWidth={0} className="font-black font-sans font-black font-sans" /></div>
                      <h4 className="text-2xl font-light mb-4 text-slate-900 font-serif leading-none font-black font-sans font-black font-sans">Personal Message</h4>
                      <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-sans font-sans font-sans">Cinematic Intro Coming Soon</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-[#fcfcfb] py-24 md:py-32 px-8 border-y border-slate-100 leading-normal font-sans font-sans">
                <div className="max-w-7xl mx-auto font-sans font-sans">
                  <div className="text-center mb-16 md:mb-24 font-serif font-black font-black font-black font-black">
                    <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight text-slate-950 leading-none italic font-black font-serif font-black font-serif">The Itinerary</h2>
                    <p className="text-[11px] font-sans font-black text-slate-400 tracking-[0.5em] uppercase font-sans font-black font-sans font-black">Documenting the Journey</p>
                  </div>
                  {/* CENTRALIZED Layout Logic for Itinerary */}
                  <div className={`flex flex-wrap ${proposalData.days.length === 1 ? 'justify-center' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-8 font-black font-sans font-black`}>
                    {proposalData.days.map((day) => (
                      <div key={day.id} className={`relative p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 ${day.highlight ? 'ring-1 ring-[#C5A059]/30' : ''} ${proposalData.days.length === 1 ? 'max-w-md w-full' : ''} font-black font-sans font-black`}>
                        <div className={`w-16 h-16 flex items-center justify-center rounded-3xl mb-12 ${day.highlight ? 'bg-[#C5A059] text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100 font-black font-black font-black font-black'}`}>{IconMap[day.icon] || <Clock size={28} className="font-black font-black font-black font-black" />}</div>
                        <h4 className="font-black text-[15px] uppercase tracking-[0.4em] text-[#C5A059] mb-4 font-black font-sans font-black font-sans font-black font-sans">{day.label}</h4>
                        <p className="text-[#121212] text-[18px] font-black mb-4 tracking-widest uppercase font-sans font-black font-sans font-black font-sans">{day.date}</p>
                        {/* BIGGER TEXT for ITINERARY DESCRIPTION */}
                        <p className={`text-2xl md:text-3xl font-serif italic font-medium leading-relaxed font-black font-serif font-black font-serif font-black font-serif`}>{day.desc}</p>
                        {day.highlight && <div className="mt-12 pt-12 border-t border-slate-50 font-black text-[11px] text-slate-800 tracking-widest uppercase font-sans font-black leading-none font-sans font-black leading-none">Continuous Production Team</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="max-w-[1440px] mx-auto py-24 md:py-32 px-8 font-serif font-black font-serif font-black">
                <div className="text-center mb-24 md:mb-32 font-serif font-black font-black font-black font-black font-black font-black">
                  <h2 className="text-5xl md:text-8xl font-light mb-10 text-slate-950 tracking-tighter leading-none italic font-serif font-serif font-serif font-serif">The Collections</h2>
                  <div className="flex items-center justify-center gap-10 text-[11px] font-sans font-black text-slate-400 tracking-[0.6em] uppercase leading-none font-black font-sans font-black font-sans font-black"><div className="h-[1px] w-12 bg-slate-200 font-black font-black font-black font-black"></div>Curated Investment<div className="h-[1px] w-12 bg-slate-200 font-black font-black font-black font-black"></div></div>
                </div>
                {/* CENTRALIZED PACKAGES Logic for 1, 2, or 3 entries */}
                <div className={`grid gap-10 items-stretch justify-center font-sans font-black ${
                  proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-2xl mx-auto grid-cols-1' : 
                  proposalData.packages.filter(p => p.isVisible).length === 2 ? 'max-w-5xl mx-auto grid-cols-1 md:grid-cols-2' : 
                  'lg:grid-cols-3 max-w-full'
                }`}>
                  {proposalData.packages.filter(p => p.isVisible).map((item) => (
                    <div key={item.id} className={`relative flex flex-col p-10 md:p-12 rounded-[4rem] border transition-all duration-1000 ${item.isHighlighted ? 'bg-white border-[#C5A059]/40 lg:scale-105 z-10 shadow-2xl font-black font-black font-black' : 'bg-white border-slate-100 font-black font-black font-black'}`}>
                      {item.isHighlighted && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#C5A059] text-white px-12 py-3 rounded-full text-[10px] font-black tracking-[0.5em] shadow-xl uppercase font-sans font-black font-sans font-black font-sans font-black font-sans">Recommended</div>}
                      <div className="mb-14 font-black font-serif font-black font-serif">
                        <h3 className="text-3xl md:text-4xl font-light mb-6 text-slate-950 font-serif leading-none italic font-black font-black font-black font-black">{item.name} Story</h3>
                        <div className="text-6xl md:text-8xl font-serif mb-10 text-slate-950 tracking-tighter font-black leading-none font-black font-black font-black font-black">{item.price}</div>
                        <p className="text-base md:text-lg text-slate-500 leading-relaxed italic font-serif font-medium font-black font-black font-black font-black">{item.description}</p>
                      </div>
                      <div className="flex-grow space-y-7 mb-16 border-t border-slate-50 pt-16 font-black font-sans font-black font-sans">
                        {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-5 font-black font-sans font-black font-black font-black font-sans font-black font-black">
                            <div className={`mt-1.5 flex-shrink-0 ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-300 font-black font-black font-black'}`}><CheckCircle size={22} strokeWidth={1.5} className="font-black font-black font-black font-black" /></div>
                            <span className="text-base md:text-lg text-[#333333] tracking-tight font-medium font-sans font-black font-sans font-black">{feature}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => openWhatsApp(`Hi Waqar! I'd like to book the ${item.name} Story.`)} className="w-full py-8 rounded-[2.5rem] font-black text-[11px] tracking-[0.5em] uppercase shadow-xl bg-[#121212] text-white hover:bg-[#C5A059] transition-all font-black font-sans font-black font-sans font-black font-sans">Inquire Selection <MessageCircle size={20} className="font-sans font-black font-sans font-black" /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* BIGGER PROCESS STEPS + TIRED TEXT */}
              <section className="max-w-6xl mx-auto py-24 md:py-32 px-8 font-sans font-black font-sans font-black">
                <div className="text-center mb-16 md:mb-24 font-serif font-black font-black font-black font-black font-black font-black">
                  <h2 className="text-4xl md:text-6xl font-light mb-8 leading-none italic font-black font-serif font-black font-serif font-black font-serif">The Process</h2>
                  <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-black font-sans font-black font-sans">A Sequence of Excellence</p>
                </div>
                <div className="grid md:grid-cols-3 gap-16 relative font-sans font-black font-sans font-black">
                  {[
                    { step: "01", title: "Vision Call", desc: "A creative session to align on the artistic direction and schedule flow.", icon: <MessageCircle className="font-black font-black" /> },
                    { step: "02", title: "Confirmation", desc: "A 30% retainer and signed agreement secure your specific block in our calendar.", icon: <Award className="font-black font-black" /> },
                    { step: "03", title: "Final Design", desc: "Timeline refinements and reference reviews 30 days prior to refine timeline specifics.", icon: <Map className="font-black font-black" /> }
                  ].map((item, idx) => (
                    <div key={idx} className="relative z-10 text-center flex flex-col items-center group font-black font-sans font-black font-black font-sans font-black">
                      <div className="w-24 h-24 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-8 shadow-xl text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-white transition-all duration-500 font-black font-sans font-black font-sans font-black font-sans">{item.icon}</div>
                      <span className="text-[10px] font-black text-[#C5A059] mb-4 uppercase tracking-[0.4em] font-sans font-black font-black font-black font-sans font-black font-black">{item.step}</span>
                      {/* BIGGER PROCESS TITLE */}
                      <h4 className="text-4xl font-serif italic mb-6 text-slate-950 font-black font-serif font-black font-serif font-black font-serif">{item.title}</h4>
                      {/* BIGGER PROCESS DESCRIPTION */}
                      <p className="text-xl leading-relaxed text-slate-500 font-medium px-4 font-black font-black font-black">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {proposalData.workLinks && proposalData.workLinks.length > 0 && (
                <section className="bg-slate-950 py-24 md:py-32 px-8 font-sans font-black font-sans font-black">
                  <div className="max-w-5xl mx-auto font-black font-sans font-black font-black font-sans font-black">
                    <div className="text-center mb-16 font-serif font-black font-black font-black font-black font-black font-black font-black font-black">
                      <h2 className="text-3xl md:text-5xl italic text-white mb-8 font-serif leading-none font-black font-black font-black font-black font-black font-black font-black font-black">Selected Stories</h2>
                      <p className="text-[11px] font-black text-slate-500 tracking-[0.4em] uppercase font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black">Recommended Viewing</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-8 font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black">
                      {proposalData.workLinks.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 p-10 rounded-[3rem] flex items-center justify-between group hover:bg-white/10 transition-all font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black">
                          <div className="font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black">
                            <h4 className="text-white font-bold text-xl mb-2 font-serif italic leading-none font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">{link.title}</h4>
                            <div className="flex items-center gap-2 font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black">
                                <span className="text-slate-400 text-[10px] tracking-widest uppercase font-black font-sans leading-none font-black font-black font-black font-sans leading-none font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black">Launch Gallery</span>
                                {link.note && <div className="bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1 font-black font-sans font-black font-black font-black font-sans font-black font-black font-black font-sans font-black font-black"><LockKeyhole size={10} className="font-black font-black font-black" /> {link.note}</div>}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center group-hover:bg-[#C5A059] group-hover:scale-110 transition-all shrink-0 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><LinkIcon size={18} className="font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-[#fafaf9] py-24 md:py-32 px-8 border-y border-slate-100 font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black">
                <div className="max-w-6xl mx-auto font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                  <div className="text-center mb-20 md:mb-24 font-serif font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                    <h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-slate-950 font-serif leading-none font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Kind Words</h2>
                    <div className="flex items-center justify-center gap-2 mb-4 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C5A059" className="text-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" />)}
                    </div>
                    <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black">Trusted by Spark Couples</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-10 md:gap-14 font-black font-sans font-black font-black font-black font-black font-sans font-black font-black font-black font-black font-sans font-black font-black">
                    {proposalData.reviews.map((review) => (
                      <div key={review.id} className="relative p-12 md:p-16 bg-white rounded-[3rem] border border-slate-50 shadow-sm group font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black">
                        <Quote className="absolute top-10 left-10 text-slate-50 group-hover:text-slate-100 transition-colors font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" size={80} strokeWidth={0.5} />
                        <div className="relative z-10 font-black font-sans font-black leading-relaxed font-black font-black font-sans font-black leading-relaxed font-black font-black font-sans font-black leading-relaxed font-black font-black font-sans font-black leading-relaxed">
                          <p className="text-xl md:text-2xl text-[#333333] leading-[1.8] italic font-serif font-black font-serif font-black font-serif font-black font-serif font-black font-serif font-black font-serif font-black font-serif font-black font-serif font-black font-serif">"{review.text}"</p>
                          <div className="flex items-center gap-4 border-t border-slate-50 pt-8 font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black font-black font-sans font-black">
                            <div className="h-1px w-12 bg-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"></div>
                            <p className="font-black text-[12px] uppercase tracking-[0.3em] text-[#C5A059] font-sans font-black leading-none font-black font-black font-sans font-black leading-none font-black font-black font-sans font-black leading-none font-black font-black font-sans font-black leading-none font-black font-black font-sans font-black">{review.author}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <footer className="bg-[#0a0a0a] text-white py-32 md:py-48 px-8 overflow-hidden relative font-sans font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"></div>
                <div className="max-w-6xl mx-auto relative z-10 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                  <div className="grid md:grid-cols-2 gap-24 items-center font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                    <div className="text-left leading-relaxed font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                      <h3 className="text-6xl md:text-8xl mb-12 italic leading-none text-white font-serif font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Your Legacy Starts Here.</h3>
                      <div className="space-y-12 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                        <div className="flex gap-8 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><Clock size={28} className="text-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" strokeWidth={1} /></div>
                          <div className="font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Duration</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Active for 30 days — Valid until {new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}</p></div>
                        </div>
                        <div className="flex gap-8 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><Award size={28} className="text-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" strokeWidth={1} /></div>
                          <div className="font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059] font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Contract</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">A signed agreement formalizes all details and dates.</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-slate-950 p-12 md:p-24 rounded-[4rem] shadow-2xl relative group overflow-hidden font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-bl-[10rem] transition-transform duration-[2s] group-hover:scale-125 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"></div>
                      <h4 className="text-4xl md:text-6xl font-serif mb-10 italic leading-none font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Vision Call</h4>
                      <p className="text-slate-600 mb-16 text-xl leading-relaxed font-medium pr-4 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">To ensure our artistic styles align, we invite you to a brief 15-minute introductory session.</p>
                      <button onClick={() => openWhatsApp(`Hi Spark Studios! We'd like to schedule a Vision Call for ${proposalData.clientName}.`)} className="w-full bg-[#C5A059] text-white py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.5em] shadow-2xl hover:bg-slate-950 transition-all active:scale-95 flex items-center justify-center gap-4 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Connect on WhatsApp <MessageCircle size={20} className="font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></button>
                    </div>
                  </div>
                  <div className="mt-32 md:mt-48 pt-20 border-t border-white/10 text-center font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><p className="text-[11px] uppercase tracking-[1em] opacity-40 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">The Spark Studios &copy; 2026</p></div>
                </div>
              </footer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;