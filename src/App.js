import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, collection } from 'firebase/firestore';

// --- Firebase Configuration ---
var __firebase_config;
var __app_id;
var __initial_auth_token;

let app;
let auth;
let db;
let firebaseInitializationError = null;

// Correctly determine appId from Canvas or Vercel environment variables, with a fallback.
let appId = 'default-app-id';
if (typeof __app_id !== 'undefined') {
    appId = __app_id;
} else if (process.env.REACT_APP_APP_ID_FOR_FIRESTORE) {
    appId = process.env.REACT_APP_APP_ID_FOR_FIRESTORE;
}

try {
    let firebaseConfig;
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
    } else if (process.env.REACT_APP_FIREBASE_API_KEY) {
        firebaseConfig = {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
    } else {
        throw new Error("Firebase configuration was not provided by the environment.");
    }
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase config is missing apiKey or projectId.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("FATAL: Firebase initialization failed.", e);
    firebaseInitializationError = e.message;
}

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Helper Components & Initial State ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const AppHeader = ({ title, subtitle }) => (<div className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-bold text-amber-400">{title}</h1><p className="text-lg text-gray-400 mt-2">{subtitle}</p></div>);

const allInclusions = [
    'Unlimited edited photos',
    'Photo & video shoots within the agreed time frame',
    'Cinematic highlights film',
    'Full-length edited video',
    'Online delivery for approval',
    'Final delivery via online link',
    'Drone Coverage',
    'Content Creation & Next-Day Sneak Peek Reel',
    'Premium Keepsake Box — includes a premium engraved USB and 10 fine-art prints',
    'Faster Turnaround (3 Months)',
    'Fastest Turnaround (2 Months)',
    'Additional Crew (+1 Photographer & +1 Videographer)'
];

const allAddOns = [
    'Additional Photographer',
    'Additional Videographer',
    'Fast turn around - within 6-8 Weeks delivery',
    'Additional hours',
    'Live Streaming',
    'Content creation',
    'Wedding Album 12x34 (Premium)',
    'Wedding Album 12x34 (Regular)',
    'Projector Live Feed'
];


const faqData = [
    { q: "What happens before the event?", a: "Before your event takes place, we'll discuss the flow of the day and all the major details that will help our videographers and photographers capture everything perfectly. Any references for photoshoots, highlights, or mood boards should also be discussed during this stage." },
    { q: "How does the payment work?", a: "Ideally, we'd like to receive at least 30% of the total amount as soon as possible to secure your event date. The remaining balance can be paid on the day of the event." },
    { q: "When do you get the pictures and video?", a: "Our work begins right after your payment has been cleared, unless we've discussed a different arrangement. Our typical delivery time is between 3 to 6 months. While sometimes delivery can be much earlier, it's almost never delayed. Generally, pictures are delivered sooner than the video." },
    { q: "Want to book us?", a: "To finalize your booking, we'll ask you to fill out a contract. This document will clearly outline everything we've discussed, including prices, delivery times, booking fees, and all other terms. We look forward to the opportunity to work with you and help make your wedding memories truly unforgettable." }
];


const getNewPackage = (name) => ({
    id: Date.now() + Math.random(),
    name: name,
    days: [{ id: Date.now() + Math.random(), name: 'Wedding Day', hours: '', photographers: '', videographers: '' }],
    inclusions: allInclusions.reduce((acc, inclusion) => ({...acc, [inclusion]: false }), {}),
    addOns: allAddOns.reduce((acc, addOn) => ({...acc, [addOn]: false }), {}),
    price: ''
});

const initialPackages = [getNewPackage('Package 1'), getNewPackage('Package 2'), getNewPackage('Package 3')];

// --- Main App Component ---
const App = () => {
    // App state
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('loading'); // loading, configurator, viewQuote
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [openFaq, setOpenFaq] = useState(null);
    
    // Quote state
    const [packages, setPackages] = useState(() => {
        try {
            const savedPackages = localStorage.getItem('sparkStudiosConfigurator');
            return savedPackages ? JSON.parse(savedPackages) : initialPackages;
        } catch (error) {
            console.error("Failed to load packages from local storage:", error);
            return initialPackages;
        }
    });
    const [clientDetails, setClientDetails] = useState({ name: '', email: '' });
    const [quoteData, setQuoteData] = useState(null);

    // --- Firebase & App Initialization ---
    useEffect(() => {
        if (!auth) {
            setIsAuthReady(true);
            setCurrentView('configurator');
            return;
        }
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            setUserId(user ? user.uid : null);
            setIsAuthReady(true);
        });
        const signIn = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (err) { setError(`Authentication failed: ${err.message}`); }
        };
        signIn();
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quoteId = params.get('quoteId');
        if (quoteId) {
            loadQuote(quoteId);
        } else {
            setCurrentView('configurator');
        }
    }, []);
    
    // --- Save configuration to local storage ---
    useEffect(() => {
        try {
            localStorage.setItem('sparkStudiosConfigurator', JSON.stringify(packages));
        } catch (error) {
            console.error("Failed to save packages to local storage:", error);
        }
    }, [packages]);

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    // --- State Handlers ---
    const handlePackageChange = (pkgIndex, field, value) => {
        const newPackages = [...packages];
        newPackages[pkgIndex][field] = value;
        setPackages(newPackages);
    };
    
    const handleDayChange = (pkgIndex, dayIndex, field, value) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].days[dayIndex][field] = value;
        setPackages(newPackages);
    };

    const handleAddDay = (pkgIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].days.push({ id: Date.now() + Math.random(), name: '', hours: '', photographers: '', videographers: '' });
        setPackages(newPackages);
    };

    const handleRemoveDay = (pkgIndex, dayIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].days = newPackages[pkgIndex].days.filter((_, i) => i !== dayIndex);
        setPackages(newPackages);
    };

    const handleInclusionToggle = (pkgIndex, inclusionKey) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].inclusions[inclusionKey] = !newPackages[pkgIndex].inclusions[inclusionKey];
        setPackages(newPackages);
    };
    
    const handleAddOnToggle = (pkgIndex, addOnKey) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].addOns[addOnKey] = !newPackages[pkgIndex].addOns[addOnKey];
        setPackages(newPackages);
    };

    // --- Firestore Logic ---
    const handleGenerateQuote = async () => {
        if (!userId) { setError("You must be logged in."); return; }
        if (!clientDetails.name) { setError("Client Name is required."); return; }
        
        setIsLoading(true); setError('');
        try {
            const publicQuotesCollectionRef = collection(db, `artifacts/${appId}/public/data/weddingQuotes`);
            const quotePayload = {
                client: clientDetails,
                packages: packages,
                generatedAt: new Date().toISOString(),
                authorId: userId
            };
            const docRef = await addDoc(publicQuotesCollectionRef, quotePayload);
            const url = `${window.location.origin}${window.location.pathname}?quoteId=${docRef.id}`;
            
            window.open(url, '_blank');
            showMessage("Quote link generated and opened!");
            
        } catch (err) {
            console.error("Error generating quote link:", err); 
            setError(`Failed to generate quote link: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuote = async (quoteId) => {
        setCurrentView('loading');
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/weddingQuotes`, quoteId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setQuoteData(docSnap.data());
                setCurrentView('viewQuote');
            } else {
                setError("Quote not found.");
                setCurrentView('configurator');
            }
        } catch (err) {
            setError(`Failed to load quote: ${err.message}`);
        }
    };
    
    // --- Render Logic ---
    if (firebaseInitializationError) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400 p-4">{firebaseInitializationError}</div>;
    if (currentView === 'loading' || !isAuthReady) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400">Loading Configurator...</div>;

    // --- View 1: Configurator ---
    if (currentView === 'configurator') {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-8">
                <div className="max-w-screen-2xl mx-auto">
                    <AppHeader title="Quote Configurator" subtitle="Configure up to three packages for your client." />
                    
                    <div className="mb-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700 max-w-4xl mx-auto">
                        <h2 className="text-xl font-semibold mb-4 text-amber-400">Client Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" placeholder="Client Name" value={clientDetails.name} onChange={e => setClientDetails(c => ({...c, name: e.target.value}))} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                            <input type="email" placeholder="Client Email" value={clientDetails.email} onChange={e => setClientDetails(c => ({...c, email: e.target.value}))} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                            <button onClick={handleGenerateQuote} disabled={isLoading} className="bg-amber-500 text-black font-bold py-2 rounded-md hover:bg-amber-400 disabled:opacity-50">
                                {isLoading ? 'Generating...' : 'Generate Client Quote Link'}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-center mt-3 text-sm">{error}</p>}
                        {message && <p className="text-green-400 text-center mt-3 text-sm">{message}</p>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {packages.map((pkg, pkgIndex) => (
                            <div key={pkg.id} className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-6">
                                <input type="text" placeholder="Package Name" value={pkg.name} onChange={e => handlePackageChange(pkgIndex, 'name', e.target.value)} className="w-full bg-gray-700 text-amber-400 font-bold text-xl p-2 rounded-md"/>

                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-400">Coverage Days</h4>
                                    {pkg.days.map((day, dayIndex) => (
                                        <div key={day.id} className="p-3 bg-gray-900/50 rounded-md space-y-2">
                                            <input value={day.name} onChange={e => handleDayChange(pkgIndex, dayIndex, 'name', e.target.value)} type="text" placeholder="Day Name (e.g., Mehndi)" className="w-full bg-gray-700 text-sm p-1.5 rounded-md"/>
                                            <div className="grid grid-cols-3 gap-2">
                                                <input value={day.hours} onChange={e => handleDayChange(pkgIndex, dayIndex, 'hours', e.target.value)} type="text" placeholder="Hours" className="bg-gray-700 text-sm p-1.5 rounded-md"/>
                                                <input value={day.photographers} onChange={e => handleDayChange(pkgIndex, dayIndex, 'photographers', e.target.value)} type="text" placeholder="# Photo" className="bg-gray-700 text-base p-1.5 rounded-md"/>
                                                <input value={day.videographers} onChange={e => handleDayChange(pkgIndex, dayIndex, 'videographers', e.target.value)} type="text" placeholder="# Video" className="bg-gray-700 text-base p-1.5 rounded-md"/>
                                            </div>
                                            <button onClick={() => handleRemoveDay(pkgIndex, dayIndex)} className="text-xs text-red-400 hover:text-red-300 w-full text-right">Remove Day</button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddDay(pkgIndex)} className="text-sm text-amber-400 hover:text-amber-300 flex items-center"><PlusIcon/> Add Day</button>
                                </div>

                                <div className="space-y-2">
                                     <h4 className="font-semibold text-gray-400">What's Included</h4>
                                     <div className="max-h-48 overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                                        {Object.keys(pkg.inclusions).map((inclusionKey) => (
                                            <label key={inclusionKey} className="flex items-center space-x-3 p-1.5 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                                <input type="checkbox" checked={pkg.inclusions[inclusionKey]} onChange={() => handleInclusionToggle(pkgIndex, inclusionKey)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-amber-500 focus:ring-amber-500"/>
                                                <span className="text-sm text-gray-300">{inclusionKey}</span>
                                            </label>
                                        ))}
                                     </div>
                                </div>
                                
                                <div className="space-y-2">
                                     <h4 className="font-semibold text-gray-400">Add-on(s)</h4>
                                     <div className="max-h-48 overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                                        {Object.keys(pkg.addOns).map((addOnKey) => (
                                            <label key={addOnKey} className="flex items-center space-x-3 p-1.5 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                                <input type="checkbox" checked={pkg.addOns[addOnKey]} onChange={() => handleAddOnToggle(pkgIndex, addOnKey)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-amber-500 focus:ring-amber-500"/>
                                                <span className="text-sm text-gray-300">{addOnKey}</span>
                                            </label>
                                        ))}
                                     </div>
                                </div>
                                
                                <div>
                                     <h4 className="font-semibold text-gray-400">Total Price</h4>
                                     <input value={pkg.price} onChange={e => handlePackageChange(pkgIndex, 'price', e.target.value)} type="text" placeholder="$0" className="w-full bg-gray-700 border-amber-500 border text-amber-400 font-bold text-2xl p-2 rounded-md text-right"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    // --- View 2: Client-Facing Quote Page ---
    if (currentView === 'viewQuote' && quoteData) {
        const sortedPackages = [...quoteData.packages].sort((a,b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        const middleIndex = sortedPackages.length > 1 ? Math.floor(sortedPackages.length / 2) : 0;
        
        return (
            <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-8">
                 <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="mx-auto mb-4 flex items-center justify-center">
                            <img src="https://thesparkstudios.ca/wp-content/uploads/2025/01/logo@2x.png" alt="The Spark Studios Logo" className="h-16 w-auto" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-light text-gray-200 mt-2">Your Wedding Proposal</h2>
                        <p className="mt-4 text-gray-400">Prepared for: {quoteData.client.name}</p>
                    </div>
                    <div className={`grid grid-cols-1 lg:grid-cols-${sortedPackages.length} gap-8 items-start`}>
                        {sortedPackages.map((pkg, index) => (
                            <div key={pkg.id} className={`bg-gray-800/50 p-8 rounded-2xl border transition-all duration-300 ${index === middleIndex ? 'border-amber-400 scale-105 shadow-2xl shadow-amber-500/10' : 'border-gray-700'}`}>
                                {index === middleIndex && sortedPackages.length > 1 && <div className="text-center mb-4"><span className="bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase">Recommended</span></div>}
                                <h3 className="text-3xl font-bold text-center text-amber-400">{pkg.name}</h3>
                                <p className="text-5xl font-thin text-center my-6">${Number(pkg.price).toLocaleString()}</p>
                                
                                <div className="my-6">
                                    <h4 className="font-semibold text-center text-gray-400 uppercase text-xs tracking-widest mb-3">Coverage</h4>
                                    {pkg.days.map(day => (
                                        <div key={day.id} className="text-center text-sm text-gray-300 mb-2 last:mb-0">
                                            <p><strong>{day.name}</strong>: {day.hours} hours</p>
                                            <p className="text-xs text-gray-500">{day.photographers} Photo &bull; {day.videographers} Video</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <ul className="space-y-3 text-gray-300">
                                    {Object.entries(pkg.inclusions).filter(([_, checked]) => checked).map(([key]) => (
                                      <li key={key} className="flex items-start"><span className="text-amber-400 mr-3 mt-1">&#10003;</span><span>{key}</span></li>
                                    ))}
                                </ul>
                                
                                 {Object.entries(pkg.addOns).filter(([_, checked]) => checked).length > 0 &&
                                    <div className="mt-6 pt-4 border-t border-gray-700">
                                         <h4 className="font-semibold text-center text-gray-400 uppercase text-xs tracking-widest mb-3">Available Add-ons</h4>
                                         <ul className="space-y-3 text-gray-300">
                                            {Object.entries(pkg.addOns).filter(([_, checked]) => checked).map(([key]) => (
                                              <li key={key} className="flex items-start"><span className="text-amber-400/50 mr-3 mt-1">&#43;</span><span>{key}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                }
                            </div>
                        ))}
                    </div>
                     <div className="mt-16 pt-10 border-t border-gray-700/50">
                        <h2 className="text-3xl font-bold text-center text-amber-400 mb-8">Frequently Asked Questions</h2>
                        <div className="max-w-3xl mx-auto space-y-2">
                           {faqData.map((faq, index) => (
                                <div key={index} className="bg-gray-800/50 rounded-lg border border-gray-700">
                                    <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full flex justify-between items-center text-left text-lg p-4 font-semibold">
                                        <span>{faq.q}</span>
                                        <span className={`transform transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>&#9660;</span>
                                    </button>
                                    {openFaq === index && <div className="p-4 pt-0 text-gray-400 leading-relaxed"><p>{faq.a}</p></div>}
                                </div>
                           ))}
                        </div>
                    </div>
                     <div className="text-center mt-12 text-gray-500 text-sm">
                        <p>This quote was generated on {new Date(quoteData.generatedAt).toLocaleDateString()}.</p>
                    </div>
                 </div>
            </div>
        );
    }
    
    return <div>Something went wrong.</div>;
};

export default App;

