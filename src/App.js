import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Film, Clock, Award, CheckCircle, Calendar, 
  Zap, HardDrive, Plus, Trash2, Eye, Edit3, Save, 
  ChevronRight, ChevronLeft, Image as ImageIcon, Settings,
  Copy, Share2, AlertCircle, List, ArrowLeft, ExternalLink
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-spark-studios-quotes';

const EXPIRY_DAYS = 30;

const App = () => {
  const [view, setView] = useState('editor'); // 'editor', 'preview', 'dashboard'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

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
      { id: 4, label: "May 10th", date: "Sunday", desc: "8am — 1am Coverage", icon: "Zap", highlight: true },
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
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
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
        setLoading(true);
        
        if (!user) return; // Wait for auth

        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'quotes', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProposalData(data);
            
            // Check Expiry
            const thirtyDays = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
            if (Date.now() > data.createdAt + thirtyDays) {
              setIsExpired(true);
            }
            
            setView('preview');
          } else {
            console.error("Quote not found");
            setView('dashboard');
          }
        } catch (err) {
          console.error("Fetch error:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (user) checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user]);

  // --- FETCH ALL QUOTES FOR DASHBOARD ---
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'quotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotes(quotes);
    }, (err) => console.error("Snapshot error:", err));
    return () => unsubscribe();
  }, [user]);

  // --- HANDLERS ---
  const saveQuote = async () => {
    if (!user) return;
    setIsSaving(true);
    const id = currentQuoteId || proposalData.clientName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'quotes', id);
      const dataToSave = { ...proposalData, id };
      await setDoc(docRef, dataToSave);
      setCurrentQuoteId(id);
      window.location.hash = `#/quote/${id}`;
      // Success indicator could be added here
    } catch (err) {
      console.error("Save error:", err);
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
    document.execCommand('copy');
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  // --- RENDER HELPERS ---
  const IconMap = {
    Calendar: <Calendar size={20} />,
    Clock: <Clock size={20} />,
    Film: <Film size={20} />,
    Zap: <Zap size={20} />,
    Camera: <Camera size={20} />
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const DashboardView = () => (
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
            const expired = Date.now() > quote.createdAt + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            return (
              <div key={quote.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-full ${expired ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-400'}`}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{quote.clientName}</h3>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Created: {new Date(quote.createdAt).toLocaleDateString()}</span>
                      <span className={expired ? 'text-red-500 font-bold' : ''}>
                        {expired ? 'Expired' : `Expires: ${new Date(quote.createdAt + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toLocaleDateString()}`}
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
    </div>
  );

  const EditorView = () => (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans text-gray-800 pb-40">
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
            className="flex-1 md:flex-none bg-black text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg disabled:opacity-50"
          >
            {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Proposal"}
          </button>
          {currentQuoteId && (
            <button 
              onClick={() => setView('preview')}
              className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg"
            >
              <Eye size={18} /> View Preview
            </button>
          )}
        </div>
      </div>

      {currentQuoteId && (
        <div className="mb-10 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-indigo-700 text-sm">
            <Share2 size={16} />
            <span className="font-medium">Shareable Link: </span>
            <code className="bg-white/50 px-2 py-1 rounded">{`${window.location.origin}${window.location.pathname}#/quote/${currentQuoteId}`}</code>
          </div>
          <button onClick={copyLink} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 uppercase">
            <Copy size={14} /> Copy Link
          </button>
        </div>
      )}

      {/* Editor Content (Scrollable) */}
      <div className="space-y-12">
        {/* Basic Info */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Settings size={20} className="text-indigo-600" /> General Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</label>
              <input 
                type="text" 
                value={proposalData.clientName} 
                onChange={(e) => updateField('clientName', e.target.value)}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                placeholder="e.g. Ayushi & Family"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hero Image URL</label>
              <input 
                type="text" 
                value={proposalData.heroImage} 
                onChange={(e) => updateField('heroImage', e.target.value)}
                className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">The Vision Statement</label>
              <textarea 
                rows="3"
                value={proposalData.visionStatement} 
                onChange={(e) => updateField('visionStatement', e.target.value)}
                className="p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none italic text-gray-600"
              />
            </div>
          </div>
        </section>

        {/* Day Management */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" /> Schedule & Logistics
            </h2>
            <button onClick={addDay} className="text-xs bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 transition font-bold uppercase">
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
                <div className="space-y-4">
                  <input 
                    type="text" 
                    value={day.label} 
                    onChange={(e) => updateDay(day.id, 'label', e.target.value)}
                    className="w-full font-bold bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none"
                    placeholder="Day Label (e.g. Day 1)"
                  />
                  <input 
                    type="text" 
                    value={day.date} 
                    onChange={(e) => updateDay(day.id, 'date', e.target.value)}
                    className="w-full text-sm text-gray-500 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none"
                    placeholder="Date/Day"
                  />
                  <input 
                    type="text" 
                    value={day.desc} 
                    onChange={(e) => updateDay(day.id, 'desc', e.target.value)}
                    className="w-full text-sm text-indigo-600 bg-transparent border-b border-dashed border-gray-200 focus:border-indigo-500 outline-none font-medium"
                    placeholder="Coverage Details"
                  />
                  <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={day.highlight} 
                      onChange={(e) => updateDay(day.id, 'highlight', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intensive Coverage (8am-1am)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Packages Management */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
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
                    <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full">
                      <span className="text-[10px] font-bold uppercase text-indigo-600">Featured?</span>
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
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collection Title</label>
                        <input 
                          type="text" 
                          value={pkg.name} 
                          onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)}
                          className="p-3 border rounded-lg font-bold text-gray-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price Tag</label>
                        <input 
                          type="text" 
                          value={pkg.price} 
                          onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)}
                          className="p-3 border rounded-lg font-serif text-2xl text-indigo-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                        <textarea 
                          value={pkg.description} 
                          onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)}
                          className="p-3 border rounded-lg text-sm text-gray-600 h-24 resize-none italic"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inclusions (List Format)</label>
                      <textarea 
                        value={pkg.features.join('\n')} 
                        onChange={(e) => updatePackageFeatures(pkg.id, e.target.value.split('\n'))}
                        className="p-4 border rounded-lg text-sm h-full leading-relaxed bg-gray-50 focus:bg-white transition"
                        placeholder="Cinema Highlight Film&#10;Full-Length Edit&#10;Lead Photographer"
                      />
                      <p className="text-[10px] text-gray-400 mt-2 italic">Tip: Use one line for each item.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const PreviewView = () => {
    if (isExpired && view === 'preview') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 font-sans">
          <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Proposal Expired</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              This quotation for <span className="font-bold text-gray-800">{proposalData.clientName}</span> has passed its 30-day validity window.
            </p>
            <div className="h-[1px] bg-gray-100 w-full mb-8"></div>
            <p className="text-sm text-gray-400 mb-8 uppercase tracking-widest font-bold">Contact The Spark Studios</p>
            <button className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">
              Request Refined Quote
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen font-serif text-gray-900 bg-white selection:bg-yellow-100 relative">
        {/* Editor Controls Overlay */}
        <div className="fixed top-6 left-6 right-6 z-50 flex justify-between pointer-events-none">
          <button 
            onClick={() => setView('editor')}
            className="pointer-events-auto bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-3 group px-6"
          >
            <Edit3 size={18} className="text-indigo-600" />
            <span className="text-sm font-sans font-bold text-gray-700">Editor</span>
          </button>
          <div className="flex gap-3 pointer-events-auto">
             <button 
              onClick={() => setView('dashboard')}
              className="bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-full shadow-2xl hover:bg-white transition flex items-center gap-3 group px-6"
            >
              <List size={18} className="text-gray-600" />
              <span className="text-sm font-sans font-bold text-gray-700">All Quotes</span>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative h-[70vh] flex items-center justify-center overflow-hidden bg-black">
          <div className="absolute inset-0 opacity-60">
            <img 
              src={proposalData.heroImage} 
              className="w-full h-full object-cover transform hover:scale-105 transition duration-[12s]" 
              alt="Hero"
            />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h2 className="tracking-[0.5em] text-[10px] md:text-sm uppercase mb-6 opacity-80 font-sans">The Spark Studios</h2>
            <h1 className="text-5xl md:text-8xl mb-8 tracking-tighter leading-tight">{proposalData.clientName}</h1>
            <p className="text-lg md:text-2xl italic opacity-90 font-light max-w-2xl mx-auto border-t border-white/20 pt-8 px-6">A Custom Fine-Art Proposal</p>
          </div>
          {/* Scroll Down Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <div className="w-[1px] h-12 bg-white"></div>
          </div>
        </div>

        {/* Vision Section */}
        <section className="max-w-4xl mx-auto py-32 px-6 text-center">
          <h2 className="text-xs tracking-[0.4em] uppercase text-[#b08d57] font-sans font-bold mb-12">The Creative Vision</h2>
          <p className="text-2xl md:text-4xl leading-[1.6] text-gray-800 font-light italic">
            "{proposalData.visionStatement}"
          </p>
        </section>

        {/* Logistics Grid */}
        <section className="bg-[#fafaf8] py-24 px-6 border-y border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className={`grid gap-8 ${
              proposalData.days.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
              proposalData.days.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' :
              proposalData.days.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' : 'md:grid-cols-4'
            }`}>
              {proposalData.days.map((day) => (
                <div 
                  key={day.id} 
                  className={`relative p-10 bg-white rounded-2xl shadow-sm border transition-all duration-500 hover:shadow-xl hover:-translate-y-2 ${
                    day.highlight ? 'ring-2 ring-[#b08d57]/30 border-[#b08d57]/30' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-8 ${day.highlight ? 'bg-[#b08d57] text-white shadow-lg' : 'bg-gray-50 text-gray-300'}`}>
                    {IconMap[day.icon] || <Clock size={28} />}
                  </div>
                  <h4 className="font-bold text-xs font-sans uppercase tracking-[0.3em] text-gray-400 mb-3">{day.label}</h4>
                  <p className="text-gray-900 text-sm font-sans font-bold mb-3">{day.date}</p>
                  <p className={`text-lg font-serif italic ${day.highlight ? 'text-[#b08d57]' : 'text-gray-600'}`}>{day.desc}</p>
                  {day.highlight && (
                    <div className="mt-6 pt-6 border-t border-gray-50">
                      <p className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        Full Team Coverage<br/>+ Backup Systems Engaged
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Collections */}
        <section className="max-w-7xl mx-auto py-32 px-6">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-light mb-6">Wedding Collections</h2>
            <div className="flex items-center justify-center gap-4 text-xs font-sans font-bold text-gray-400 tracking-[0.4em] uppercase">
              <div className="h-[1px] w-12 bg-gray-200"></div>
              <span>Investment Details</span>
              <div className="h-[1px] w-12 bg-gray-200"></div>
            </div>
          </div>

          <div className={`grid gap-12 items-stretch justify-center ${
            proposalData.packages.filter(p => p.isVisible).length === 1 ? 'max-w-lg mx-auto' :
            proposalData.packages.filter(p => p.isVisible).length === 2 ? 'md:grid-cols-2 max-w-5xl mx-auto' :
            'lg:grid-cols-3'
          }`}>
            {proposalData.packages.filter(p => p.isVisible).map((item) => (
              <div 
                key={item.id} 
                className={`relative flex flex-col p-12 rounded-[2rem] border transition-all duration-700 hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.08)] ${
                  item.isHighlighted 
                    ? 'border-[#b08d57] bg-white lg:scale-105 z-10 shadow-2xl' 
                    : 'border-gray-100 bg-white'
                }`}
              >
                {item.isHighlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#b08d57] text-white px-6 py-2 rounded-full text-[10px] font-bold font-sans tracking-[0.3em] shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="mb-12">
                  <h3 className="text-3xl font-light mb-4">{item.name}</h3>
                  <div className="text-6xl font-serif mb-8 text-gray-900">{item.price}</div>
                  <p className="text-sm text-gray-500 leading-relaxed italic pr-4 font-light">{item.description}</p>
                </div>

                <div className="flex-grow space-y-6 mb-12 border-t border-gray-50 pt-10">
                  {item.features.filter(f => f.trim() !== "").map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-5">
                      <div className={`mt-1 flex-shrink-0 ${item.isHighlighted ? 'text-[#b08d57]' : 'text-gray-200'}`}>
                        <CheckCircle size={20} />
                      </div>
                      <span className="text-[15px] text-gray-700 leading-snug font-sans tracking-tight font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className={`w-full py-6 rounded-xl font-bold text-xs tracking-[0.4em] uppercase transition-all duration-500 font-sans shadow-md ${
                    item.isHighlighted 
                      ? 'bg-[#b08d57] text-white hover:bg-black hover:scale-[1.02]' 
                      : 'bg-gray-900 text-white hover:bg-[#b08d57] hover:scale-[1.02]'
                  }`}
                >
                  Secure the {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer & Booking Info */}
        <section className="bg-gray-900 text-white py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-24 items-center">
              <div>
                <h3 className="text-4xl mb-8 italic">Next Steps</h3>
                <p className="text-lg opacity-60 mb-12 font-light leading-relaxed">
                  Your wedding is more than a date on a calendar; it's the start of your shared family legacy. We'd love to hear more about the vision you've built for these three days.
                </p>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                      <Clock size={20} className="text-[#b08d57]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-widest font-sans uppercase mb-2">Quote Validity</h4>
                      <p className="text-sm opacity-50 font-sans">This custom proposal is valid for 30 days from today ({new Date(proposalData.createdAt).toLocaleDateString()}).</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                      <Award size={20} className="text-[#b08d57]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-widest font-sans uppercase mb-2">Retainer</h4>
                      <p className="text-sm opacity-50 font-sans">30% non-refundable retainer required to secure your specific three-day block.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white text-gray-900 p-12 rounded-[3rem] shadow-2xl">
                <h4 className="text-3xl font-serif mb-6 italic">Let's Connect</h4>
                <p className="text-gray-500 mb-10 text-sm leading-relaxed font-sans">
                  The best way to ensure we're the perfect fit is a quick 15-minute Vision Call. We'll answer any technical questions and discuss your aesthetic goals.
                </p>
                <button className="w-full bg-[#b08d57] text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] font-sans hover:bg-black transition-all">
                  Schedule Vision Call
                </button>
              </div>
            </div>
            <div className="mt-32 pt-12 border-t border-white/10 text-center">
              <p className="text-[10px] uppercase tracking-[0.8em] opacity-30 font-sans">The Spark Studios © 2026 — Fine Art Cinema</p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'dashboard' ? <DashboardView /> : view === 'editor' ? <EditorView /> : <PreviewView />}
    </div>
  );
};

export default App;