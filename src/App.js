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
const WAQAR_PHOTO = "https://thesparkstudios.ca/wp-content/uploads/2026/04/waqar1.jpeg";

// --- Google Reviews Badge ---
const GoogleReviewsBadge = () => (
  <div className="inline-flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm mx-auto">
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#C5A059" className="text-[#C5A059]" />)}
    </div>
    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Google Reviews</span>
  </div>
);

// --- Review Carousel ---
const ReviewCarousel = ({ reviews }) => {
  const [current, setCurrent] = useState(0);
  const total = reviews.length;
  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  const review = reviews[current];

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="relative bg-white rounded-[3rem] border border-slate-50 shadow-sm overflow-hidden p-12 md:p-16 min-h-[320px] flex flex-col justify-between">
        <Quote className="absolute top-10 left-10 text-slate-50" size={80} strokeWidth={0.5} />
        
        {/* Stars */}
        <div className="flex gap-1 mb-6 relative z-10">
          {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#C5A059" className="text-[#C5A059]" />)}
        </div>

        {/* Review text */}
        <div className="relative z-10 flex-1">
          <p className="text-xl md:text-2xl text-[#333333] leading-[1.8] italic font-serif font-black">"{review.text}"</p>
        </div>

        {/* Author row */}
        <div className="relative z-10 flex items-center gap-5 border-t border-slate-50 pt-8 mt-8">
          {review.couplePhoto ? (
            <img 
              src={review.couplePhoto} 
              alt={review.author}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#C5A059]/30 shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#C5A059]/10 border-2 border-[#C5A059]/20 flex items-center justify-center shrink-0">
              <span className="text-[#C5A059] font-black text-lg font-sans">{review.author?.charAt(0) || '★'}</span>
            </div>
          )}
          <div>
            <p className="font-black text-[12px] uppercase tracking-[0.3em] text-[#C5A059] font-sans leading-none">{review.author}</p>
            {review.wedding && <p className="text-[10px] text-slate-400 tracking-widest uppercase font-black mt-1">{review.wedding}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <GoogleReviewsBadge />
          </div>
        </div>
      </div>

      {/* Navigation */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            onClick={prev}
            className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-[#C5A059] hover:border-[#C5A059] hover:text-white text-slate-500 transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#C5A059] w-6' : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-[#C5A059] hover:border-[#C5A059] hover:text-white text-slate-500 transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

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
    isActive: true,
    clientName: "Ayushi & Family",
    visionStatement: "To craft a cinematic narrative that encapsulates the vibrant tapestry of your wedding celebrations, weaving together the intimate moments, cultural richness, and joyous festivities into a timeless visual heirloom that resonates with love, tradition, and the unique spirit of her family.",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    loomUrl: "", 
    showVideoInvite: true,
    videoInviteText: "Hey Ayushi, watch this first",
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
        deliveryTimeline: "3–4 Months",
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
        deliveryTimeline: "3–5 Months",
        features: [
          "1 Professional Lead Photographer (2 Cameras / More Coverage)",
          "1 Professional Lead Videographer (with Multiple camera angles)",
          "Cinematic Highlight Film (each day)",
          "Full-Length Edited Documentary (each day)",
          "Unlimited Professionally Edited Photos",
          "Aerial Drone Cinematography",
          "Online Digital Gallery",
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
        deliveryTimeline: "6 Weeks Guaranteed",
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
      { 
        id: 1, 
        author: "Zeewarad", 
        wedding: "Nikkah & Pre-Shoot",
        couplePhoto: "",
        text: "Choosing Spark Studios to cover my event was one of the best decisions I have ever made. Waqar is truly a gem of a person and so easy to work with." 
      },
      { 
        id: 2, 
        author: "Hanni", 
        wedding: "Wedding",
        couplePhoto: "",
        text: "We are beyond happy with our wedding photos and videos. This team is incredibly talented, made us feel so comfortable in front of the camera, and truly brought our dream wedding to life." 
      },
      {
        id: 3,
        author: "Hafsa",
        wedding: "Wedding",
        couplePhoto: "",
        text: "They handled our event beautifully with exceptional professionalism. The photographer and videographer did an incredible job capturing every special moment. The entire experience was seamless and stress-free from start to finish."
      },
      {
        id: 4,
        author: "Haider",
        wedding: "Photo & Video Package",
        couplePhoto: "",
        text: "Waqar and his team are doing amazing work. Professional, great communication, and the picture quality was incredible. I expected one video — they delivered four, each with separate event highlights. The music selections were spot on. Would easily recommend them to anyone. You won't be disappointed."
      }
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
        .package-card-featured { box-shadow: 0 32px 80px rgba(197,160,89,0.18); }
      `}</style>

      {/* ---- ADMIN TOOLBAR ---- */}
      {isAdmin && view !== 'dashboard' && (
        <div className="sticky top-0 z-50 bg-slate-950 text-white px-6 py-3 flex items-center gap-4 text-xs font-sans font-black">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={14}/> Dashboard
          </button>
          <div className="flex-1"/>
          {view === 'preview' && <button onClick={() => setView('editor')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"><Edit3 size={14}/> Edit</button>}
          {view === 'editor' && (
            <>
              <button onClick={() => setView('preview')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"><Eye size={14}/> Preview</button>
              <button onClick={saveQuote} disabled={isSaving} className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b8934d] px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                {isSaving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>} {isSaving ? 'Saving...' : copyFeedback ? '✓ Saved' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ---- DASHBOARD ---- */}
      {view === 'dashboard' && isAdmin && (
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="text-4xl font-serif italic text-slate-950 font-black">Spark Portal</h1>
                <p className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase mt-2">Quote Management</p>
              </div>
              <button onClick={createNew} className="flex items-center gap-2 bg-slate-950 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#C5A059] transition-all">
                <Plus size={16}/> New Quote
              </button>
            </div>

            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-5 py-3 border border-slate-200 bg-white rounded-2xl text-sm outline-none focus:ring-1 focus:ring-slate-300 font-sans"
              />
            </div>

            {fbError && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-black flex items-center gap-2"><AlertCircle size={14}/>{fbError}</div>}

            {filteredQuotes.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <List size={40} className="mx-auto mb-4 opacity-30"/>
                <p className="text-sm font-black uppercase tracking-widest">{searchTerm ? 'No quotes match your search' : 'No quotes yet'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotes.map(quote => {
                  const status = getQuoteStatus(quote);
                  const isDeleting = deletingId === quote.id;
                  return (
                    <div key={quote.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 flex items-center gap-6 group hover:shadow-md transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-black text-slate-950 truncate">{quote.clientName || 'Untitled'}</h3>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${status.className}`}>{status.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                          <span><Eye size={10} className="inline mr-1"/>{quote.views || 0} views</span>
                          <span>Updated {getTimeAgo(quote.updatedAt)}</span>
                          {quote.lastViewedAt && <span>Last viewed {getTimeAgo(quote.lastViewedAt)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleQuoteActive(quote.id, quote.isActive !== false)}
                          title={quote.isActive === false ? 'Activate' : 'Deactivate'}
                          className={`p-2 rounded-xl transition-all ${quote.isActive === false ? 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600' : 'bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-500'}`}
                        >
                          <Power size={14}/>
                        </button>
                        <button
                          onClick={() => resetExpiry(quote.id)}
                          title="Reset expiry to today"
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all"
                        >
                          <RefreshCw size={14}/>
                        </button>
                        <button onClick={() => handleDuplicate(quote)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"><Copy size={14}/></button>
                        <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); setView('editor'); window.location.hash = `#/quote/${quote.id}`; }} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"><Edit3 size={14}/></button>
                        <button onClick={() => { setProposalData(quote); setCurrentQuoteId(quote.id); setView('preview'); window.location.hash = `#/quote/${quote.id}`; }} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"><Eye size={14}/></button>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}#/quote/${quote.id}`;
                            navigator.clipboard.writeText(url);
                            setCopyFeedback(true);
                            setTimeout(() => setCopyFeedback(false), 2000);
                          }}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all"
                        >
                          <Share2 size={14}/>
                        </button>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(quote.id)} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase">Confirm</button>
                            <button onClick={() => setDeletingId(null)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(quote.id)} className="p-2 rounded-xl bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-400 transition-all"><Trash2 size={14}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- EDITOR ---- */}
      {view === 'editor' && isAdmin && (
        <div className="max-w-4xl mx-auto p-8 space-y-10">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-6">
            <h2 className="text-2xl font-serif italic font-black text-slate-950 mb-2">Client & Proposal</h2>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Client Name</label>
              <input value={proposalData.clientName} onChange={e => updateField('clientName', e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-1 focus:ring-slate-300"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Vision Statement</label>
              <textarea rows={4} value={proposalData.visionStatement} onChange={e => updateField('visionStatement', e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-1 focus:ring-slate-300 resize-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Hero Image URL</label>
              <input value={proposalData.heroImage} onChange={e => updateField('heroImage', e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-1 focus:ring-slate-300"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Loom Video URL</label>
              <input value={proposalData.loomUrl} onChange={e => updateField('loomUrl', e.target.value)} placeholder="https://www.loom.com/share/..." className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-1 focus:ring-slate-300"/>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Show Video Invite</label>
              <button onClick={() => updateField('showVideoInvite', !proposalData.showVideoInvite)} className={`w-12 h-6 rounded-full transition-all relative ${proposalData.showVideoInvite ? 'bg-[#C5A059]' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${proposalData.showVideoInvite ? 'left-7' : 'left-1'}`}/>
              </button>
            </div>
            {proposalData.showVideoInvite && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Video Invite Text</label>
                <input value={proposalData.videoInviteText} onChange={e => updateField('videoInviteText', e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-1 focus:ring-slate-300"/>
              </div>
            )}
          </div>

          {/* Days Editor */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif italic font-black text-slate-950">Coverage Days</h2>
              <button onClick={addDay} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#C5A059] hover:text-slate-950 transition-colors"><Plus size={14}/> Add Day</button>
            </div>
            {proposalData.days.map(day => (
              <div key={day.id} className="border border-slate-100 rounded-2xl p-6 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Label</label>
                    <input value={day.label} onChange={e => updateDay(day.id, 'label', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date</label>
                    <input value={day.date} onChange={e => updateDay(day.id, 'date', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Description</label>
                    <input value={day.desc} onChange={e => updateDay(day.id, 'desc', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Highlight</label>
                  <button onClick={() => updateDay(day.id, 'highlight', !day.highlight)} className={`w-10 h-5 rounded-full transition-all relative ${day.highlight ? 'bg-[#C5A059]' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${day.highlight ? 'left-5' : 'left-0.5'}`}/>
                  </button>
                  <button onClick={() => removeDay(day.id)} className="ml-auto text-slate-300 hover:text-rose-400 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>

          {/* Packages Editor */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-6">
            <h2 className="text-2xl font-serif italic font-black text-slate-950">Packages</h2>
            {proposalData.packages.map(pkg => (
              <div key={pkg.id} className="border border-slate-100 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Name</label>
                    <input value={pkg.name} onChange={e => updatePackage(pkg.id, 'name', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Price</label>
                    <input value={pkg.price} onChange={e => updatePackage(pkg.id, 'price', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Delivery Timeline</label>
                  <input value={pkg.deliveryTimeline || ''} onChange={e => updatePackage(pkg.id, 'deliveryTimeline', e.target.value)} placeholder="e.g. 3–6 Months" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Description</label>
                  <textarea rows={2} value={pkg.description} onChange={e => updatePackage(pkg.id, 'description', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Features (one per line)</label>
                  <textarea rows={6} value={pkg.features.join('\n')} onChange={e => updatePackageFeatures(pkg.id, e.target.value.split('\n'))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none font-mono"/>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Highlighted</label>
                    <button onClick={() => updatePackage(pkg.id, 'isHighlighted', !pkg.isHighlighted)} className={`w-10 h-5 rounded-full transition-all relative ${pkg.isHighlighted ? 'bg-[#C5A059]' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pkg.isHighlighted ? 'left-5' : 'left-0.5'}`}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Visible</label>
                    <button onClick={() => updatePackage(pkg.id, 'isVisible', !pkg.isVisible)} className={`w-10 h-5 rounded-full transition-all relative ${pkg.isVisible ? 'bg-[#C5A059]' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pkg.isVisible ? 'left-5' : 'left-0.5'}`}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reviews Editor */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif italic font-black text-slate-950">Reviews</h2>
              <button onClick={() => setProposalData(prev => ({ ...prev, reviews: [...prev.reviews, { id: Date.now(), author: "Client Name", wedding: "Wedding", couplePhoto: "", text: "Review text here." }]}))} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#C5A059] hover:text-slate-950 transition-colors"><Plus size={14}/> Add Review</button>
            </div>
            {proposalData.reviews.map(review => (
              <div key={review.id} className="border border-slate-100 rounded-2xl p-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Author</label>
                    <input value={review.author} onChange={e => updateReview(review.id, 'author', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Wedding / Event Label</label>
                    <input value={review.wedding || ''} onChange={e => updateReview(review.id, 'wedding', e.target.value)} placeholder="e.g. South Asian Wedding 2024" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Couple Photo URL (optional)</label>
                  <input value={review.couplePhoto || ''} onChange={e => updateReview(review.id, 'couplePhoto', e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Review Text</label>
                  <textarea rows={3} value={review.text} onChange={e => updateReview(review.id, 'text', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/>
                </div>
                <button onClick={() => setProposalData(prev => ({ ...prev, reviews: prev.reviews.filter(r => r.id !== review.id)}))} className="text-slate-300 hover:text-rose-400 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>

          {/* Work Links Editor */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif italic font-black text-slate-950">Work Links</h2>
              <button onClick={() => setProposalData(prev => ({ ...prev, workLinks: [...prev.workLinks, { id: Date.now(), title: "New Link", url: "", note: "" }]}))} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#C5A059] hover:text-slate-950 transition-colors"><Plus size={14}/> Add Link</button>
            </div>
            {proposalData.workLinks.map(link => (
              <div key={link.id} className="border border-slate-100 rounded-2xl p-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Title</label>
                    <input value={link.title} onChange={e => updateWorkLink(link.id, 'title', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Note / Badge</label>
                    <input value={link.note || ''} onChange={e => updateWorkLink(link.id, 'note', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">URL</label>
                  <input value={link.url} onChange={e => updateWorkLink(link.id, 'url', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
                </div>
                <button onClick={() => setProposalData(prev => ({ ...prev, workLinks: prev.workLinks.filter(l => l.id !== link.id)}))} className="text-slate-300 hover:text-rose-400 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- PREVIEW / CLIENT VIEW ---- */}
      {view === 'preview' && (
        <div className="bg-[#fdfdfc]">

          {/* Expired / Not Found banners */}
          {notFound && (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
              <div className="text-center max-w-md">
                <XCircle size={48} className="mx-auto mb-6 text-slate-300"/>
                <h2 className="text-3xl font-serif italic font-black text-slate-950 mb-4">Proposal Not Found</h2>
                <p className="text-slate-500 text-sm">This proposal link is no longer available or may have been deactivated.</p>
              </div>
            </div>
          )}

          {isExpired && !notFound && (
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 text-center">
              <p className="text-amber-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle size={14}/> This proposal has expired. Please contact us for an updated quote.
              </p>
            </div>
          )}

          {!notFound && (
            <div>
              {/* HERO */}
              <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <img src={proposalData.heroImage} alt="Hero" className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80"/>
                </div>
                <div className="relative z-10 text-center px-8 max-w-4xl mx-auto">
                  <img src={LOGO_URL} alt="Spark Studios" className="h-16 mx-auto mb-16" style={{mixBlendMode: 'screen', opacity: 0.95}}/>
                  <p className="text-[10px] font-black text-white/60 tracking-[0.6em] uppercase mb-8">A Bespoke Proposal For</p>
                  <h1 className="text-6xl md:text-8xl font-serif italic text-white font-black leading-none mb-16">{proposalData.clientName}</h1>

                </div>
              </div>

              {/* LOOM VIDEO */}
              {proposalData.loomUrl && (
                <section className="bg-slate-950 py-24 md:py-32 px-8">
                  <div className="max-w-4xl mx-auto text-center">
                    <p className="text-[10px] font-black text-slate-500 tracking-[0.5em] uppercase mb-6">Personal Message</p>
                    <h2 className="text-4xl md:text-5xl font-serif italic text-white font-black mb-12">{proposalData.videoInviteText || "A Message For You"}</h2>
                    <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-black aspect-video">
                      {!videoStarted ? (
                        <div className="absolute inset-0 flex items-center justify-center cursor-pointer group" onClick={() => setVideoStarted(true)}>
                          <img src={proposalData.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30"/>
                          <div className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <Play size={28} className="text-slate-950 ml-1" fill="currentColor"/>
                          </div>
                        </div>
                      ) : (
                        <iframe
                          title="Personal message from Waqar"
                          src={proposalData.loomUrl.replace('share', 'embed') + '?autoplay=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true'}
                          className="w-full h-full"
                          frameBorder="0"
                          allowFullScreen
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* VISION */}
              <section className="max-w-4xl mx-auto py-24 md:py-32 px-8 text-center">
                <p className="text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase mb-8">The Vision</p>
                <p className="text-2xl md:text-3xl font-serif italic text-slate-800 leading-[1.7] font-black">{proposalData.visionStatement}</p>
              </section>

              {/* COVERAGE DAYS */}
              <section className="bg-slate-950 py-24 md:py-32 px-8">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-16 md:mb-24">
                    <h2 className="text-4xl md:text-6xl font-serif italic text-white font-black leading-none mb-8">Coverage Plan</h2>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.5em] uppercase">Your Days, Our Commitment</p>
                  </div>
                  <div className={`grid gap-6 ${proposalData.days.length <= 2 ? 'md:grid-cols-2' : proposalData.days.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                    {proposalData.days.map(day => (
                      <div key={day.id} className={`relative p-10 rounded-[2.5rem] border transition-all ${day.highlight ? 'bg-[#C5A059] border-[#C5A059] shadow-2xl shadow-[#C5A059]/30 scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        {day.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#C5A059] text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Main Day</div>}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-8 ${day.highlight ? 'bg-white/20 text-white' : 'bg-white/10 text-[#C5A059]'}`}>
                          {IconMap[day.icon] || <Clock size={18}/>}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${day.highlight ? 'text-white/70' : 'text-slate-500'}`}>{day.date}</p>
                        <h3 className={`text-3xl font-serif italic font-black mb-4 leading-none ${day.highlight ? 'text-white' : 'text-white'}`}>{day.label}</h3>
                        <p className={`text-sm font-black ${day.highlight ? 'text-white/80' : 'text-slate-400'}`}>{day.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* PACKAGES */}
              <section className="max-w-7xl mx-auto py-24 md:py-32 px-8">
                <div className="text-center mb-16 md:mb-24">
                  <h2 className="text-4xl md:text-6xl font-serif italic font-black text-slate-950 leading-none mb-8">Your Collection</h2>
                  <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">Three Paths to Perfection</p>
                </div>
                <div className={`grid gap-8 ${proposalData.packages.filter(p => p.isVisible).length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'}`}>
                  {proposalData.packages.filter(p => p.isVisible).map(item => (
                    <div key={item.id} className={`relative flex flex-col rounded-[3rem] border overflow-hidden transition-all ${item.isHighlighted ? 'bg-slate-950 border-[#C5A059]/30 package-card-featured' : 'bg-white border-slate-100 hover:shadow-xl'}`}>
                      {item.isHighlighted && (
                        <div className="bg-[#C5A059] text-white text-[9px] font-black tracking-[0.4em] uppercase py-3 text-center">Most Popular</div>
                      )}
                      <div className="p-10 md:p-14 flex flex-col flex-1">
                        <div className="mb-10">
                          <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-400'}`}>The</p>
                          <h3 className={`text-5xl font-serif italic font-black leading-none mb-2 ${item.isHighlighted ? 'text-white' : 'text-slate-950'}`}>{item.name}</h3>
                          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${item.isHighlighted ? 'text-[#C5A059]' : 'text-slate-300'}`}>Story</p>
                        </div>
                        <div className="mb-10">
                          <span className={`text-5xl md:text-6xl font-black ${item.isHighlighted ? 'text-white' : 'text-slate-950'}`}>{item.price}</span>
                        </div>

                        {/* Delivery Timeline Badge */}
                        {item.deliveryTimeline && (
                          <div className={`flex items-center gap-2 mb-8 px-4 py-3 rounded-2xl w-fit ${item.isHighlighted ? 'bg-white/10 text-white/80' : 'bg-[#C5A059]/8 text-[#C5A059]'}`}>
                            <Clock size={13} className={item.isHighlighted ? 'text-[#C5A059]' : 'text-[#C5A059]'}/>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Delivery: {item.deliveryTimeline}</span>
                          </div>
                        )}

                        <p className={`text-sm leading-relaxed mb-10 font-medium ${item.isHighlighted ? 'text-slate-400' : 'text-slate-500'}`}>{item.description}</p>
                        <div className="space-y-4 flex-1 mb-10">
                          {item.features.filter(f => f.trim()).map((feature, i) => (
                            <div key={i} className="flex items-start gap-4">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.isHighlighted ? 'bg-[#C5A059]/20' : 'bg-slate-50'}`}>
                                <Check size={11} className="text-[#C5A059]"/>
                              </div>
                              <p className={`text-[13px] leading-relaxed font-medium ${item.isHighlighted ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => openWhatsApp(`Hi Waqar! I'd like to book the ${item.name} Story.`)} className="w-full py-8 rounded-[2.5rem] font-black text-[11px] tracking-[0.5em] uppercase shadow-xl bg-[#121212] text-white hover:bg-[#C5A059] transition-all">Inquire Selection <MessageCircle size={20} className="inline-block ml-2" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* THE PROCESS */}
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

              {/* ---- ABOUT WAQAR ---- */}
              <section className="bg-slate-950 py-24 md:py-32 px-8 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
                    {/* Photo */}
                    <div className="relative">
                      <div className="relative rounded-[3rem] overflow-hidden aspect-[3/4] max-w-sm mx-auto md:mx-0 shadow-2xl">
                        <img 
                          src={WAQAR_PHOTO}
                          alt="Waqar — Founder, The Spark Studios"
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"/>
                        <div className="absolute bottom-8 left-8 right-8">
                          <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#C5A059" className="text-[#C5A059]"/>)}
                          </div>
                          <p className="text-white font-black text-[10px] uppercase tracking-[0.3em]">100+ Productions</p>
                        </div>
                      </div>
                      {/* Decorative accent */}
                      <div className="absolute -top-6 -right-6 w-32 h-32 border border-[#C5A059]/20 rounded-[2rem] hidden md:block"/>
                      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-[#C5A059]/10 rounded-2xl hidden md:block"/>
                    </div>

                    {/* Text */}
                    <div className="text-white">
                      <p className="text-[10px] font-black text-[#C5A059] tracking-[0.5em] uppercase mb-6">Behind the Lens</p>
                      <h2 className="text-5xl md:text-6xl font-serif italic font-black leading-none mb-10">
                        Meet Waqar.
                      </h2>
                      <div className="space-y-6 text-slate-300 text-base md:text-lg leading-relaxed font-medium">
                        <p>
                          I've had the privilege of being in the room for over a hundred weddings — from intimate Nikkah ceremonies to multi-day South Asian celebrations spanning hundreds of guests. Each one has shaped how I see, anticipate, and document the moments that matter most.
                        </p>
                        <p>
                          My approach is cinematic but never intrusive. I believe the camera should reveal what's already there — the unscripted glances, the emotion between the chaos — not manufacture it.
                        </p>
                        <p>
                          Every proposal I send is personal. Every film I deliver is built to last a lifetime.
                        </p>
                      </div>
                      <div className="mt-12 grid grid-cols-3 gap-6">
                        {[
                          { label: "Productions", value: "100+" },
                          { label: "Years Experience", value: "10+" },
                          { label: "Satisfaction", value: "5★" }
                        ].map((stat, i) => (
                          <div key={i} className="border border-white/10 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-serif italic font-black text-[#C5A059] mb-1">{stat.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SELECTED STORIES */}
              {proposalData.workLinks && proposalData.workLinks.length > 0 && (
                <section className="bg-slate-950 py-24 md:py-32 px-8 font-black border-t border-white/5">
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

              {/* KIND WORDS — now a carousel with Google badge */}
              <section className="bg-[#fafaf9] py-24 md:py-32 px-8 border-y border-slate-100">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-16 md:mb-20">
                    <h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-slate-950 leading-none font-black">Kind Words</h2>
                    <div className="flex flex-col items-center gap-4">
                      <GoogleReviewsBadge />
                      <p className="text-[11px] font-black text-slate-400 tracking-[0.5em] uppercase">Trusted by Spark Couples</p>
                    </div>
                  </div>
                  <ReviewCarousel reviews={proposalData.reviews} />
                </div>
              </section>

              {/* FOOTER */}
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
                  <div className="mt-32 md:mt-48 pt-20 border-t border-white/10 text-center font-black"><p className="text-[11px] uppercase tracking-[1em] opacity-40 font-black">The Spark Studios &copy; 2026</p></div>
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
