/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { 
  Camera, Film, Clock, Award, CheckCircle, Calendar, 
  Zap, Plus, Trash2, Eye, Edit3, Save, 
  Settings, Copy, Share2, AlertCircle, List, ArrowLeft,
  Check, Lock
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

// Use window object to avoid ESLint "undefined" errors during production build
const appId = typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'the-spark-studios-quotes';

const EXPIRY_DAYS = 30;
const APP_VERSION = "1.2.2"; 

const App = () => {
  const [view, setView] = useState('editor'); // 'editor', 'preview', 'dashboard'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Security State
  const [passInput, setPassInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // --- INITIAL PROPOSAL STATE ---
  const initialProposalState = {
    clientName: "Ayushi & Family",
    visionStatement: "Three days of celebration, tradition, and joy. From the intimate moments of the engagement to the 17-hour marathon of May 10th, we are here to ensure that your legacy is preserved with the same energy it was lived with.",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    createdAt: Date.now(),
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

  // --- FIREBASE AUTH ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? window.__initial_auth_token : null;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LOAD QUOTE FROM URL HASH ---
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/quote/')) {
        const id = hash.replace('#/quote/', '');
        setCurrentQuoteId(id);
        
        if (!user) return; 

        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProposalData(data);
            
            const created = data.createdAt || Date.now();
            const thirtyDays = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
            if (Date.now() > created + thirtyDays) {
              setIsExpired(true);
            } else {
              setIsExpired(false);
            }
            
            setIsUnlocked(true);
            setView('preview');
          } else {
            setView('dashboard');
          }
        } catch (err) {
          console.error("Fetch error:", err);
        }
      } else if (!hash) {
        if (view !== 'editor') setView('dashboard');
      }
    };

    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 

  // --- FETCH ALL QUOTES FOR DASHBOARD ---
  useEffect(() => {
    if (!user || !isUnlocked) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
    }, (err) => console.error("Snapshot error:", err));
    return () => unsubscribe();
  }, [user, isUnlocked]);

  // --- HANDLERS ---
  const saveQuote = async () => {
    // If no user, try to sign in again before failing
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Could not re-auth during save:", e);
        return;
      }
    }

    setIsSaving(true);
    const id = currentQuoteId || proposalData.clientName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'quotes', id);
      const dataToSave = { 
        ...proposalData, 
        id, 
        updatedAt: Date.now(),
        createdAt: proposalData.createdAt || Date.now() 
      };
      
      await setDoc(docRef, dataToSave);
      setCurrentQuoteId(id);
      
      const newHash = `#/quote/${id}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, null, newHash);
      }
      
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    } catch (err) {
      console.error("Save error details:", err);
      // We don't use alert() in canvas, but logging the error helps debug.
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => setProposalData(prev => ({ ...prev, [field]: value }));

  const updateDay = (id, field, value) => {
    setProposalData(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const addDay = () => {
    const newId = proposalData.days.length > 0 ? Math.max(...proposalData.days.map(d => d.id)) + 1 : 1;
    setProposalData(prev => ({
      ...prev,
      days: [...prev.days, { id: newId, label: "New Day", date: "Date", desc: "Service Details", icon: "Clock", highlight: false }]
    }));
  };

  const removeDay = (id) => {
    setProposalData(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
  };

  const updatePackage = (id, field, value) => {
    setProposalData(prev => ({
      ...prev,
      packages: prev.packages.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const updatePackageFeatures = (pId, featuresArray) => {
    setProposalData(prev => ({
      ...prev,
      packages: prev.packages.map(p => p.id === pId ? { ...p, features: featuresArray } : p)
    }));
  };

  const createNew = () => {
    setCurrentQuoteId(null);
    setProposalData({ ...initialProposalState, createdAt: Date.now() });
    window.location.hash = '';
    setView('editor');
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/quote/${currentQuoteId}`;
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const IconMap = {
    Calendar: <Calendar size={20} />,
    Clock: <Clock size={20} />,
    Film: <Film size={20} />,
    Zap: <Zap size={20} />,
    Camera: <Camera size={20} />
  };

  // --- RENDER LOGIC ---

  // 1. Password Protection Gate
  if (!isUnlocked && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-6 font-sans">
        <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight text-gray-900">The Spark Studios</h2>
          <p className="text-gray-400 text-sm mb-8 italic">Internal Quotation Access</p>
          <input 
            type="password" 
            placeholder="Enter Access Key"
            className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl mb-4 text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold tracking-widest"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && passInput === 'wayssmffss2') setIsUnlocked(true); }}
          />
          <button 
            onClick={() => { if(passInput === 'wayssmffss2') setIsUnlocked(true); }}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
          >
            Unlock Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 3. Application Views
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-5xl mx-auto py-12 px-6">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">The Spark Studios</h1>
              <p className="text-gray-500">Quotation Management Dashboard</p>
            </div>
            <button 
              onClick={createNew}
              className="bg-indigo-600 text-white px-8 py-3 rounded-full flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg"
            >
              <Plus size={20} /> New Proposal
            </button>
          </div>

          <div className="grid gap-4">
            <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-2">Active Quotes</h2>
            {savedQuotes.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed">
                <p className="text-gray-400 italic">No quotes saved yet. Start by creating a new one!</p>
              </div>
            ) : (
              savedQuotes.map(quote => {
                const created = quote.createdAt || Date.now();
                const expired = Date.now() > created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
                return (
                  <div key={quote.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-full ${expired ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-400'}`}>
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{quote.clientName}</h3>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>Created: {new Date(created).toLocaleDateString()}</span>
                          <span className={expired ? 'text-red-500 font-bold' : ''}>
                            {expired ? 'Expired' : `Expires: ${new Date(created + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setProposalData(quote);
                          setCurrentQuoteId(quote.id);
                          window.location.hash = `#/quote/${quote.id}`;
                          setView('editor');
                        }}
                        className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-600"
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setProposalData(quote);
                          setCurrentQuoteId(quote.id);
                          window.location.hash = `#/quote/${quote.id}`;
                          setView('preview');
                        }}
                        className="p-3 bg-indigo-600 rounded-full hover:bg-indigo-700 transition text-white"
                        title="Preview"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <footer className="mt-20 text-center">
            <p className="text-[10px] text-gray-300 uppercase tracking-widest font-sans">Build Version {APP_VERSION}</p>
          </footer>
        </div>
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-40">
        <div className="max-w-5xl mx-auto py-10 px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b pb-6 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Proposal Builder</h1>
                <p className="text-sm text-gray-500">{currentQuoteId ? `Editing: ${currentQuoteId}` : 'New Custom Quotation'}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={saveQuote}
                disabled={isSaving}
                className={`flex-1 md:flex-none px-6 py-3 rounded-full flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50 ${copyFeedback ? 'bg-green-600' : 'bg-black'} text-white hover:opacity-90 active:scale-95`}
              >
                {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : copyFeedback ? <Check size={18} /> : <Save size={18} />}
                {isSaving ? "Saving..." : copyFeedback ? "Saved Successfully!" : "Save Proposal"}
              </button>
              {currentQuoteId && (
                <button 
                  onClick={() => setView('preview')}
                  className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg active:scale-95"
                >
                  <Eye size={18} /> View Preview
                </button>
              )}
            </div>
          </div>

          {currentQuoteId && (
            <div className={`mb-10 p-4 rounded-xl flex items-center justify-between transition-all duration-500 ${copyFeedback ? 'bg-green-50 border border-green-100' : 'bg-indigo-50 border border-indigo-100'}`}>
              <div className={`flex items-center gap-3 text-sm ${copyFeedback ? 'text-green-700' : 'text-indigo-700'}`}>
                {copyFeedback ? <Check size={16} /> : <Share2 size={16} />}
                <span className="font-medium">{copyFeedback ? 'Link Copied to Clipboard!' : 'Shareable Link:'} </span>
                <code className="bg-white/50 px-2 py-1 rounded hidden md:inline-block">{`${window.location.origin}${window.location.pathname}#/quote/${currentQuoteId}`}</code>
              </div>
              <button onClick={copyLink} className={`${copyFeedback ? 'text-green-600' : 'text-indigo-600'} hover:opacity-70 text-xs font-bold flex items-center gap-1 uppercase tracking-tighter`}>
                {copyFeedback ? 'Copied' : <><Copy size={14} /> Copy Link</>}
              </button>
            </div>
          )}

          {/* Editor Content Fields */}
          <div className="space-y-12">
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-900 font-sans">
                <Settings size={20} className="text-indigo-600" /> General Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</label>
                  <input 
                    type="text" 
                    value={proposalData.clientName} 
                    onChange={(e) => updateField('clientName', e.target.value)}
                    className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold"
                    placeholder="e.g. Ayushi & Family"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hero Image URL</label>
                  <input 
                    type="text" 
                    value={proposalData.heroImage} 
                    onChange={(e) => updateField('heroImage', e.target.value)}
                    className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">The Vision Statement</label>
                  <textarea 
                    rows="3"
                    value={proposalData.visionStatement} 
                    onChange={(e) => updateField('visionStatement', e.target.value)}
                    className="p-4 border border-gray-100 bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none italic text-gray-600"
                  />
                </div>
              </div>
            </section>

            {/* Day Management */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900 font-sans">
                  <Calendar size={20} className="text-indigo-600" /> Schedule & Logistics
                </h2>
                <button onClick={addDay} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-2 transition font-bold uppercase tracking-widest">
                  <Plus size={14} /> Add Day
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {proposalData.days.map((day) => (
                  <div key={day.id} className={`p-6 rounded-xl border-2 transition-all ${day.highlight ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <select 
                        value={day.icon} 
                        onChange={(e) => updateDay(day.id, 'icon', e.target.value)}
                        className="bg-gray-100 p-1.5 rounded text-xs border-none outline-none font-bold"
                      >
                        {Object.keys(IconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                      </select>
                      <button onClick={() => removeDay(day.id)} className="text-red-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-4 font-sans">
                      <input 
                        type="text" 
                        value={day.label} 
                        onChange={(e) => updateDay(day.id, 'label', e.target.value)}
                        className="w-full font-bold bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none"
                      />
                      <input 
                        type="text" 
                        value={day.date} 
                        onChange={(e) => updateDay(day.id, 'date', e.target.value)}
                        className="w-full text-sm text-gray-500 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none"
                      />
                      <input 
                        type="text" 
                        value={day.desc} 
                        onChange={(e) => updateDay(day.id, 'desc', e.target.value)}
                        className="w-full text-sm text-indigo-600 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none font-medium"
                      />
                      <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={day.highlight} 
                          onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 shadow-sm"
                        />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Day Coverage</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Packages Management */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-900 font-sans">
                <Award size={20} className="text-indigo-600" /> Wedding Collections
              </h2>
              <div className="space-y-6">
                {proposalData.packages.map((pkg) => (
                  <div key={pkg.id} className={`p-8 rounded-2xl border-2 transition-all ${pkg.isVisible ? 'bg-white border-gray-100' : 'bg-gray-50 opacity-40 border-dashed border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={pkg.isVisible} 
                          onChange={(e) => updatePackage(pkg.id, 'isVisible', e.target.checked)}
                          className="w-6 h-6 rounded text-indigo-600 cursor-pointer"
                        />
                        <div>
                          <h3 className="text-lg font-bold">{pkg.name} Collection</h3>
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{pkg.isVisible ? 'Enabled' : 'Disabled'}</p>
                        </div>
                      </div>
                      {pkg.isVisible && (
                        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                          <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-tighter">Featured?</span>
                          <input 
                            type="checkbox" 
                            checked={pkg.isHighlighted} 
                            onChange={(e) => updatePackage(pkg.id, 'isHighlighted', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                        </div>
                      )}
                    </div>

                    {pkg.isVisible && (
                      <div className="grid md:grid-cols-2 gap-12 font-sans">
                        <div className="space-y-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collection Title</label>
                            <input 
                              type="text" 
                              value={pkg.name} 
                              onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)}
                              className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg font-bold text-gray-700"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price Tag</label>
                            <input 
                              type="text" 
                              value={pkg.price} 
                              onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)}
                              className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg font-serif text-2xl text-indigo-700"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                            <textarea 
                              value={pkg.description} 
                              onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)}
                              className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg text-sm text-gray-600 h-24 resize-none italic"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inclusions (List Format)</label>
                          <textarea 
                            value={pkg.features.join('\n')} 
                            onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))}
                            className="p-4 border border-gray-100 bg-gray-50 focus:bg-white rounded-lg text-sm h-full leading-relaxed transition"
                            placeholder="Cinema Highlight Film&#10;Full-Length Edit&#10;Lead Photographer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
          <footer className="mt-20 text-center opacity-30">
            <p className="text-[10px] uppercase tracking-widest font-sans">Build Version {APP_VERSION}</p>
          </footer>
        </div>
      </div>
    );
  }

  if (view === 'preview') {
    if (isExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 font-sans">
          <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Proposal Expired</h1>
            <p className="text-gray-500 mb-8 leading-relaxed font-light italic">
              This quotation for <span className="font-bold text-gray-800">{proposalData.clientName}</span> has passed its 30-day validity window.
            </p>
            <div className="h-[1px] bg-gray-100 w-full mb-8"></div>
            <p className="text-sm text-gray-400 mb-8 uppercase tracking-widest font-bold font-sans">Contact The Spark Studios</p>
            <button className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg tracking-[0.2em] text-xs active:scale-95">
              Request Refined Quote
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen font-serif text-gray-900 bg-white selection:bg-yellow-100 relative">
        <div className="fixed top-6 left-6 right-6 z-50 flex justify-between pointer-events-none">
          <button 
            onClick={() => setView('editor')}
            className="pointer-events-auto bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-3 group px-6 active:scale-95"
          >
            <Edit3 size={18} className="text-indigo-600" />
            <span className="text-sm font-sans font-bold text-gray-700">Editor</span>
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className="pointer-events-auto bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-3 group px-6 active:scale-95"
          >
            <List size={18} className="text-gray-600" />
            <span className="text-sm font-sans font-bold text-gray-700">All Quotes</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative h-[75vh] flex items-center justify-center overflow-hidden bg-black">
          <div className="absolute inset-0 opacity-60">
            <img 
              src={proposalData.heroImage} 
              className="w-full h-full object-cover transform hover:scale-105 transition duration-[15s] ease-linear" 
              alt="Hero"
            />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h2 className="tracking-[0.6em] text-[10px] md:text-xs uppercase mb-6 opacity-70 font-sans font-bold">The Spark Studios</h2>
            <h1 className="text-6xl md:text-[7rem] mb-8 tracking-tighter leading-none">{proposalData.clientName}</h1>
            <p className="text-lg md:text-2xl italic opacity-90 font-light max-w-2xl mx-auto border-t border-white/20 pt-10 px-6">A Custom Fine-Art Proposal</p>
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <div className="w-[1px] h-16 bg-white"></div>
          </div>
        </div>

        {/* Vision Section */}
        <section className="max-w-5xl mx-auto py-36 px-6 text-center">
          <h2 className="text-[10px] tracking-[0.5em] uppercase text-[#b08d57] font-sans font-bold mb-16">The Creative Narrative</h2>
          <p className="text-3xl md:text-5xl leading-[1.5] text-gray-800 font-light italic">
            "{proposalData.visionStatement}"
          </p>
        </section>

        {/* Logistics Grid */}
        <section className="bg-[#fafaf9] py-28 px-6 border-y border-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className={`grid gap-10 ${
              proposalData.days.length === 1 ? 'md:grid-cols-1 max-w-lg mx-auto' :
              proposalData.days.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' :
              proposalData.days.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' : 'md:grid-cols-4'
            }`}>
              {proposalData.days.map((day) => (
                <div 
                  key={day.id} 
                  className={`relative p-12 bg-white rounded-3xl shadow-sm border transition-all duration-700 hover:shadow-2xl hover:-translate-y-3 ${
                    day.highlight ? 'ring-2 ring-[#b08d57]/20 border-[#b08d57]/20' : 'border-gray-100'
                  }`}
                >
                  <div className={`w-16 h-16 flex items-center justify-center rounded-2xl mb-10 ${day.highlight ? 'bg-[#b08d57] text-white shadow-xl' : 'bg-gray-50 text-gray-300'}`}>
                    {IconMap[day.icon] || <Clock size={32} />}
                  </div>
                  <h4 className="font-bold text-[10px] font-sans uppercase tracking-[0.4em] text-gray-400 mb-4">{day.label}</h4>
                  <p className="text-gray-900 text-sm font-sans font-bold mb-4 tracking-tight">{day.date}</p>
                  <p className={`text-xl font-serif italic ${day.highlight ? 'text-[#b08d57]' : 'text-gray-700'}`}>{day.desc}</p>
                  {day.highlight && (
                    <div className="mt-8 pt-8 border-t border-gray-50">
                      <p className="text-[11px] font-sans font-bold text-gray-300 uppercase tracking-[0.2em] leading-relaxed">
                        Full Day Coverage<br/>+ Elite Production Unit
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Collections */}
        <section className="max-w-7xl mx-auto py-40 px-6">
          <div className="text-center mb-28">
            <h2 className="text-6xl font-light mb-8">Wedding Collections</h2>
            <div className="flex items-center justify-center gap-6 text-[11px] font-sans font-bold text-gray-300 tracking-[0.5em] uppercase">
              <div className="h-[1px] w-16 bg-gray-100"></div>
              <span>Investment Framework</span>
              <div className="h-[1px] w-16 bg-gray-100"></div>
            </div>
          </div>

          <div className={`grid gap-12 items-stretch justify-center ${
            proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-xl mx-auto' :
            proposalData.packages.filter(p => p.isVisible).length === 2 ? 'md:grid-cols-2 max-w-6xl mx-auto' :
            'lg:grid-cols-3'
          }`}>
            {proposalData.packages.filter(p => p.isVisible).map((item) => (
              <div 
                key={item.id} 
                className={`relative flex flex-col p-14 rounded-[3rem] border transition-all duration-700 hover:shadow-[0_80px_120px_-30px_rgba(0,0,0,0.08)] ${
                  item.isHighlighted 
                    ? 'border-[#b08d57]/30 bg-white lg:scale-105 z-10 shadow-2xl' 
                    : 'border-gray-50 bg-white'
                }`}
              >
                {item.isHighlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#b08d57] text-white px-8 py-2.5 rounded-full text-[11px] font-bold font-sans tracking-[0.4em] shadow-xl">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="mb-14">
                  <h3 className="text-3xl font-light mb-4 tracking-tight">{item.name}</h3>
                  <div className="text-7xl font-serif mb-10 text-gray-900 tracking-tighter">{item.price}</div>
                  <p className="text-base text-gray-400 leading-relaxed italic pr-4 font-light">{item.description}</p>
                </div>

                <div className="flex-grow space-y-8 mb-14 border-t border-gray-50 pt-12">
                  {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-6 group">
                      <div className={`mt-1 flex-shrink-0 transition-all duration-300 ${item.isHighlighted ? 'text-[#b08d57]' : 'text-gray-100 group-hover:text-gray-300'}`}>
                        <CheckCircle size={22} />
                      </div>
                      <span className="text-base text-gray-600 leading-snug font-sans tracking-tight font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className={`w-full py-7 rounded-2xl font-bold text-[11px] font-sans tracking-[0.4em] uppercase transition-all duration-500 shadow-md active:scale-95 ${
                    item.isHighlighted 
                      ? 'bg-[#b08d57] text-white hover:bg-black' 
                      : 'bg-gray-900 text-white hover:bg-[#b08d57]'
                  }`}
                >
                  Secure the {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer & Finality */}
        <section className="bg-[#0a0a0a] text-white py-40 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-32 items-center">
              <div>
                <h3 className="text-5xl mb-12 italic leading-tight">Next Steps in<br/>Your Journey</h3>
                <p className="text-xl opacity-50 mb-16 font-light leading-relaxed max-w-md">
                  Your wedding is the overture of your family’s shared story. We are honored to be the ones tasked with preserving it.
                </p>
                <div className="space-y-12">
                  <div className="flex gap-8">
                    <div className="w-14 h-14 rounded-2xl border border-white/20 flex items-center justify-center shrink-0">
                      <Clock size={24} className="text-[#b08d57]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] tracking-[0.3em] font-sans uppercase mb-3">Investment Validity</h4>
                      <p className="text-sm opacity-40 font-sans font-light">This curated proposal remains active for 30 days. Current expiration: {new Date((proposalData.createdAt || Date.now()) + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}.</p>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center shrink-0">
                      <Award size={24} className="text-[#b08d57]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] tracking-[0.3em] font-sans uppercase mb-3">Booking Retainer</h4>
                      <p className="text-sm opacity-40 font-sans font-light">A 30% retainer confirms your dates in our exclusive studio calendar. Balance settled on event day.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white text-gray-900 p-16 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#b08d57]/5 rounded-bl-[4rem]"></div>
                <h4 className="text-4xl font-serif mb-8 italic">The Vision Call</h4>
                <p className="text-gray-500 mb-12 text-base leading-relaxed font-sans font-light pr-4">
                  Before we move forward, we suggest a private 15-minute consultation to walk through the flow of your events and align our creative direction.
                </p>
                <button className="w-full bg-[#b08d57] text-white py-6 rounded-3xl font-bold text-[11px] uppercase tracking-[0.4em] font-sans hover:bg-black transition-all shadow-xl shadow-[#b08d57]/20 active:scale-95">
                  Request Consultation
                </button>
              </div>
            </div>
            <div className="mt-40 pt-16 border-t border-white/5 text-center">
              <p className="text-[9px] uppercase tracking-[0.8em] opacity-20 font-sans">The Spark Studios © 2026 — Fine Art Cinema & Photography</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
};

export default App;