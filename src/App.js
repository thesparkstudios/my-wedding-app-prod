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
  LockKeyhole, Sparkles, Youtube, RefreshCw, Power, ExternalLink
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
  const isDirectClientLink = window.location.hash.startsWith('#/quote/');
  
  const [view, setView] = useState(isDirectClientLink ? 'preview' : 'dashboard'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false); 
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [fbError, setFbError] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(isDirectClientLink); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoStarted, setVideoStarted] = useState(false);

  const initialProposalState = {
    isActive: true, // Added for disabling quotes
    clientName: "Ayushi & Family",
    visionStatement: "To craft a cinematic narrative that encapsulates the vibrant tapestry of your wedding celebrations, weaving together the intimate moments, cultural richness, and joyous festivities into a timeless visual heirloom that resonates with love, tradition, and the unique spirit of her family.",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    loomUrl: "", 
    showVideoInvite: true, // Control for video invite text
    videoInviteText: "Hey Ayushi, watch this first", // Custom invite text
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
        description: "For couples who want their day beautifully documented — every moment captured with care, delivered with artisan quality.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "1 Professional Lead Photographer (single camera)",
          "1 Professional Lead Videographer (single camera)",
          "2-4 Minutes Combined Highlight Film",
          "Full-Length Edited Documentary",
          "600-800 Professionally Edited Photos",
          "Online Digital Gallery",
          "Pre-event location photoshoot — not included"
        ]
      },
      {
        id: 2,
        name: "Signature",
        price: "$11,550",
        description: "Our most sought-after experience — cinematic storytelling across multiple angles, aerial perspectives, and a complimentary pre-event photoshoot woven into your film. This is where memories become art.",
        isVisible: true,
        isHighlighted: true,
        features: [
          "1 Professional Lead Photographer (2 Cameras / More Coverage)",
          "1 Professional Lead Videographer (with Multiple camera angles)",
          "Cinematic Highlight Film (each day)",
          "Full-Length Edited Documentary (each day)",
          "Unlimited Professionally Edited Photos"
          "Aerial Drone Cinematography"
          "Online Digital Gallery"
          "Complimentary photoshoot prior to the event date"
        ]
      },
      {
        id: 3,
        name: "Legacy",
        price: "$13,950",
        description: "For couples who want absolutely everything — an expanded production team, guaranteed delivery timelines, exclusive extras, and a level of detail that leaves nothing to chance. The complete Spark Studios experience.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "Everything in Signature",
          "Expanded Production Team (5 hours of second team)",
          "Guaranteed 6-Week Digital Delivery",
          "Instagram Cinematic Teasers",
          "Raw photos within 24 hours",
          "Expanded 2 hour E-shoot with photo and video",          
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

  const buildFreshProposalState = (overrides = {}) => {
    const now = Date.now();
    const base = JSON.parse(JSON.stringify(initialProposalState));

    return {
      ...base,
      ...overrides,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      views: overrides.views ?? 0,
      lastViewedAt: overrides.lastViewedAt ?? null,
      days: (overrides.days || base.days).map((day, index) => ({ ...day, id: now + index + 1 })),
      packages: (overrides.packages || base.packages).map((pkg, index) => ({ ...pkg, id: now + 100 + index, features: [...pkg.features] })),
      reviews: (overrides.reviews || base.reviews).map((review, index) => ({ ...review, id: now + 200 + index })),
      workLinks: (overrides.workLinks || base.workLinks).map((link, index) => ({ ...link, id: now + 300 + index }))
    };
  };

  const [proposalData, setProposalData] = useState(() => buildFreshProposalState());

  useEffect(() => {
    if (view === 'preview' && proposalData.clientName) {
      document.title = `The Spark Studios | Proposal for ${proposalData.clientName}`;
    } else if (view === 'editor') {
      document.title = `Editor | ${proposalData.clientName}`;
    } else {
      document.title = "Spark Portal | Dashboard";
    }
  }, [view, proposalData.clientName]);

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
        if (view === 'editor' && currentQuoteId === id) return;

        setCurrentQuoteId(id);
        if (!user) return; 
        try {
          const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check if quote is disabled
            if (data.isActive === false && !isAdmin) {
              setNotFound(true);
              setIsUnlocked(true);
              setView('preview');
              return;
            }

            setProposalData(data);
            setNotFound(false); 
            const created = data.createdAt || Date.now();
            setIsExpired(Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000));
            if (!isAdmin) {
              await updateDoc(docRef, { views: increment(1), lastViewedAt: Date.now() });
            }
            setIsUnlocked(true);
            setView('preview');
          } else {
            setNotFound(true); 
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

  useEffect(() => {
    if (!user || !isAdmin || view === 'preview') return;
    const q = collection(db, 'artifacts', finalAppId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
    }, (err) => { setFbError("Rules denied."); });
    return () => unsubscribe();
  }, [user, isAdmin, view]);

  const toggleQuoteActive = async (quoteId, currentStatus) => {
    try {
      const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', quoteId);
      await updateDoc(docRef, { isActive: !currentStatus });
    } catch (err) {
      setFbError("Update failed.");
    }
  };

  const resetExpiry = async (quoteId) => {
    try {
      const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', quoteId);
      const newCreatedAt = Date.now();
      await updateDoc(docRef, { createdAt: newCreatedAt, isActive: true });
      // If we're currently previewing this quote, update local state too
      if (currentQuoteId === quoteId) {
        setProposalData(prev => ({ ...prev, createdAt: newCreatedAt, isActive: true }));
        setIsExpired(false);
      }
    } catch (err) {
      setFbError("Expiry reset failed.");
    }
  };

  const slugify = (value = '') => {
    const slug = value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\(copy(?:\s+\d+)?\)/gi, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'quote';
  };

  const generateUniqueQuoteId = (name, excludedId = null) => {
    const existingIds = new Set(savedQuotes.map((quote) => quote.id).filter((id) => id && id !== excludedId));
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let counter = 2;

    while (existingIds.has(candidate)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  };

  const generateDuplicateClientName = (name = 'Untitled Proposal') => {
    const trimmedName = name.trim() || 'Untitled Proposal';
    const match = trimmedName.match(/^(.*?)(?:\s+\(Copy(?:\s+(\d+))?\))$/i);

    if (!match) return `${trimmedName} (Copy)`;

    const rootName = match[1].trim();
    const nextNumber = match[2] ? Number(match[2]) + 1 : 2;
    return `${rootName} (Copy ${nextNumber})`;
  };

  const getQuoteStatus = (quote) => {
    if (quote.isActive === false) {
      return { label: 'Inactive', className: 'bg-slate-200 text-slate-500 border border-slate-300' };
    }
    
    const created = quote.createdAt || 0;
    const updated = quote.updatedAt || created;
    const expiryTime = created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    if (created && Date.now() > expiryTime) {
      return { label: 'Expired', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
    }

    if ((quote.views || 0) > 0 || quote.lastViewedAt) {
      return { label: 'Viewed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    }

    if (Date.now() - updated > (10 * 60 * 1000)) {
      return { label: 'Sent', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
    }

    return { label: 'Draft', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '—';

    return new Date(timestamp).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const saveQuote = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    const id = currentQuoteId || generateUniqueQuoteId(proposalData.clientName);
    try {
      const docRef = doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', id);
      const payload = {
        ...proposalData,
        id,
        updatedAt: Date.now(),
        createdAt: proposalData.createdAt || Date.now(),
        views: proposalData.views || 0,
        lastViewedAt: proposalData.lastViewedAt || null
      };
      await setDoc(docRef, payload);
      setCurrentQuoteId(id);
      setProposalData(payload);
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

      if (currentQuoteId === id) {
        window.location.hash = '';
        setCurrentQuoteId(null);
        setProposalData(buildFreshProposalState());
        setIsExpired(false);
        setNotFound(false);
        setView('dashboard');
      }

      setDeletingId(null);
      setFbError(null);
    } catch (err) {
      setFbError("Delete failed.");
    }
  };

  const handleDuplicate = async (quote) => {
    if (!auth.currentUser) return;

    try {
      const duplicateClientName = generateDuplicateClientName(quote.clientName || 'Untitled Proposal');
      const duplicateId = generateUniqueQuoteId(duplicateClientName, quote.id);
      const duplicatedQuote = buildFreshProposalState({
        ...quote,
        id: duplicateId,
        clientName: duplicateClientName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0,
        lastViewedAt: null
      });

      await setDoc(doc(db, 'artifacts', finalAppId, 'public', 'data', 'quotes', duplicateId), duplicatedQuote);
      setProposalData(duplicatedQuote);
      setCurrentQuoteId(duplicateId);
      setIsExpired(false);
      setNotFound(false);
      setFbError(null);
      window.location.hash = '';
      setView('editor');
    } catch (err) {
      setFbError('Duplicate failed.');
    }
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

  const filteredQuotes = savedQuotes
    .filter((quote) => (quote.clientName || '').toLowerCase().includes(searchTerm.toLowerCase().trim()))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const updateField = (f, v) => setProposalData(prev => ({ ...prev, [f]: v }));
  const updateDay = (id, f, v) => setProposalData(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? { ...d, [f]: v } : d) }));
  const addDay = () => setProposalData(prev => ({ ...prev, days: [...prev.days, { id: Date.now(), label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }] }));
  const removeDay = (id) => setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  const updatePackage = (id, f, v) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, [f]: v } : p) }));
  const updatePackageFeatures = (id, arr) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, features: arr } : p) }));
  const updateWorkLink = (id, f, v) => setProposalData(prev => ({ ...prev, workLinks: prev.workLinks.map(l => l.id === id ? { ...l, [f]: v } : l) }));
  const updateReview = (id, f, v) => setProposalData(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === id ? { ...r, [f]: v } : r) }));

  const createNew = () => {
    window.location.hash = '';
    setCurrentQuoteId(null);
    setProposalData(buildFreshProposalState());
    setIsExpired(false);
    setNotFound(false);
    setFbError(null);
    setView('editor');
  };

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
          <input 
            type="password" 
            placeholder="KEY CODE" 
            className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl mb-6 text-center outline-none focus:ring-1 focus:ring-slate-300 font-sans font-black tracking-[0.4em]" 
            value={passInput} 
            onChange={(e) => setPassInput(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePortalLogin();
              }
            }} 
          />
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
        
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(197, 160, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0); }
        }
        .animate-pulse-gold {
          animation: pulse-gold 2s infinite;
        }
      `}</style>

      {fbError && view !== 'preview' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 font-sans font-black">
          <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3"><XCircle size={18} /> {fbError}</div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto py-16 px-6 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-light text-slate-950 tracking-tight leading-none font-serif mb-4">Proposals</h1>
              <p className="text-slate-500 font-black tracking-widest uppercase text-[11px]">Lead Intelligence Dashboard</p>
            </div>
            <button onClick={createNew} className="bg-slate-950 text-white px-10 py-5 rounded-full flex items-center gap-3 shadow-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition active:scale-95"><Plus size={16} /> New Entry</button>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-5 md:p-6 mb-10 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.35em] mb-2">Search Portal</p>
                <h2 className="text-2xl text-slate-900 font-serif leading-none">Find a client quote fast</h2>
              </div>
              <div className="w-full md:max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by client name"
                  className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 text-sm font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className={`grid gap-6 ${filteredQuotes.length <= 2 ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {filteredQuotes.map((quote) => {
              const status = getQuoteStatus(quote);
              return (
                <div key={quote.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:shadow-xl transition-all duration-500 gap-6">
                  <div className="flex items-start gap-6 font-sans">
                    <div className="p-4 rounded-3xl bg-slate-50 text-slate-900 shadow-sm">
                      <Calendar size={28} strokeWidth={1.2} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="font-bold text-slate-900 text-2xl tracking-tight font-serif leading-none">{quote.clientName}</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-black ${status.className}`}>{status.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans"><Eye size={14} className="text-slate-300" /> {quote.views || 0} Views</div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans"><Clock size={14} className="text-slate-300" /> Seen: {getTimeAgo(quote.lastViewedAt)}</div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans"><RefreshCw size={14} className="text-slate-300" /> Updated: {formatDateTime(quote.updatedAt || quote.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto font-black font-sans">
                    {/* ACTIVE/INACTIVE TOGGLE */}
                    <button 
                      onClick={() => toggleQuoteActive(quote.id, quote.isActive !== false)}
                      className={`flex-1 md:flex-none p-4 rounded-2xl transition flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest ${quote.isActive !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                      title={quote.isActive !== false ? "Click to Disable" : "Click to Enable"}
                    >
                      <Power size={14} /> {quote.isActive !== false ? 'Live' : 'Off'}
                    </button>

                    {/* EXTEND EXPIRY — only shown for expired quotes */}
                    {status.label === 'Expired' && (
                      <button
                        onClick={() => resetExpiry(quote.id)}
                        className="flex-1 md:flex-none p-4 rounded-2xl transition flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        title="Reset expiry date to today (extends 30 more days)"
                      >
                        <RefreshCw size={14} /> Extend
                      </button>
                    )}

                    <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = ''; setView('editor'); }} className="flex-1 px-8 py-4 bg-slate-50 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-100 transition">Edit</button>
                    <button onClick={() => handleDuplicate(quote)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-200 transition flex items-center justify-center gap-2"><Copy size={14} /> Duplicate</button>
                    
                    {/* OPEN IN NEW TAB */}
                    <button 
                      onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/quote/${quote.id}`, '_blank')} 
                      className="flex-1 px-8 py-4 bg-slate-950 text-white rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      Preview <ExternalLink size={14} />
                    </button>

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
              );
            })}
          </div>

          {filteredQuotes.length === 0 && (
            <div className="mt-8 bg-white border border-dashed border-slate-200 rounded-[2rem] p-10 text-center text-slate-500 font-semibold">
              No quotes matched that client name.
            </div>
          )}
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
              {currentQuoteId && <button onClick={() => handleDuplicate(proposalData)} className="flex-1 px-10 py-5 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] shadow-xl font-sans font-black"><Copy size={16} /> Duplicate</button>}
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
                
                {/* VIDEO INVITE SETTINGS */}
                <div className="flex flex-col gap-2 mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Video Invite Text</label>
                        <button 
                            onClick={() => updateField('showVideoInvite', !proposalData.showVideoInvite)}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${proposalData.showVideoInvite ? 'bg-[#C5A059] text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {proposalData.showVideoInvite ? 'Enabled' : 'Disabled'}
                        </button>
                    </div>
                    <input 
                        type="text" 
                        disabled={!proposalData.showVideoInvite}
                        value={proposalData.videoInviteText} 
                        onChange={(e) => updateField('videoInviteText', e.target.value)} 
                        className={`p-4 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${!proposalData.showVideoInvite ? 'opacity-50 grayscale' : 'bg-white'}`} 
                        placeholder="e.g. Hey Ayushi, watch this first"
                    />
                </div>

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
          {notFound ? (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6 font-sans">
              <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-slate-100">
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-10"><XCircle size={40} strokeWidth={1} /></div>
                <h1 className="text-3xl font-light mb-6 text-slate-950 font-serif">Proposal Not Found</h1>
                <p className="text-slate-500 mb-10 font-medium">The proposal you are looking for has been removed or the link is incorrect.</p>
                <button onClick={() => { window.location.hash = ''; setView('dashboard'); }} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest font-sans">Return to Portal</button>
              </div>
            </div>
          ) : isExpired ? (
            <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-6 font-black font-sans font-black">
              <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-slate-100 font-black">
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-10"><AlertCircle size={40} strokeWidth={1} /></div>
                <h1 className="text-3xl font-light mb-6 text-slate-950 font-serif font-black font-black font-black">Proposal Expired</h1>
                <p className="text-slate-500 mb-10 font-medium font-black font-black font-black font-black font-black">This proposal for <span className="text-slate-950 font-black font-sans font-black font-black font-black font-black">{proposalData.clientName}</span> is inactive.</p>
                {isAdmin && currentQuoteId ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => resetExpiry(currentQuoteId)}
                      className="w-full bg-amber-500 text-white py-6 rounded-2xl font-bold hover:bg-amber-600 transition shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                      <RefreshCw size={16} /> Extend 30 Days
                    </button>
                    <button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} expired.`)} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest font-black font-black">Contact Studio</button>
                  </div>
                ) : (
                  <button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} expired.`)} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-bold hover:opacity-90 transition shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-widest font-black font-black">Contact Studio</button>
                )}
              </div>
            </div>
          ) : (
            <div className="font-sans">
              <div className="relative h-[80vh] md:h-screen flex items-center justify-center overflow-hidden bg-[#0d0d0d]">
                <div className="absolute inset-0 opacity-60"><img src={proposalData.heroImage} className="w-full h-full object-cover transform scale-105" alt="Hero" /></div>
                <div className="relative z-10 text-center text-white px-8">
                  <img src={LOGO_URL} alt="Spark" className="mx-auto h-12 md:h-20 mb-10 object-contain drop-shadow-xl" />
                  <h1 className="text-6xl md:text-[8rem] lg:text-[10rem] mb-12 font-serif font-light italic leading-none">{proposalData.clientName}</h1>
                  <div className="max-w-lg mx-auto border-t border-white/20 pt-12"><p className="text-sm md:text-xl font-light tracking-[0.2em] uppercase opacity-90 font-black">Bespoke Cinematic Narrative</p></div>
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce opacity-40"><div className="w-[1px] h-20 bg-white"></div></div>
              </div>

              <section className="max-w-5xl mx-auto py-24 md:py-32 px-8 text-center leading-relaxed">
                <h2 className="text-[11px] tracking-[0.6em] uppercase text-[#C5A059] font-black mb-10 md:mb-16">The Vision</h2>
                <p className="text-3xl md:text-5xl lg:text-6xl text-[#222222] font-light italic font-serif leading-[1.3]">"{proposalData.visionStatement}"</p>
              </section>

              {/* ENHANCED LOOM SECTION */}
              <section className="max-w-6xl mx-auto pb-24 md:pb-32 px-8">
                <div className="relative aspect-video bg-slate-900 rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl group cursor-pointer transition-all duration-500 hover:scale-[1.01]">
                   {(!videoStarted && proposalData.loomUrl) ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8 bg-black/40 backdrop-blur-[2px]" onClick={() => setVideoStarted(true)}>
                        <div className="absolute top-8 left-8 flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <Sparkles size={14} className="text-[#C5A059]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Personal Video Guide</span>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#C5A059]/30 rounded-full blur-2xl group-hover:bg-[#C5A059]/50 transition-all"></div>
                            <button className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110 animate-pulse-gold">
                                <Play size={40} fill="#121212" strokeWidth={0} className="ml-2" />
                            </button>
                        </div>
                        
                        <div className="mt-10 max-w-sm">
                            <h4 className="text-2xl md:text-4xl text-white font-serif italic mb-4 leading-tight">A short message for {proposalData.clientName.split('&')[0]}</h4>
                            <p className="text-[10px] text-white/70 font-black tracking-[0.4em] uppercase leading-relaxed">Waqar walks you through your custom vision</p>
                        </div>
                    </div>
                  ) : proposalData.loomUrl ? (
                    <iframe title="Loom" src={proposalData.loomUrl.replace("loom.com/share", "loom.com/embed") + "?autoplay=1"} frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowFullScreen className="w-full h-full"></iframe>
                  ) : (
                    <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-[#C5A059]"><Play size={32} fill="currentColor" strokeWidth={0} /></div>
                      <h4 className="text-2xl font-light mb-4 text-slate-900 font-serif leading-none">Personal Message</h4>
                      <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">Cinematic Intro Coming Soon</p>
                    </div>
                  )}
                  {/* Decorative Background for the Video Cover */}
                  {!videoStarted && <img src={proposalData.heroImage} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale-[40%]" alt="Video Cover" />}
                </div>

                {/* DYNAMIC VIDEO INVITE TEXT */}
                {proposalData.showVideoInvite && proposalData.videoInviteText && (
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                        <p className="text-xl md:text-2xl font-serif italic text-slate-800 tracking-tight">
                            {proposalData.videoInviteText}
                        </p>
                        <div className="w-12 h-[1px] bg-[#C5A059]/30 mx-auto mt-4"></div>
                    </div>
                )}
              </section>

              <section className="bg-[#fcfcfb] py-24 md:py-32 px-8 border-y border-slate-100 leading-normal">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16 md:mb-24">
                    <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight text-slate-950 leading-none italic font-serif">The Itinerary</h2>
                    <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">Documenting the Journey</p>
                  </div>
                  <div className={`flex flex-wrap ${proposalData.days.length === 1 ? 'justify-center' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-8`}>
                    {proposalData.days.map((day) => (
                      <div key={day.id} className={`relative p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 ${day.highlight ? 'ring-1 ring-[#C5A059]/30' : ''} ${proposalData.days.length === 1 ? 'max-w-md w-full' : ''}`}>
                        <div className={`w-16 h-16 flex items-center justify-center rounded-3xl mb-12 ${day.highlight ? 'bg-[#C5A059] text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{IconMap[day.icon] || <Clock size={28} />}</div>
                        <h4 className="font-black text-[15px] uppercase tracking-[0.4em] text-[#C5A059] mb-4">{day.label}</h4>
                        <p className="text-[#121212] text-[18px] font-black mb-4 tracking-widest uppercase">{day.date}</p>
                        <p className={`text-2xl md:text-3xl font-serif italic font-medium leading-relaxed`}>{day.desc}</p>
                        {day.highlight && <div className="mt-12 pt-12 border-t border-slate-50 font-black text-[11px] text-slate-800 tracking-widest uppercase leading-none">Continuous Production Team</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="max-w-[1440px] mx-auto py-24 md:py-32 px-8">
                <div className="text-center mb-24 md:mb-32">
                  <h2 className="text-5xl md:text-8xl font-light mb-10 text-slate-950 tracking-tighter leading-none italic font-serif">The Collections</h2>
                  <div className="flex items-center justify-center gap-10 text-[11px] font-black text-slate-400 tracking-[0.6em] uppercase leading-none"><div className="h-[1px] w-12 bg-slate-200"></div>Curated Investment<div className="h-[1px] w-12 bg-slate-200"></div></div>
                </div>
                <div className={`grid gap-10 items-stretch justify-center font-black ${
                  proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-2xl mx-auto grid-cols-1' : 
                  proposalData.packages.filter(p => p.isVisible).length === 2 ? 'max-w-5xl mx-auto grid-cols-1 md:grid-cols-2' : 
                  'lg:grid-cols-3 max-w-full'
                }`}>
                  {proposalData.packages.filter(p => p.isVisible).map((item) => (
                    <div key={item.id} className={`relative flex flex-col p-10 md:p-12 rounded-[4rem] border transition-all duration-1000 ${item.isHighlighted ? 'bg-white border-[#C5A059]/40 lg:scale-105 z-10 shadow-2xl' : 'bg-white border-slate-100'}`}>
                      {item.isHighlighted && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#C5A059] text-white px-12 py-3 rounded-full text-[10px] font-black tracking-[0.5em] shadow-xl uppercase">Recommended</div>}
                      <div className="mb-14">
                        <h3 className="text-3xl md:text-4xl font-light mb-6 text-slate-950 font-serif leading-none italic">{item.name} Story</h3>
                        <div className="text-6xl md:text-8xl font-serif mb-10 text-slate-950 tracking-tighter font-black leading-none">{item.price}</div>
                        <p className="text-base md:text-lg text-slate-500 leading-relaxed italic font-serif font-medium">{item.description}</p>
                      </div>
                      <div className="flex-grow space-y-7 mb-16 border-t border-slate-50 pt-16 font-black">
                        {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-5 font-black">
                            <div className={`mt-1.5 flex-shrink-0 ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-300'}`}><CheckCircle size={22} strokeWidth={1.5} /></div>
                            <span className="text-base md:text-lg text-[#333333] tracking-tight font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => openWhatsApp(`Hi Waqar! I'd like to book the ${item.name} Story.`)} className="w-full py-8 rounded-[2.5rem] font-black text-[11px] tracking-[0.5em] uppercase shadow-xl bg-[#121212] text-white hover:bg-[#C5A059] transition-all">Inquire Selection <MessageCircle size={20} className="inline-block ml-2" /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="max-w-6xl mx-auto py-24 md:py-32 px-8">
                <div className="text-center mb-16 md:mb-24">
                  <h2 className="text-4xl md:text-6xl font-light mb-8 leading-none italic font-serif">The Process</h2>
                  <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">A Sequence of Excellence</p>
                </div>
                <div className="grid md:grid-cols-3 gap-16 relative">
                  {[
                    { step: "01", title: "Vision Call", desc: "A creative session to align on the artistic direction and schedule flow.", icon: <MessageCircle /> },
                    { step: "02", title: "Confirmation", desc: "A 30% retainer and signed agreement secure your specific block in our calendar.", icon: <Award /> },
                    { step: "03", title: "Final Design", desc: "Timeline refinements and reference reviews 30 days prior to refine timeline specifics.", icon: <Map /> }
                  ].map((item, idx) => (
                    <div key={idx} className="relative z-10 text-center flex flex-col items-center group">
                      <div className="w-24 h-24 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-8 shadow-xl text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-white transition-all duration-500 font-black">{item.icon}</div>
                      <span className="text-[10px] font-black text-[#C5A059] mb-4 uppercase tracking-[0.4em] font-black">{item.step}</span>
                      <h4 className="text-4xl font-serif italic mb-6 text-slate-950 font-black">{item.title}</h4>
                      <p className="text-xl leading-relaxed text-slate-500 font-medium px-4">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {proposalData.workLinks && proposalData.workLinks.length > 0 && (
                <section className="bg-slate-950 py-24 md:py-32 px-8 font-black">
                  <div className="max-w-5xl mx-auto font-black">
                    <div className="text-center mb-16 font-serif">
                      <h2 className="text-3xl md:text-5xl italic text-white mb-8 font-serif leading-none font-black">Selected Stories</h2>
                      <p className="text-[11px] font-black text-slate-500 tracking-[0.4em] uppercase">Recommended Viewing</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-8 font-black">
                      {proposalData.workLinks.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 p-10 rounded-[3rem] flex items-center justify-between group hover:bg-white/10 transition-all font-black">
                          <div>
                            <h4 className="text-white font-bold text-xl mb-2 font-serif italic leading-none font-black">{link.title}</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-[10px] tracking-widest uppercase font-black font-sans leading-none">Launch Gallery</span>
                                {link.note && <div className="bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1"><LockKeyhole size={10} /> {link.note}</div>}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center group-hover:bg-[#C5A059] group-hover:scale-110 transition-all shrink-0"><LinkIcon size={18} /></div>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-[#fafaf9] py-24 md:py-32 px-8 border-y border-slate-100">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-20 md:mb-24 font-serif">
                    <h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-slate-950 font-serif leading-none font-black">Kind Words</h2>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C5A059" className="text-[#C5A059]" />)}
                    </div>
                    <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase font-black font-black">Trusted by Spark Couples</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-10 md:gap-14 font-black">
                    {proposalData.reviews.map((review) => (
                      <div key={review.id} className="relative p-12 md:p-16 bg-white rounded-[3rem] border border-slate-50 shadow-sm group font-black font-black">
                        <Quote className="absolute top-10 left-10 text-slate-50 group-hover:text-slate-100 transition-colors" size={80} strokeWidth={0.5} />
                        <div className="relative z-10 font-black leading-relaxed">
                          <p className="text-xl md:text-2xl text-[#333333] leading-[1.8] italic font-serif font-black">"{review.text}"</p>
                          <div className="flex items-center gap-4 border-t border-slate-50 pt-8 font-black font-black">
                            <div className="h-1px w-12 bg-[#C5A059]"></div>
                            <p className="font-black text-[12px] uppercase tracking-[0.3em] text-[#C5A059] font-sans font-black leading-none font-black">{review.author}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <footer className="bg-[#0a0a0a] text-white py-32 md:py-48 px-8 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="max-w-6xl mx-auto relative z-10">
                  <div className="grid md:grid-cols-2 gap-24 items-center">
                    <div className="text-left leading-relaxed font-black">
                      <h3 className="text-6xl md:text-8xl mb-12 italic leading-none text-white font-serif font-black">Your Legacy Starts Here.</h3>
                      <div className="space-y-12">
                        <div className="flex gap-8">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-black"><Clock size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div className="font-black"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059]">Duration</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight">Active for 30 days — Valid until {new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}</p></div>
                        </div>
                        <div className="flex gap-8">
                          <div className="w-16 h-16 rounded-[1.5rem] border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 font-black"><Award size={28} className="text-[#C5A059]" strokeWidth={1} /></div>
                          <div className="font-black"><h4 className="font-black text-[11px] tracking-[0.4em] uppercase mb-4 text-[#C5A059]">Contract</h4><p className="text-xl font-bold text-white tracking-tight font-black leading-tight">A signed agreement formalizes all details and dates.</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-slate-950 p-12 md:p-24 rounded-[4rem] shadow-2xl relative group overflow-hidden font-black">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-bl-[10rem] transition-transform duration-[2s] group-hover:scale-125"></div>
                      <h4 className="text-4xl md:text-6xl font-serif mb-10 italic leading-none font-black font-black">Vision Call</h4>
                      <p className="text-slate-600 mb-16 text-xl leading-relaxed font-medium pr-4">To ensure our artistic styles align, we invite you to a brief 15-minute introductory session.</p>
                      <button onClick={() => openWhatsApp(`Hi Spark Studios! We'd like to schedule a Vision Call for ${proposalData.clientName}.`)} className="w-full bg-[#C5A059] text-white py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.5em] shadow-2xl hover:bg-slate-950 transition-all active:scale-95 flex items-center justify-center gap-4">Connect on WhatsApp <MessageCircle size={20} /></button>
                    </div>
                  </div>
                  <div className="mt-32 md:mt-48 pt-20 border-t border-white/10 text-center font-black"><p className="text-[11px] uppercase tracking-[1em] opacity-40 font-black font-black font-black">The Spark Studios &copy; 2026</p></div>
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