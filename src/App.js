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
  // Start on Dashboard so the portal is the first thing you see after password
  const [view, setView] = useState('dashboard'); 
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
          "1 Professional Lead Photographer",
          "1 Professional Lead Videographer",
          "Cinematic Highlight Film",
          "Full-Length Edited Documentary",
          "Unlimited Professionally Edited Photos",
          "Aerial Drone Cinematography",
          "Online Digital Gallery"
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
          "12x17 Handcrafted Wedding Album",
          "Faux Leather Album Briefcase",
          "Priority Editing",
          "Custom USB with All Photos & Videos",
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
          "Expanded Production Team",
          "Upgraded Premium Faux Leather Case",
          "Custom-Designed USB Presentation Case",
          "Guaranteed 6-Week Digital Delivery",
          "Instagram Cinematic Teaser",
          "72-Hour Photo Preview Gallery",
        ]
      }
    ],
    reviews: [
      { id: 1, author: "Zeewarad", text: "Choose them for our event was one of the best decisions I have ever made! Waqar is truly a gem of a person and so easy to work with!" },
      { id: 2, author: "Hanni", text: "Incredibly talented, professional, and made the entire experience so smooth and fun. Truly brought our dream wedding to life." }
    ],
    workLinks: [
      { id: 1, title: "Private Cinema Playlist", url: "https://www.youtube.com/playlist?list=PL7sciwbrUIXV51kVZ5ooqXdMh0BuP8709", note: "Private Gallery" },
      { id: 2, title: "Official Studio Portfolio", url: "https://thesparkstudios.ca/portfolio/", note: "Locked Code: SPARK123" }
    ]
  };

  const [proposalData, setProposalData] = useState(initialProposalState);

  // Dynamic Browser Title Logic
  useEffect(() => {
    if (view === 'preview' && proposalData.clientName) {
      document.title = `The Spark Studios | Proposal for ${proposalData.clientName}`;
    } else if (view === 'editor') {
      document.title = `Editor | ${proposalData.clientName || 'New Entry'}`;
    } else {
      document.title = "Spark Portal | Dashboard";
    }
  }, [view, proposalData.clientName]);

  // Auth initialization
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

  // Sync quotes list
  useEffect(() => {
    if (!user || !isUnlocked || view === 'preview') return;
    const q = collection(db, 'artifacts', finalAppId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
    }, (err) => {
      setFbError("Database sync failed.");
    });
    return () => unsubscribe();
  }, [user, isUnlocked, view]);

  // Routing Logic
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/quote/')) {
        const id = hash.replace('#/quote/', '');
        if (view === 'editor' && currentQuoteId === id) return; // Keep admin in editor

        setCurrentQuoteId(id);
        if (!user) return; 
        try {
          const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProposalData(docSnap.data());
            const created = docSnap.data().createdAt || Date.now();
            setIsExpired(Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000));
            if (!isAdmin) {
              await updateDoc(docRef, { views: increment(1), lastViewedAt: Date.now() });
            }
            setView('preview');
          }
        } catch (err) { console.error(err); }
      }
    };
    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user, view, isAdmin, currentQuoteId]);

  const saveQuote = async () => {
    if (!auth.currentUser) return;
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
    } catch (err) {
      setFbError("Delete failed.");
    }
  };

  const getTimeAgoString = (timestamp) => {
    if (!timestamp) return "Never";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const openWhatsApp = (msg) => {
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
  };

  const updateField = (field, value) => setProposalData(prev => ({ ...prev, [field]: value }));
  const updateDay = (id, field, value) => setProposalData(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? { ...d, [field]: value } : d) }));
  const addDay = () => setProposalData(prev => ({ ...prev, days: [...prev.days, { id: Date.now(), label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }] }));
  const removeDay = (id) => setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  const updatePackage = (id, field, value) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const updatePackageFeatures = (pId, featuresArray) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === pId ? { ...p, features: featuresArray } : p) }));
  const updateReview = (id, field, value) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  const addReview = () => setProposalData(prev => ({ ...prev, reviews: [...prev.reviews, { id: Date.now(), author: "New Couple", text: "Review..." }] }));
  const removeReview = (id) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.filter(r => r.id !== id) }));
  const updateWorkLink = (id, field, value) => setProposalData(prev => ({ ...prev, workLinks: prev.workLinks.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  const addWorkLink = () => setProposalData(prev => ({ ...prev, workLinks: [...prev.workLinks, { id: Date.now(), title: "Project", url: "", note: "" }] }));
  const removeWorkLink = (id) => setProposalData(prev => ({ ...prev, workLinks: prev.workLinks.filter(l => l.id !== id) }));
  const createNew = () => { setCurrentQuoteId(null); setProposalData({ ...initialProposalState, createdAt: Date.now() }); window.location.hash = ''; setView('editor'); };

  const IconMap = { Calendar: <Calendar size={18} />, Clock: <Clock size={18} />, Film: <Film size={18} />, Zap: <Zap size={18} />, Camera: <Camera size={18} /> };

  if (!isUnlocked && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-6 font-sans">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Montserrat:wght@100..900&display=swap');
          .font-serif { font-family: 'Cormorant Garamond', serif !important; }
          .font-sans { font-family: 'Montserrat', sans-serif !important; }
        `}</style>
        <div className="max-w-md w-full bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl text-center font-sans">
          <div className="w-20 h-20 bg-slate-50 text-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-slate-100 shadow-sm"><Lock size={32} strokeWidth={1.5} /></div>
          <h2 className="text-2xl font-light mb-2 tracking-[0.1em] text-slate-950 uppercase text-center font-serif leading-none">Spark Portal</h2>
          <p className="text-slate-400 text-[10px] mb-10 tracking-[0.3em] uppercase font-sans font-black">Internal Studio Access</p>
          <input type="password" placeholder="KEY CODE" className="w-full p-4 border border-slate-200 bg-slate-50/50 rounded-2xl mb-6 text-center outline-none focus:ring-1 focus:ring-slate-300 transition-all font-mono tracking-[0.4em] text-sm font-sans font-black" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && passInput === 'wayssmffss2') { setIsUnlocked(true); setIsAdmin(true); } }} />
          <button onClick={() => { if(passInput === 'wayssmffss2') { setIsUnlocked(true); setIsAdmin(true); } }} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all uppercase tracking-widest text-xs active:scale-95 font-sans">Open Portal</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white animate-pulse font-sans"><div className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-sans font-black leading-none">The Spark Studios</div></div>;

  return (
    <div className="min-h-screen bg-[#fdfdfc] selection:bg-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Montserrat:wght@100..900&display=swap');
        .font-serif { font-family: 'Cormorant Garamond', serif !important; }
        .font-sans { font-family: 'Montserrat', sans-serif !important; }
        body { font-family: 'Montserrat', sans-serif; -webkit-font-smoothing: antialiased; }
        h1, h2, h3, h4 { font-family: 'Cormorant Garamond', serif !important; }
      `}</style>

      {fbError && view !== 'preview' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 font-sans font-black">
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3"><XCircle size={18} /><p className="text-xs font-bold uppercase tracking-wider">{fbError}</p></div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto py-12 md:py-20 px-6 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-light text-slate-950 tracking-tight mb-4 leading-none font-serif">Proposals</h1>
              <p className="text-slate-500 font-black tracking-widest uppercase text-[11px] font-sans">Lead Intelligence Dashboard</p>
            </div>
            <button onClick={createNew} className="bg-slate-950 text-white px-10 py-5 rounded-full flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-xl font-black uppercase tracking-widest text-[11px] active:scale-95 font-sans"><Plus size={16} /> New Entry</button>
          </div>
          <div className="grid gap-6">
            {savedQuotes.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(quote => (
              <div key={quote.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:shadow-xl transition-all duration-500 gap-6">
                <div className="flex items-start md:items-center gap-6 flex-1 min-w-0 font-sans">
                  <div className="p-4 rounded-[1.5rem] bg-slate-50 text-slate-900 shadow-sm font-sans"><Calendar size={24} strokeWidth={1.5} /></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-2xl tracking-tight mb-2 truncate font-serif leading-none">{quote.clientName}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase tracking-widest font-sans"><Eye size={14} className="text-slate-300 font-sans" /> {quote.views || 0} Opens</div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase tracking-widest font-sans"><Clock size={14} className="text-slate-300" /> Seen: {getTimeAgoString(quote.lastViewedAt)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full lg:w-auto font-sans font-black">
                  <button 
                    onClick={() => { 
                      setProposalData(quote); 
                      setCurrentQuoteId(quote.id); 
                      window.location.hash = ''; // Clear hash for editing
                      setView('editor'); 
                    }} 
                    className="flex-1 py-4 px-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition text-slate-900 font-black text-[11px] uppercase tracking-widest font-sans"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => { 
                      setProposalData(quote); 
                      setCurrentQuoteId(quote.id); 
                      window.location.hash = `#/quote/${quote.id}`; 
                      setView('preview'); 
                    }} 
                    className="flex-1 py-4 px-6 bg-slate-950 rounded-2xl hover:bg-slate-800 transition text-white font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 font-sans"
                  >
                    Preview
                  </button>
                  {deletingId === quote.id ? (
                    <div className="flex gap-2 items-center bg-rose-50 p-1 px-2 rounded-2xl animate-in fade-in">
                      <button onClick={() => handleDelete(quote.id)} className="p-3 bg-rose-600 text-white rounded-xl"><Check size={16} /></button>
                      <button onClick={() => setDeletingId(null)} className="p-3 bg-white text-slate-400 rounded-xl"><XCircle size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(quote.id)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-500 transition font-sans"><Trash2 size={18} strokeWidth={1.5} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div className="max-w-6xl mx-auto py-12 md:py-20 px-6 font-sans text-slate-900 pb-48 leading-relaxed font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-slate-100 pb-10 gap-8 font-sans">
            <div className="flex items-center gap-6 font-sans">
              <button onClick={() => { setView('dashboard'); window.location.hash = ''; }} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 hover:shadow-md transition font-sans"><ArrowLeft size={20} /></button>
              <div className="font-sans">
                <h1 className="text-3xl font-light tracking-tight text-slate-950 font-serif leading-none mb-1">Proposal Editor</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] font-sans">{currentQuoteId ? `Editing existing link for: ${proposalData.clientName}` : 'New Cinematic Story'}</p>
              </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto font-sans font-black">
              <button onClick={saveQuote} disabled={isSaving} className={`flex-1 md:flex-none px-10 py-5 rounded-full flex items-center justify-center gap-3 transition shadow-xl disabled:opacity-50 ${copyFeedback ? 'bg-emerald-600' : 'bg-slate-950'} text-white uppercase tracking-widest text-[11px] active:scale-95 font-sans`}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin font-sans" /> : copyFeedback ? <Check size={16} /> : <Save size={16} />}
                {isSaving ? "Updating Link..." : currentQuoteId ? "Update Proposal" : "Save Proposal"}
              </button>
              {currentQuoteId && <button onClick={() => { window.location.hash = `#/quote/${currentQuoteId}`; setView('preview'); }} className="flex-1 md:flex-none bg-indigo-600 text-white px-10 py-5 rounded-full flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl uppercase tracking-widest text-[11px] active:scale-95 font-sans font-black"><Eye size={16} /> Preview Mode</button>}
            </div>
          </div>

          <div className="space-y-12">
            <section className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-slate-100 font-sans">
              <h2 className="text-xs font-black mb-10 flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans">01. Client Narrative</h2>
              <div className="grid md:grid-cols-2 gap-8 font-sans">
                <div className="flex flex-col gap-3 font-sans"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Title</label><input type="text" value={proposalData.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold text-slate-900 text-lg font-sans" /></div>
                <div className="flex flex-col gap-3 font-sans"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Visual Header URL</label><input type="text" value={proposalData.heroImage} onChange={(e) => updateField('heroImage', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl outline-none focus:bg-white focus:border-slate-300 transition-all text-sm font-medium text-slate-600 font-sans" /></div>
                <div className="flex flex-col gap-3 font-sans mt-4 font-sans"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Loom Video URL</label><input type="text" value={proposalData.loomUrl} onChange={(e) => updateField('loomUrl', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl outline-none focus:bg-white focus:border-slate-300 transition-all text-sm font-medium text-slate-600 font-sans" /></div>
                <div className="md:col-span-2 flex flex-col gap-3 mt-4 font-sans"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">The Artistic Vision</label><textarea rows="4" value={proposalData.visionStatement} onChange={(e) => updateField('visionStatement', e.target.value)} className="p-6 border border-slate-100 bg-slate-50/30 rounded-[2rem] outline-none focus:bg-white focus:border-slate-300 transition-all italic text-slate-700 resize-none font-medium leading-relaxed text-lg font-sans" /></div>
              </div>
            </section>

            <section className="font-sans">
              <div className="flex justify-between items-center mb-10 px-4 font-sans"><h2 className="text-xs font-black flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans">02. Event Itinerary</h2><button onClick={addDay} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-md font-sans"><Plus size={14} /> Add Segment</button></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {proposalData.days.map((day) => (
                  <div key={day.id} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${day.highlight ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white'}`}>
                    <div className="flex justify-between items-center mb-6 font-sans"><select value={day.icon} onChange={(e) => updateDay(day.id, 'icon', e.target.value)} className="bg-slate-100 p-2.5 rounded-xl text-[10px] border-none outline-none font-black text-slate-700 uppercase tracking-widest font-sans">{Object.keys(IconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}</select><button onClick={() => removeDay(day.id)} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition font-sans"><Trash2 size={18} /></button></div>
                    <div className="space-y-4 font-sans">
                      <input type="text" value={day.label} onChange={(e) => updateDay(day.id, 'label', e.target.value)} className="w-full font-bold bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none text-slate-900 text-lg py-1 font-serif" />
                      <input type="text" value={day.date} onChange={(e) => updateDay(day.id, 'date', e.target.value)} className="w-full text-[11px] text-slate-500 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none font-black uppercase tracking-widest font-sans" />
                      <input type="text" value={day.desc} onChange={(e) => updateDay(day.id, 'desc', e.target.value)} className="w-full text-sm text-indigo-700 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 outline-none font-bold mt-2 font-sans" />
                      <label className="flex items-center gap-3 mt-6 cursor-pointer select-none px-1 font-sans"><input type="checkbox" checked={day.highlight} onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)} className="w-5 h-5 rounded border-slate-200 text-slate-950 focus:ring-slate-950 font-sans font-black" /><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Full Day Team</span></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="font-sans">
              <h2 className="text-xs font-black mb-10 px-4 flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans">03. Investment Collections</h2>
              <div className="space-y-8 font-sans">
                {proposalData.packages.map((pkg) => (
                  <div key={pkg.id} className={`p-8 md:p-12 rounded-[3.5rem] border-2 transition-all duration-500 ${pkg.isVisible ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 opacity-50 border-dashed border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-50 pb-8 gap-6 font-sans"><div className="flex items-center gap-5 font-sans font-black"><input type="checkbox" checked={pkg.isVisible} onChange={(e) => updatePackage(pkg.id, 'isVisible', e.target.checked)} className="w-7 h-7 rounded-lg border-slate-200 text-slate-950 focus:ring-slate-950 cursor-pointer" /><div><h3 className="font-bold text-slate-950 text-2xl tracking-tight font-serif leading-none">{pkg.name} Story</h3><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1 font-sans">Status: {pkg.isVisible ? 'Visible' : 'Hidden'}</p></div></div>{pkg.isVisible && <div className="flex items-center gap-3 bg-slate-950 px-5 py-2.5 rounded-full text-white shadow-lg font-sans"><span className="text-[10px] font-black uppercase tracking-widest font-sans font-black">Featured?</span><input type="checkbox" checked={pkg.isHighlighted} onChange={(e) => updatePackage(pkg.id, 'isHighlighted', e.target.checked)} className="w-4 h-4 rounded text-white focus:ring-0 cursor-pointer font-black" /></div>}</div>
                    {pkg.isVisible && (
                      <div className="grid md:grid-cols-2 gap-12 font-sans font-black">
                        <div className="space-y-6 font-sans">
                          <div className="flex flex-col gap-2 font-sans"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Title</label><input type="text" value={pkg.name} onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)} className="p-4 border border-slate-100 bg-slate-50/30 rounded-xl font-bold text-slate-950 text-lg font-serif" /></div>
                          <div className="flex flex-col gap-2 font-sans"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Price</label><input type="text" value={pkg.price} onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl font-serif text-3xl text-indigo-700 font-bold" /></div>
                          <div className="flex flex-col gap-2 font-sans"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Summary</label><textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} className="p-5 border border-slate-100 bg-slate-50/30 rounded-2xl text-sm text-slate-700 h-24 italic resize-none font-medium font-sans" /></div>
                        </div>
                        <div className="flex flex-col gap-2 font-sans"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Specifics (New Line each)</label><textarea value={pkg.features.join('\n')} onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))} className="p-6 border border-slate-100 bg-slate-50 rounded-2xl text-sm h-full min-h-[250px] leading-loose text-slate-900 font-medium font-sans" /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="font-sans">
              <div className="flex justify-between items-center mb-10 px-4 font-sans"><h2 className="text-xs font-black flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans font-black">04. Featured Studio Work</h2><button onClick={addWorkLink} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest shadow-md font-sans font-black font-sans"><Plus size={14} /> Add Link</button></div>
              <div className="grid md:grid-cols-2 gap-6 font-sans">
                {proposalData.workLinks?.map((link) => (
                  <div key={link.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 relative group font-sans">
                    <button onClick={() => removeWorkLink(link.id)} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity font-sans"><Trash size={16} /></button>
                    <div className="space-y-4 font-sans">
                      <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">Project Title</label><input type="text" value={link.title} onChange={(e) => updateWorkLink(link.id, 'title', e.target.value)} className="w-full p-3 border-b border-slate-100 font-bold outline-none focus:border-slate-400 transition-all font-serif text-slate-900 leading-none" /></div>
                      <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">URL</label><input type="text" value={link.url} onChange={(e) => updateWorkLink(link.id, 'url', e.target.value)} className="w-full p-3 bg-slate-50/50 rounded-xl text-xs outline-none font-sans" /></div>
                      <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">Access Note</label><input type="text" value={link.note} onChange={(e) => updateWorkLink(link.id, 'note', e.target.value)} className="w-full p-3 bg-slate-50/50 rounded-xl text-xs outline-none font-sans font-black uppercase tracking-widest" placeholder="e.g. Code: SPARK123" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="font-sans">
              <div className="flex justify-between items-center mb-10 px-4 font-sans"><h2 className="text-xs font-black flex items-center gap-3 text-slate-400 uppercase tracking-[0.3em] font-sans font-black">05. Client Praise</h2><button onClick={addReview} className="text-[10px] bg-slate-950 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest shadow-md font-sans font-black font-sans"><Plus size={14} /> Add Review</button></div>
              <div className="grid md:grid-cols-2 gap-6 font-sans">
                {proposalData.reviews?.map((review) => (
                  <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 relative group font-sans">
                    <button onClick={() => removeReview(review.id)} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity font-sans font-black"><Trash size={16} /></button>
                    <div className="space-y-5 font-sans font-black">
                      <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">Couple Name</label><input type="text" value={review.author} onChange={(e) => updateReview(review.id, 'author', e.target.value)} className="w-full p-3 border-b border-slate-100 font-bold outline-none focus:border-slate-400 transition-all font-serif text-slate-900 leading-none" /></div>
                      <div className="flex flex-col gap-2 font-sans font-black"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">Review</label><textarea rows="3" value={review.text} onChange={(e) => updateReview(review.id, 'text', e.target.value)} className="w-full p-3 bg-slate-50/50 rounded-xl text-sm italic outline-none resize-none font-sans" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === 'preview' && (
        <div className="min-h-screen font-serif text-[#121212] bg-white relative selection:bg-[#C5A059]/20 font-sans leading-relaxed">
          {isExpired ? (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6 font-sans font-black"><div className="max-w-md w-full bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl text-center border border-slate-100 font-sans font-black"><div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-10 font-sans font-black"><AlertCircle size={40} strokeWidth={1} className="font-sans font-black" /></div><h1 className="text-3xl font-light mb-6 text-slate-950 tracking-tight leading-none font-serif font-black">Proposal Expired</h1><p className="text-slate-500 mb-10 font-medium leading-relaxed font-sans font-black">This proposal for <span className="text-slate-950 font-black font-sans font-black">{proposalData.clientName}</span> has expired.</p><button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} just expired.`)} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] font-sans font-black">Contact Studio <ArrowLeft className="rotate-180" size={16} /></button></div></div>
          ) : (
            <div className="font-sans">
              <div className="relative h-[80vh] md:h-screen flex items-center justify-center overflow-hidden bg-[#0d0d0d]">
                <div className="absolute inset-0 opacity-60 font-sans"><img src={proposalData.heroImage} className="w-full h-full object-cover transform scale-105" alt="Hero" /></div>
                <div className="relative z-10 text-center text-white px-8 font-sans">
                  <img src={LOGO_URL} alt="The Spark Studios" className="mx-auto h-12 md:h-20 mb-10 object-contain drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] font-sans" />
                  <h1 className="text-5xl md:text-[8rem] lg:text-[10rem] mb-12 tracking-tighter font-serif leading-none">{proposalData.clientName}</h1>
                  <div className="max-w-lg mx-auto border-t border-white/20 pt-12 font-sans font-black"><p className="text-sm md:text-xl font-light tracking-[0.2em] uppercase opacity-90 font-sans font-black">Bespoke Cinematic Narrative</p></div>
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce opacity-40 font-sans font-black"><div className="w-[1px] h-20 bg-white"></div></div>
              </div>

              <section className="max-w-5xl mx-auto py-40 md:py-64 px-8 text-center leading-relaxed">
                <h2 className="text-[11px] tracking-[0.6em] uppercase text-[#C5A059] font-sans font-black mb-16 md:mb-24">The Vision</h2>
                <p className="text-3xl md:text-5xl lg:text-6xl leading-[1.4] text-[#222222] font-light italic px-4 font-serif">"{proposalData.visionStatement}"</p>
              </section>

              <section className="max-w-6xl mx-auto pb-40 md:pb-64 px-8 font-sans">
                <div className="relative aspect-video bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden group shadow-inner font-sans">
                  {proposalData.loomUrl ? (
                    <iframe title="Loom" src={proposalData.loomUrl} frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowFullScreen className="w-full h-full"></iframe>
                  ) : (
                    <div className="font-sans p-10 text-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-[#C5A059]"><Play size={32} fill="currentColor" strokeWidth={0} /></div>
                      <h4 className="text-2xl font-light mb-4 tracking-tight text-slate-900 italic font-serif">Personal Message</h4>
                      <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-sans">Cinematic Intro Coming Soon</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-[#fcfcfb] py-32 md:py-48 px-8 border-y border-slate-100 leading-normal font-sans">
                <div className="max-w-7xl mx-auto font-sans">
                  <div className="text-center mb-24 md:mb-32 font-serif font-black">
                    <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight text-slate-950 leading-none">The Itinerary</h2>
                    <p className="text-[11px] font-sans font-black text-slate-400 tracking-[0.5em] uppercase font-sans font-black">Documenting the Journey</p>
                  </div>
                  <div className="grid gap-8 md:grid-cols-4 font-sans">
                    {proposalData.days.map((day) => (
                      <div key={day.id} className={`relative p-8 md:p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 ${day.highlight ? 'ring-1 ring-[#C5A059]/30' : ''}`}>
                        <div className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] mb-12 ${day.highlight ? 'bg-[#C5A059] text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{IconMap[day.icon] || <Clock size={28} />}</div>
                        <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-[#C5A059] mb-4 font-sans font-black">{day.label}</h4>
                        <p className="text-[#121212] text-[14px] font-black mb-4 tracking-widest uppercase font-sans font-black">{day.date}</p>
                        <p className={`text-xl md:text-2xl font-serif italic font-medium leading-relaxed`}>{day.desc}</p>
                        {day.highlight && <div className="mt-12 pt-12 border-t border-slate-50 font-black font-sans text-[11px] text-slate-800 tracking-widest uppercase">Continuous Production Unit</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="max-w-[1440px] mx-auto py-40 md:py-64 px-8 leading-normal font-serif">
                <div className="text-center mb-32 md:mb-48 font-serif font-black">
                  <h2 className="text-5xl md:text-8xl font-light mb-10 text-slate-950 tracking-tighter leading-none font-serif">The Collections</h2>
                  <div className="flex items-center justify-center gap-10 text-[11px] font-sans font-black text-slate-400 tracking-[0.6em] uppercase leading-none font-black font-sans"><div className="h-[1px] w-12 bg-slate-200"></div>Curated Investment<div className="h-[1px] w-12 bg-slate-200"></div></div>
                </div>
                <div className={`grid gap-8 md:gap-12 items-stretch justify-center font-sans ${proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-2xl mx-auto' : 'lg:grid-cols-3'}`}>
                  {proposalData.packages.filter(p => p.isVisible).map((item) => (
                    <div key={item.id} className={`relative flex flex-col p-10 md:p-14 rounded-[3.5rem] border transition-all duration-1000 ${item.isHighlighted ? 'bg-white border-[#C5A059]/40 lg:scale-105 z-10 shadow-2xl' : 'bg-white border-slate-100'}`}>
                      {item.isHighlighted && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#C5A059] text-white px-12 py-3.5 rounded-full text-[10px] font-black tracking-[0.5em] shadow-xl uppercase font-sans font-black">Recommended</div>}
                      <div className="mb-14 md:mb-16"><h3 className="text-3xl md:text-4xl font-light mb-6 tracking-tight text-slate-950 font-serif leading-none">{item.name}</h3><div className="text-6xl md:text-8xl font-serif mb-10 text-slate-950 tracking-tighter leading-none">{item.price}</div><p className="text-base md:text-lg text-slate-500 leading-relaxed italic font-medium pr-4 font-serif">{item.description}</p></div>
                      <div className="flex-grow space-y-7 md:space-y-8 mb-16 border-t border-slate-50 pt-16 font-sans">
                        {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-5 font-sans font-black"><div className={`mt-1.5 flex-shrink-0 ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-300'}`}><CheckCircle size={20} strokeWidth={1.5} /></div><span className="text-base md:text-lg text-[#333333] leading-snug tracking-tight font-medium font-sans font-black">{feature}</span></div>
                        ))}
                      </div>
                      <button onClick={() => openWhatsApp(`Hi! I'd like to book the ${item.name} Story.`)} className="w-full py-7 rounded-[2rem] font-black text-[11px] tracking-[0.4em] uppercase shadow-xl bg-[#121212] text-white hover:bg-[#C5A059] font-sans font-black">Inquire Selection <MessageCircle size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* The Process */}
              <section className="max-w-6xl mx-auto py-32 md:py-48 px-8 font-sans">
                <div className="text-center mb-24 font-serif font-black">
                  <h2 className="text-4xl md:text-6xl font-light mb-8 leading-none">The Process</h2>
                  <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">A Sequence of Excellence</p>
                </div>
                <div className="grid md:grid-cols-3 gap-12 relative font-sans">
                  {[
                    { step: "01", title: "Vision Call", desc: "A creative session to align on the artistic direction.", icon: <MessageCircle /> },
                    { step: "02", title: "Confirmation", desc: "A retainer and signed agreement secure your dates.", icon: <Award /> },
                    { step: "03", title: "Final Design", desc: "Timelines and reference reviews prior to shooting.", icon: <Map /> }
                  ].map((item, idx) => (
                    <div key={idx} className="relative z-10 text-center flex flex-col items-center group font-sans">
                      <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-8 shadow-xl text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-white transition-all duration-500">{item.icon}</div>
                      <span className="text-[10px] font-black text-[#C5A059] mb-4 uppercase tracking-[0.4em] font-sans">{item.step}</span>
                      <h4 className="text-2xl font-serif italic mb-4 text-slate-950 leading-none">{item.title}</h4>
                      <p className="text-sm leading-relaxed text-slate-500 font-medium px-4">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Curated Work */}
              {proposalData.workLinks && proposalData.workLinks.length > 0 && (
                <section className="bg-slate-950 py-32 md:py-48 px-8 font-sans">
                  <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-20 font-serif font-black">
                      <h2 className="text-3xl md:text-5xl italic text-white mb-8 leading-none">Selected Stories</h2>
                      <p className="text-[11px] font-black text-slate-500 tracking-[0.4em] uppercase">Recommended Viewing</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-8 font-sans">
                      {proposalData.workLinks.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/10 transition-all duration-500 font-sans font-black">
                          <div className="font-black">
                            <h4 className="text-white font-bold text-lg mb-2 font-serif tracking-tight leading-none">{link.title}</h4>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-slate-400 text-[10px] tracking-widest uppercase font-black leading-none">Launch Gallery</span>
                                {link.note && <div className="flex items-center gap-1.5 bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest leading-none font-sans font-black"><LockKeyhole size={10} /> {link.note}</div>}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center group-hover:bg-[#C5A059] group-hover:scale-110 transition-all duration-500 shrink-0"><LinkIcon size={18} /></div>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Luxury FAQs */}
              <section className="max-w-4xl mx-auto py-32 md:py-56 px-8 font-sans">
                <div className="text-center mb-24 font-serif font-sans"><h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-slate-950 leading-none">The Fine Print</h2><p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-sans font-black">Studio Commitment</p></div>
                <div className="space-y-12 font-sans font-black">
                  {[
                    { q: "The Aerial Perspective", a: "Drones are essential to high-end cinema. We include drone coverage in every collection at no additional cost." },
                    { q: "The Technical Safeguard", a: "Your memories are irreplaceable. Our studio utilizes a triple-safeguard protocol with redundant cloud backups." },
                    { q: "Delivery Timeline", a: "Full deliveries are completed within 3 to 6 months. High-resolution teasers are prioritized." },
                    { q: "Booking & Retainer", a: "A 30% retainer and signed agreement are required to lock your window in our exclusive studio calendar." }
                  ].map((faq, idx) => (
                    <div key={idx} className="group border-b border-slate-100 pb-12 last:border-0 font-sans"><div className="flex gap-8 items-start font-sans font-sans"><div className="w-12 h-12 rounded-2xl bg-slate-50 text-[#C5A059] flex items-center justify-center shrink-0 font-sans font-black font-sans"><HelpCircle size={20} /></div><div className="font-sans font-sans font-sans"><h4 className="text-xl font-bold text-slate-950 mb-4 font-serif leading-none">{faq.q}</h4><p className="text-slate-600 leading-relaxed font-medium font-sans font-sans">{faq.a}</p></div></div></div>
                  ))}
                </div>
              </section>

              {/* Kind Words */}
              <section className="bg-[#fafaf9] py-32 md:py-48 px-8 border-y border-slate-100 font-sans font-sans">
                <div className="max-w-6xl mx-auto"><div className="text-center mb-24 md:mb-32 font-serif font-black font-sans"><h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-slate-950 leading-none font-serif">Kind Words</h2><div className="flex items-center justify-center gap-2 mb-4">{[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C5A059" className="text-[#C5A059]" />)}</div><p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-sans font-black">Trusted by Spark Couples</p></div><div className="grid md:grid-cols-2 gap-10 md:gap-14 font-sans font-black">
                  {proposalData.reviews.map((review) => (
                    <div key={review.id} className="relative p-12 md:p-16 bg-white rounded-[3rem] border border-slate-50 shadow-sm group font-sans font-black leading-relaxed font-sans font-sans"><Quote className="absolute top-10 left-10 text-slate-50 group-hover:text-slate-100 transition-colors font-sans font-black" size={80} strokeWidth={0.5} /><div className="relative z-10 font-sans font-sans font-sans leading-relaxed"><p className="text-lg md:text-xl text-[#333333] leading-[1.8] italic font-medium mb-10 font-serif font-serif">"{review.text}"</p><div className="flex items-center gap-4 border-t border-slate-50 pt-8 font-black font-sans"><div className="h-1px w-12 bg-[#C5A059]"></div><p className="font-black text-[12px] uppercase tracking-[0.3em] text-[#C5A059] font-sans font-black leading-none font-sans font-sans">{review.author}</p></div></div></div>
                  ))}
                </div></div>
              </section>

              {/* Footer */}
              <footer className="bg-[#0a0a0a] text-white py-40 md:py-64 px-8 overflow-hidden relative font-sans font-sans">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] font-sans font-black font-sans"></div>
                <div className="max-w-6xl mx-auto relative z-10 font-sans leading-relaxed font-sans font-black font-sans font-sans">
                  <div className="grid md:grid-cols-2 gap-24 md:gap-48 items-center font-sans font-sans">
                    <div className="text-left leading-relaxed">
                      <h3 className="text-5xl md:text-8xl mb-12 italic leading-none text-white font-serif">Your Legacy<br/>Starts Here.</h3>
                      <div className="space-y-16 font-sans">
                        <div className="flex gap-8 font-sans font-sans">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-sans font-black font-sans font-sans font-sans"><Clock size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div className="font-sans font-black font-sans font-sans"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059] font-sans">Duration</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight">Active for 30 days — Valid until {new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}</p></div>
                        </div>
                        <div className="flex gap-8 font-sans font-black font-sans font-sans">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-sans font-black font-sans font-black font-sans"><Award size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div className="font-sans font-black font-black font-black font-sans"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059] font-sans font-sans font-sans">Contract</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight">A signed agreement formalizes all investment details.</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-slate-950 p-12 md:p-24 rounded-[4rem] md:rounded-[6rem] shadow-2xl relative group overflow-hidden font-sans font-black font-sans font-sans">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-bl-[10rem] transition-transform duration-[2s] group-hover:scale-125 font-sans"></div>
                      <h4 className="text-4xl md:text-6xl font-serif mb-10 italic leading-none">Vision Call</h4>
                      <p className="text-slate-600 mb-16 text-lg md:text-2xl leading-relaxed font-medium pr-4 font-sans font-black">To ensure our artistic styles align, we invite you to a brief introductory session.</p>
                      <button onClick={() => openWhatsApp(`Hi Spark Studios! We'd like to schedule a Vision Call for the ${proposalData.clientName} celebration.`)} className="w-full bg-[#C5A059] text-white py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.5em] shadow-2xl hover:bg-slate-950 transition-all active:scale-95 flex items-center justify-center gap-4 font-sans font-black">Connect on WhatsApp <MessageCircle size={20} /></button>
                    </div>
                  </div>
                  <div className="mt-48 md:mt-64 pt-20 border-t border-white/10 text-center font-black font-sans font-sans font-sans font-sans"><p className="text-[11px] uppercase tracking-[1em] opacity-40 font-sans font-black font-sans font-black font-sans font-sans">The Spark Studios &copy; 2026</p></div>
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