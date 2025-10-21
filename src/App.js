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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Helper Components & Initial State ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const AppHeader = ({ title, subtitle }) => (<div className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-bold text-amber-400">{title}</h1><p className="text-lg text-gray-400 mt-2">{subtitle}</p></div>);

const getNewPackage = (name) => ({
    id: Date.now() + Math.random(),
    name: name,
    days: [{ id: Date.now() + Math.random(), name: 'Wedding Day', hours: '', photographers: '', videographers: '' }],
    inclusions: [''],
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
    
    // Quote state
    const [packages, setPackages] = useState(initialPackages);
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

    const handleInclusionChange = (pkgIndex, incIndex, value) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].inclusions[incIndex] = value;
        setPackages(newPackages);
    };

    const handleAddInclusion = (pkgIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].inclusions.push('');
        setPackages(newPackages);
    };
    
    const handleRemoveInclusion = (pkgIndex, incIndex) => {
        const newPackages = [...packages];
        newPackages[pkgIndex].inclusions = newPackages[pkgIndex].inclusions.filter((_, i) => i !== incIndex);
        setPackages(newPackages);
    };

    // --- Firestore Logic ---
    const handleGenerateQuote = async () => {
        if (!userId) { setError("You must be logged in."); return; }
        if (!clientDetails.name) { setError("Client Name is required."); return; }
        
        setIsLoading(true); setError('');
        try {
            const publicQuotesCollectionRef = collection(db, `artifacts/${appId}/public/data/quotes`);
            const quotePayload = {
                client: clientDetails,
                packages: packages,
                generatedAt: new Date().toISOString(),
                authorId: userId
            };
            const docRef = await addDoc(publicQuotesCollectionRef, quotePayload);
            const url = `${window.location.origin}${window.location.pathname}?quoteId=${docRef.id}`;
            
            // Open link in new tab
            window.open(url, '_blank');
            showMessage("Quote link generated and opened!");
            
        } catch (err) {
            setError(`Failed to generate quote link: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuote = async (quoteId) => {
        setCurrentView('loading');
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/quotes`, quoteId);
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
                    
                    {/* Client Details & Generate Button */}
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

                    {/* Package Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {packages.map((pkg, pkgIndex) => (
                            <div key={pkg.id} className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-6">
                                {/* Package Name */}
                                <input type="text" placeholder="Package Name" value={pkg.name} onChange={e => handlePackageChange(pkgIndex, 'name', e.target.value)} className="w-full bg-gray-700 text-amber-400 font-bold text-xl p-2 rounded-md"/>

                                {/* Days */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-400">Coverage Days</h4>
                                    {pkg.days.map((day, dayIndex) => (
                                        <div key={day.id} className="p-3 bg-gray-900/50 rounded-md space-y-2">
                                            <input value={day.name} onChange={e => handleDayChange(pkgIndex, dayIndex, 'name', e.target.value)} type="text" placeholder="Day Name (e.g., Mehndi)" className="w-full bg-gray-700 text-sm p-1.5 rounded-md"/>
                                            <div className="grid grid-cols-3 gap-2">
                                                <input value={day.hours} onChange={e => handleDayChange(pkgIndex, dayIndex, 'hours', e.target.value)} type="text" placeholder="Hours" className="bg-gray-700 text-sm p-1.5 rounded-md"/>
                                                <input value={day.photographers} onChange={e => handleDayChange(pkgIndex, dayIndex, 'photographers', e.target.value)} type="text" placeholder="Photo" className="bg-gray-700 text-sm p-1.5 rounded-md"/>
                                                <input value={day.videographers} onChange={e => handleDayChange(pkgIndex, dayIndex, 'videographers', e.target.value)} type="text" placeholder="Video" className="bg-gray-700 text-sm p-1.5 rounded-md"/>
                                            </div>
                                            <button onClick={() => handleRemoveDay(pkgIndex, dayIndex)} className="text-xs text-red-400 hover:text-red-300 w-full text-right">Remove Day</button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddDay(pkgIndex)} className="text-sm text-amber-400 hover:text-amber-300 flex items-center"><PlusIcon/> Add Day</button>
                                </div>

                                {/* Inclusions */}
                                <div className="space-y-2">
                                     <h4 className="font-semibold text-gray-400">What's Included</h4>
                                     {pkg.inclusions.map((inc, incIndex) => (
                                         <div key={incIndex} className="flex items-center gap-2">
                                             <input value={inc} onChange={e => handleInclusionChange(pkgIndex, incIndex, e.target.value)} type="text" placeholder="Feature..." className="flex-grow bg-gray-700 text-sm p-1.5 rounded-md"/>
                                             <button onClick={() => handleRemoveInclusion(pkgIndex, incIndex)} className="text-red-400 hover:text-red-300 p-1">&times;</button>
                                         </div>
                                     ))}
                                     <button onClick={() => handleAddInclusion(pkgIndex)} className="text-sm text-amber-400 hover:text-amber-300 flex items-center"><PlusIcon/> Add Inclusion</button>
                                </div>
                                
                                {/* Pricing */}
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
                        <h1 className="text-2xl font-bold text-amber-400">The Spark Studios</h1>
                        <h2 className="text-4xl md:text-5xl font-light text-gray-200 mt-2">Your Wedding Proposal</h2>
                        <p className="mt-4 text-gray-400">Prepared for: {quoteData.client.name}</p>
                    </div>
                    <div className={`grid grid-cols-1 lg:grid-cols-${sortedPackages.length} gap-8 items-start`}>
                        {sortedPackages.map((pkg, index) => (
                            <div key={pkg.id} className={`bg-gray-800/50 p-8 rounded-2xl border transition-all duration-300 ${index === middleIndex ? 'border-amber-400 scale-105 shadow-2xl shadow-amber-500/10' : 'border-gray-700'}`}>
                                {index === middleIndex && sortedPackages.length > 1 && <div className="text-center mb-4"><span className="bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</span></div>}
                                <h3 className="text-3xl font-bold text-center text-amber-400">{pkg.name}</h3>
                                <p className="text-5xl font-thin text-center my-6">${Number(pkg.price).toLocaleString()}</p>
                                
                                <div className="my-6">
                                    <h4 className="font-semibold text-center text-gray-400 uppercase text-xs tracking-widest mb-3">Coverage</h4>
                                    {pkg.days.map(day => (
                                        <div key={day.id} className="text-center text-sm text-gray-300">
                                            <p><strong>{day.name}</strong>: {day.hours} hours</p>
                                            <p className="text-xs text-gray-500">{day.photographers} Photo &bull; {day.videographers} Video</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <ul className="space-y-3 text-gray-300">
                                    {pkg.inclusions.map((inc, i) => <li key={i} className="flex items-start"><span className="text-amber-400 mr-3 mt-1">&#10003;</span><span>{inc}</span></li>)}
                                </ul>
                            </div>
                        ))}
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

