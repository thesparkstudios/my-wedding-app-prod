/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { 
  Camera, Film, Clock, Award, CheckCircle, Calendar, 
  Zap, Plus, Trash2, Eye, Edit3, Save, 
  Settings, Copy, Share2, AlertCircle, List, ArrowLeft,
  Check, Lock, XCircle, MessageCircle
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
const APP_VERSION = "1.3.0"; 

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
        description: "For the couple who wants every moment captured digitally with zero compromises on quality.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "1 Professional Lead Photographer (3 Days)",
          "1 Professional Lead Videographer (Days 2 & 3)",
          "Secondary Team for Day 3",
          "Cinematic Highlight Film",
          "Full-Length Edited Ceremony Video",
          "Fully Curated Digital Photo Gallery",
          "Drone/Aerial Cinematography"
        ]
      },
      {
        id: 2,
        name: "Signature",
        price: "$11,550",
        description: "Our most popular choice for families who want a physical heirloom to pass down for generations.",
        isVisible: true,
        isHighlighted: true,
        features: [
          "Everything in the Essential Collection",
          "Two 12x17 Premium Wedding Albums",
          "Hand-Crafted Carrying Briefcase",
          "Priority Editing Queue (3-week faster delivery)",
          "Premium USB Archive Kit"
        ]
      },
      {
        id: 3,
        name: "Legacy",
        price: "$13,950",
        description: "The ultimate storytelling experience including our fastest turnaround and highest-tier deliverables.",
        isVisible: true,
        isHighlighted: false,
        features: [
          "Everything in the Signature Collection",
          "Upgraded Premium Faux Leather Album Cases",
          "Extended Cinematic Highlight (5–7 Minutes)",
          "Next-Day 'Teaser' Film (48-hour delivery)",
          "Express Full Gallery Delivery"
        ]
      }
    ]
  };

  const [proposalData, setProposalData] = useState(initialProposalState);

  // Time formatting helper
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

  // WhatsApp helper
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
        setFbError("Authentication Failed. Please refresh.");
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
              // TRACK VIEW: Only if this isn't the editor/dashboard view
              // and we are logged in as a 'client' (essentially we check isUnlocked state later)
              // For simplicity, we increment if we are in 'preview' logic
              if (!isUnlocked) {
                await updateDoc(docRef, { 
                  views: increment(1), 
                  lastViewedAt: Date.now() 
                });
              }
            }
            // Clients are unlocked to see their own quote
            if (!isUnlocked && hash.includes('/quote/')) setIsUnlocked(true); 
            setView('preview');
            setFbError(null);
          } else {
            setView('dashboard');
          }
        } catch (err) {
          setFbError("Could not load lead data. Check Firebase Rules.");
        }
      } else if (!hash && isUnlocked) {
        if (view !== 'editor') setView('dashboard');
      }
    };
    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user, finalAppId, isUnlocked, view]); 

  useEffect(() => {
    if (!user || !isUnlocked || view === 'preview') return;
    const q = collection(db, 'artifacts', finalAppId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
      setFbError(null);
    }, (err) => {
      setFbError("Lead tracking disabled. Update Firestore rules.");
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
        ...proposalData, 
        id, 
        updatedAt: Date.now(), 
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
      setFbError("Save blocked by Firebase Rules.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => setProposalData(prev => ({ ...prev, [field]: value }));
  const updateDay = (id, field, value) => setProposalData(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? { ...d, [field]: value } : d) }));
  const addDay = () => setProposalData(prev => ({ ...prev, days: [...prev.days, { id: prev.days.length + 1, label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }] }));
  const removeDay = (id) => setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  const updatePackage = (id, field, value) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const updatePackageFeatures = (pId, featuresArray) => setProposalData(prev => ({ ...prev, packages: prev.packages.map(p => p.id === pId ? { ...p, features: featuresArray } : p) }));
  const createNew = () => { setCurrentQuoteId(null); setProposalData({ ...initialProposalState, createdAt: Date.now() }); window.location.hash = ''; setView('editor'); };
  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/quote/${currentQuoteId}`;
    const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000);
  };

  const IconMap = { Calendar: <Calendar size={20} />, Clock: <Clock size={20} />, Film: <Film size={20} />, Zap: <Zap size={20} />, Camera: <Camera size={20} /> };

  if (!isUnlocked && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8"><Lock size={32} /></div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight text-gray-900">The Spark Studios</h2>
          <p className="text-gray-600 text-sm mb-8 italic">Internal Access Key Required</p>
          <input type="password" placeholder="Enter Key" className="w-full p-4 border border-gray-200 bg-gray-50 rounded-2xl mb-4 text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold tracking-widest" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && passInput === 'wayssmffss2') setIsUnlocked(true); }} />
          <button onClick={() => { if(passInput === 'wayssmffss2') setIsUnlocked(true); }} className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95">Unlock Dashboard</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 selection:bg-indigo-100">
      {fbError && view !== 'preview' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3"><XCircle size={20} className="shrink-0" /><p className="text-sm font-bold">{fbError}</p></div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div><h1 className="text-3xl md:text-4xl font-bold text-gray-900">The Spark Studios</h1><p className="text-gray-700 font-medium">Lead Tracking & Proposals</p></div>
            <button onClick={createNew} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg font-bold active:scale-95"><Plus size={20} /> New Proposal</button>
          </div>
          <div className="grid gap-4">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">Active Leads</h2>
            {savedQuotes.length === 0 ? (
              <div className="text-center py-20 bg-gray-100/50 rounded-3xl border border-dashed"><p className="text-gray-600 italic">No proposals found.</p></div>
            ) : (
              savedQuotes.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(quote => {
                const created = quote.createdAt || Date.now();
                const expired = Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
                return (
                  <div key={quote.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:shadow-md transition gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${expired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}><Calendar size={20} /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{quote.clientName}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <p className={`text-[12px] font-bold ${expired ? 'text-red-600' : 'text-gray-600'}`}>{expired ? 'Expired' : `Valid: ${new Date(created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}`}</p>
                          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700 uppercase"><Eye size={12} /> {quote.views || 0} Views</div>
                          <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold text-indigo-700 uppercase"><Clock size={12} /> Last: {getTimeAgo(quote.lastViewedAt)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
                      <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = `#/quote/${quote.id}`; setView('editor'); }} className="flex-1 lg:flex-none p-3 px-5 bg-gray-100 rounded-xl hover:bg-gray-200 transition text-gray-800 flex items-center justify-center gap-2 font-bold text-sm"><Edit3 size={16} /> Edit</button>
                      <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); window.location.hash = `#/quote/${quote.id}`; setView('preview'); }} className="flex-1 lg:flex-none p-3 px-5 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition text-white flex items-center justify-center gap-2 font-bold text-sm shadow-md"><Eye size={16} /> View</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div className="max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-6 font-sans text-gray-800 pb-40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-6">
            <div className="flex items-center gap-3"><button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-700"><ArrowLeft size={20} /></button><div><h1 className="text-xl font-bold text-gray-900">Proposal Builder</h1><p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest">{currentQuoteId ? `Quote ID: ${currentQuoteId}` : 'New Narrative'}</p></div></div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={saveQuote} disabled={isSaving} className={`flex-1 md:flex-none px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50 ${copyFeedback ? 'bg-green-600' : 'bg-black'} text-white font-bold active:scale-95`}>{isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : copyFeedback ? <Check size={18} /> : <Save size={18} />}{isSaving ? "Saving..." : copyFeedback ? "Saved!" : "Save Quote"}</button>
              {currentQuoteId && <button onClick={() => setView('preview')} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg font-bold active:scale-95"><Eye size={18} /> Preview</button>}
            </div>
          </div>

          <div className="space-y-10">
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-indigo-950"><Settings size={20} className="text-indigo-600" /> Lead Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Client Name</label><input type="text" value={proposalData.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900" /></div>
                <div className="flex flex-col gap-2"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Hero Image URL</label><input type="text" value={proposalData.heroImage} onChange={(e) => updateField('heroImage', e.target.value)} className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /></div>
                <div className="md:col-span-2 flex flex-col gap-2"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">The Narrative Vision</label><textarea rows="3" value={proposalData.visionStatement} onChange={(e) => updateField('visionStatement', e.target.value)} className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 italic text-gray-800 resize-none font-medium leading-relaxed" /></div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold flex items-center gap-2 text-indigo-950 px-1"><Calendar size={20} className="text-indigo-600" /> Event Schedule</h2><button onClick={addDay} className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-full font-bold uppercase tracking-widest hover:bg-indigo-700 transition shadow-md"><Plus size={14} /> Add Day</button></div>
              <div className="grid md:grid-cols-2 gap-4">
                {proposalData.days.map((day) => (
                  <div key={day.id} className={`p-6 rounded-[2rem] border-2 transition-all ${day.highlight ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-4"><select value={day.icon} onChange={(e) => updateDay(day.id, 'icon', e.target.value)} className="bg-gray-100 p-2 rounded-lg text-xs border-none outline-none font-bold text-gray-800 uppercase tracking-tighter">{Object.keys(IconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}</select><button onClick={() => removeDay(day.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"><Trash2 size={18} /></button></div>
                    <div className="space-y-4 font-sans">
                      <input type="text" value={day.label} onChange={(e) => updateDay(day.id, 'label', e.target.value)} className="w-full font-bold bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none text-gray-900 text-lg" placeholder="Day Label (e.g. Mehndi)" />
                      <input type="text" value={day.date} onChange={(e) => updateDay(day.id, 'date', e.target.value)} className="w-full text-sm text-gray-700 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none font-bold" placeholder="Date/Day" />
                      <input type="text" value={day.desc} onChange={(e) => updateDay(day.id, 'desc', e.target.value)} className="w-full text-sm text-indigo-700 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none font-bold" placeholder="Coverage Details" />
                      <label className="flex items-center gap-3 mt-4 cursor-pointer select-none px-1"><input type="checkbox" checked={day.highlight} onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" /><span className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Full Day Coverage</span></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-indigo-950 px-1"><Award size={20} className="text-indigo-600" /> Collections</h2>
              <div className="space-y-6">
                {proposalData.packages.map((pkg) => (
                  <div key={pkg.id} className={`p-6 md:p-8 rounded-[2.5rem] border-2 transition-all ${pkg.isVisible ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-100 opacity-50 border-dashed'}`}>
                    <div className="flex justify-between items-center mb-8 border-b pb-6"><div className="flex items-center gap-4"><input type="checkbox" checked={pkg.isVisible} onChange={(e) => updatePackage(pkg.id, 'isVisible', e.target.checked)} className="w-6 h-6 rounded text-indigo-600" /><div><h3 className="font-bold text-gray-900 text-xl">{pkg.name} Story</h3><p className="text-[11px] text-gray-700 font-bold uppercase tracking-[0.2em]">{pkg.isVisible ? 'Visible to Client' : 'Hidden from Client'}</p></div></div>{pkg.isVisible && <div className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-full text-white shadow-md shadow-indigo-200"><span className="text-[11px] font-bold uppercase tracking-widest">Featured?</span><input type="checkbox" checked={pkg.isHighlighted} onChange={(e) => updatePackage(pkg.id, 'isHighlighted', e.target.checked)} className="w-4 h-4 rounded text-white" /></div>}</div>
                    {pkg.isVisible && (
                      <div className="grid md:grid-cols-2 gap-10 font-sans">
                        <div className="space-y-5">
                          <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Collection Title</label><input type="text" value={pkg.name} onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)} className="p-4 border border-gray-200 bg-gray-50 rounded-xl font-bold text-gray-900" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Starting Investment</label><input type="text" value={pkg.price} onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)} className="p-4 border border-gray-200 bg-gray-50 rounded-xl font-serif text-2xl text-indigo-700 font-bold" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Short Description</label><textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)} className="p-4 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-800 h-24 italic resize-none font-medium leading-relaxed" /></div>
                        </div>
                        <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Key Features (One per line)</label><textarea value={pkg.features.join('\n')} onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))} className="p-5 border border-gray-200 bg-gray-50 rounded-xl text-sm h-full min-h-[200px] leading-relaxed text-gray-900 font-medium" /></div>
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
        <div className="min-h-screen font-serif text-gray-950 bg-white relative">
          {isExpired ? (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 font-sans"><div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-gray-200"><div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8"><AlertCircle size={32} /></div><h1 className="text-2xl font-bold mb-4 text-gray-950 tracking-tight">Proposal Expired</h1><p className="text-gray-700 mb-8 font-medium italic">This curated proposal for <span className="font-bold text-gray-950">{proposalData.clientName}</span> has completed its 30-day window. Please contact us for a refreshed quotation.</p><div className="h-[1px] bg-gray-100 w-full mb-8"></div><p className="text-sm text-gray-700 mb-8 font-bold uppercase tracking-[0.3em]">The Spark Studios</p><button onClick={() => openWhatsApp(`Hi! Our proposal for ${proposalData.clientName} just expired, but we are still interested. Can we get a quick update?`)} className="w-full bg-black text-white py-5 rounded-[1.5rem] font-bold hover:opacity-90 transition shadow-lg active:scale-95 flex items-center justify-center gap-2">Request Extension <ArrowLeft className="rotate-180" size={16} /></button></div></div>
          ) : (
            <>
              {/* Floating Menu Controls (Darker Text for High Contrast) */}
              <div className="fixed top-4 left-4 right-4 z-50 flex justify-between pointer-events-none">
                <button onClick={() => setView('editor')} className="pointer-events-auto bg-white/98 backdrop-blur-md border border-gray-300 p-3.5 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-2 px-6 active:scale-95"><Edit3 size={16} className="text-indigo-700" /><span className="text-sm font-sans font-extrabold text-gray-900 uppercase tracking-widest">Edit</span></button>
                <button onClick={() => setView('dashboard')} className="pointer-events-auto bg-white/98 backdrop-blur-md border border-gray-300 p-3.5 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-2 px-6 active:scale-95"><List size={16} className="text-gray-900" /><span className="text-sm font-sans font-extrabold text-gray-900 uppercase tracking-widest">Portal</span></button>
              </div>

              {/* Hero (Max Visual Impact) */}
              <div className="relative h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden bg-black">
                <div className="absolute inset-0 opacity-65"><img src={proposalData.heroImage} className="w-full h-full object-cover transform hover:scale-105 transition duration-[20s] ease-out" alt="Hero" /></div>
                <div className="relative z-10 text-center text-white px-6">
                  <h2 className="tracking-[0.6em] text-[11px] md:text-sm uppercase mb-6 opacity-90 font-sans font-black">Fine Art Cinema & Photo</h2>
                  <h1 className="text-5xl md:text-[9rem] mb-10 tracking-tighter leading-[0.95] drop-shadow-2xl">{proposalData.clientName}</h1>
                  <p className="text-lg md:text-3xl italic opacity-100 font-light max-w-2xl mx-auto border-t border-white/40 pt-10 px-4">A Custom Digital Narrative</p>
                </div>
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-60"><div className="w-[1px] h-16 bg-white"></div></div>
              </div>

              {/* High Contrast Narrative Section */}
              <section className="max-w-4xl mx-auto py-32 md:py-48 px-6 text-center">
                <h2 className="text-[12px] tracking-[0.5em] uppercase text-[#96794a] font-sans font-black mb-12">The Creative Heart</h2>
                <p className="text-2xl md:text-5xl leading-[1.65] text-gray-900 font-light italic px-4">"{proposalData.visionStatement}"</p>
              </section>

              {/* Itinerary Grid (Darker text for readability) */}
              <section className="bg-[#fcfcfb] py-24 md:py-36 px-6 border-y border-gray-200">
                <div className="max-w-6xl mx-auto">
                  <div className={`grid gap-8 md:gap-12 ${
                    proposalData.days.length === 1 ? 'md:grid-cols-1 max-w-lg mx-auto' :
                    proposalData.days.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' :
                    proposalData.days.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' : 'md:grid-cols-4'
                  }`}>
                    {proposalData.days.map((day) => (
                      <div key={day.id} className={`relative p-10 md:p-14 bg-white rounded-[2.5rem] shadow-sm border transition-all duration-700 hover:shadow-2xl hover:-translate-y-4 ${day.highlight ? 'ring-2 ring-[#b08d57]/40 border-[#b08d57]/40' : 'border-gray-200'}`}>
                        <div className={`w-16 h-16 flex items-center justify-center rounded-2xl mb-10 ${day.highlight ? 'bg-[#b08d57] text-white shadow-xl' : 'bg-gray-100 text-gray-700'}`}>{IconMap[day.icon] || <Clock size={32} />}</div>
                        <h4 className="font-black text-[12px] font-sans uppercase tracking-[0.4em] text-gray-600 mb-4">{day.label}</h4>
                        <p className="text-gray-950 text-[15px] font-sans font-black mb-4 tracking-tight uppercase">{day.date}</p>
                        <p className={`text-xl md:text-2xl font-serif italic ${day.highlight ? 'text-[#96794a]' : 'text-gray-800'} font-medium`}>{day.desc}</p>
                        {day.highlight && <div className="mt-10 pt-10 border-t border-gray-100"><p className="text-[12px] font-sans font-black text-gray-700 uppercase tracking-[0.2em] leading-relaxed">Full Day Marathon Coverage<br/>+ Elite Production Unit</p></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Pricing Cards (High Contrast Adjustments) */}
              <section className="max-w-7xl mx-auto py-32 md:py-48 px-6">
                <div className="text-center mb-24 md:mb-36">
                  <h2 className="text-5xl md:text-8xl font-light mb-10 text-gray-950 tracking-tight leading-none">The Collections</h2>
                  <div className="flex items-center justify-center gap-8 text-[12px] font-sans font-black text-gray-700 tracking-[0.6em] uppercase">
                    <div className="h-[2px] w-12 bg-gray-200"></div>
                    <span>Your Investment</span>
                    <div className="h-[2px] w-12 bg-gray-200"></div>
                  </div>
                </div>
                <div className={`grid gap-12 md:gap-16 items-stretch justify-center ${proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-xl mx-auto' : proposalData.packages.filter(p => p.isVisible).length === 2 ? 'md:grid-cols-2 max-w-6xl mx-auto' : 'lg:grid-cols-3'}`}>
                  {proposalData.packages.filter(p => p.isVisible).map((item) => (
                    <div key={item.id} className={`relative flex flex-col p-10 md:p-16 rounded-[3.5rem] md:rounded-[4rem] border transition-all duration-700 hover:shadow-[0_80px_120px_-30px_rgba(0,0,0,0.1)] ${item.isHighlighted ? 'border-[#b08d57]/60 bg-white lg:scale-105 z-10 shadow-2xl' : 'border-gray-200 bg-white'}`}>
                      {item.isHighlighted && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#b08d57] text-white px-10 py-3 rounded-full text-[12px] font-black font-sans tracking-[0.5em] shadow-xl">MOST POPULAR</div>}
                      <div className="mb-12 md:mb-16">
                        <h3 className="text-4xl font-light mb-6 tracking-tight text-gray-950 leading-none">{item.name} Story</h3>
                        <div className="text-6xl md:text-8xl font-serif mb-10 text-gray-950 tracking-tighter leading-none">{item.price}</div>
                        <p className="text-base md:text-lg text-gray-700 leading-relaxed italic font-medium pr-4">{item.description}</p>
                      </div>
                      <div className="flex-grow space-y-7 md:space-y-9 mb-12 md:mb-16 border-t border-gray-100 pt-12">
                        {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-6 group">
                            <div className={`mt-1 flex-shrink-0 transition-all duration-300 ${item.isHighlighted ? 'text-[#b08d57]' : 'text-gray-400 group-hover:text-gray-950'}`}><CheckCircle size={22} /></div>
                            <span className="text-base md:text-lg text-gray-800 leading-snug font-sans tracking-tight font-bold">{feature}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => openWhatsApp(`Hi! I'm interested in booking the ${item.name} Collection for our wedding.`)} className={`w-full py-7 rounded-[2rem] font-black text-[12px] font-sans tracking-[0.4em] uppercase transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${item.isHighlighted ? 'bg-[#b08d57] text-white hover:bg-black' : 'bg-gray-950 text-white hover:bg-[#b08d57]'}`}>Book {item.name} <MessageCircle size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* High Contrast Footer Info */}
              <section className="bg-gray-950 text-white py-32 md:py-56 px-6">
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-24 md:gap-40 items-center">
                    <div>
                      <h3 className="text-5xl md:text-7xl mb-12 italic leading-[1.1] text-white font-light">Your Shared<br/>Legacy Begins</h3>
                      <p className="text-xl opacity-90 mb-16 font-light leading-relaxed max-w-md text-gray-100">The overture of your family story. We are honored to be the ones tasked with preserving it.</p>
                      <div className="space-y-12">
                        <div className="flex gap-8">
                          <div className="w-16 h-16 rounded-[1.25rem] border border-white/30 flex items-center justify-center shrink-0"><Clock size={28} className="text-[#b08d57]" /></div>
                          <div><h4 className="font-black text-[12px] tracking-[0.3em] font-sans uppercase mb-3 text-gray-100">Validity Period</h4><p className="text-lg opacity-100 font-sans font-bold text-gray-200">Quote expires in 30 days ({new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()})</p></div>
                        </div>
                        <div className="flex gap-8">
                          <div className="w-16 h-16 rounded-[1.25rem] border border-white/30 flex items-center justify-center shrink-0"><Award size={28} className="text-[#b08d57]" /></div>
                          <div><h4 className="font-black text-[12px] tracking-[0.3em] font-sans uppercase mb-3 text-gray-100">Secure Your Dates</h4><p className="text-lg opacity-100 font-sans font-bold text-gray-200">A 30% non-refundable retainer is required to lock our studio for your window.</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-gray-950 p-12 md:p-20 rounded-[4rem] md:rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-[#b08d57]/10 rounded-bl-[5rem]"></div>
                      <h4 className="text-4xl md:text-5xl font-serif mb-8 italic text-gray-950 leading-tight">The Vision Call</h4>
                      <p className="text-gray-800 mb-14 text-base md:text-xl leading-[1.7] font-sans font-bold pr-6">The best way to ensure we're the perfect fit is a quick consultation to walk through the flow of your events.</p>
                      <button onClick={() => openWhatsApp(`Hi! I'd like to schedule a Vision Call for our ${proposalData.clientName} wedding.`)} className="w-full bg-[#b08d57] text-white py-7 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.5em] font-sans hover:bg-black transition-all shadow-2xl shadow-[#b08d57]/30 active:scale-95 flex items-center justify-center gap-3">Request Call <MessageCircle size={18} /></button>
                    </div>
                  </div>
                  <div className="mt-32 md:mt-56 pt-16 border-t border-white/20 text-center"><p className="text-[11px] uppercase tracking-[0.8em] opacity-60 font-sans font-black">The Spark Studios © 2026 — Fine Art Cinema & Photography</p></div>
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