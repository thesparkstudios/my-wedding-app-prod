import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

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

// --- Helper Components & Data ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const AppHeader = ({ title, subtitle }) => (<div className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-bold text-amber-400">{title}</h1><p className="text-lg text-gray-400 mt-2">{subtitle}</p></div>);
const newPackageTemplate = { name: '', price: '', description: '', inclusions: [''] };

// --- Main App Component ---
const App = () => {
    // App state
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('loading'); // loading, packageDashboard, editPackage, clientDetails, viewQuote
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Package state
    const [packages, setPackages] = useState([]);
    const [editingPackage, setEditingPackage] = useState(null);

    // Quote state
    const [clientDetails, setClientDetails] = useState({ name: '', email: '' });
    const [quoteData, setQuoteData] = useState(null);

    // --- Firebase & App Initialization ---
    useEffect(() => {
        if (!auth) {
            setIsAuthReady(true);
            setCurrentView('packageDashboard');
            return;
        }
        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (user) setUserId(user.uid); else setUserId(null);
            setIsAuthReady(true);
        });
        const signIn = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (err) { console.error("Auth Error:", err); setError(`Authentication failed: ${err.message}`); }
        };
        signIn();
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quoteId = params.get('quoteId');
        if (quoteId) {
            loadQuote(quoteId);
        } else if (userId) {
            setCurrentView('packageDashboard');
            const packagesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/packages`), orderBy("price"));
            const unsubscribePackages = onSnapshot(packagesQuery, (snapshot) => {
                setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (err) => {
                console.error("Error fetching packages: ", err);
                setError("Could not load packages.");
            });
            return () => unsubscribePackages();
        } else if (isAuthReady) {
            setCurrentView('packageDashboard');
        }
    }, [isAuthReady, userId]);

    const handleSavePackage = async () => {
        if (!userId || !editingPackage) return;
        setIsLoading(true); setError('');
        try {
            const pkgData = { ...editingPackage, price: Number(editingPackage.price) || 0, lastUpdated: new Date() };
            const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/packages`);
            if (editingPackage.id) {
                await setDoc(doc(collectionRef, editingPackage.id), pkgData, { merge: true });
            } else {
                await addDoc(collectionRef, { ...pkgData, createdAt: new Date() });
            }
            setEditingPackage(null);
            setCurrentView('packageDashboard');
        } catch (err) {
            setError(`Failed to save package: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePackage = async (packageId) => {
        if (!userId || !window.confirm("Are you sure you want to delete this package?")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/packages`, packageId));
        } catch (err) {
            setError(`Failed to delete package: ${err.message}`);
        }
    };

    const handleGenerateQuote = async () => {
        if (!userId) { setError("You must be logged in to generate a quote."); return; }
        if (!clientDetails.name || !clientDetails.email) { setError("Client Name and Email are required."); return; }
        if (packages.length === 0) { setError("You must create at least one package to generate a quote."); return; }
        
        setIsLoading(true); setError('');
        try {
            const publicQuotesCollectionRef = collection(db, `artifacts/${appId}/public/data/quotes`);
            const quotePayload = {
                client: clientDetails,
                packages: packages, // Save a snapshot of current packages
                generatedAt: new Date().toISOString(),
                authorId: userId
            };
            const docRef = await addDoc(publicQuotesCollectionRef, quotePayload);
            const url = `${window.location.origin}${window.location.pathname}?quoteId=${docRef.id}`;
            window.open(url, '_blank'); // Open the generated quote in a new tab
            
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
                setCurrentView('packageDashboard');
            }
        } catch (err) {
            setError(`Failed to load quote: ${err.message}`);
        }
    };
    
    // --- Render Logic ---
    if (firebaseInitializationError) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400 p-4">{firebaseInitializationError}</div>;
    if (currentView === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400">Loading...</div>;

    // --- View 1: Package Dashboard ---
    if (currentView === 'packageDashboard') {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-8">
                <div className="max-w-7xl mx-auto">
                    <AppHeader title="Package Dashboard" subtitle="Manage your offerings for The Spark Studios." />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {packages.map(pkg => (
                            <div key={pkg.id} className="bg-gray-800/50 p-6 rounded-xl shadow-lg flex flex-col border border-gray-700">
                                <h3 className="text-2xl font-bold text-amber-400">{pkg.name}</h3>
                                <p className="text-3xl font-light my-3">${pkg.price.toLocaleString()}</p>
                                <ul className="text-sm text-gray-400 space-y-1 flex-grow mb-4">
                                    {pkg.inclusions.slice(0, 4).map((inc, i) => <li key={i}>- {inc}</li>)}
                                    {pkg.inclusions.length > 4 && <li>...and more</li>}
                                </ul>
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => { setEditingPackage(pkg); setCurrentView('editPackage'); }} className="w-full bg-gray-700 hover:bg-gray-600 rounded-md py-2 text-sm font-semibold">Edit</button>
                                    <button onClick={() => handleDeletePackage(pkg.id)} className="w-full bg-red-900/50 hover:bg-red-900 rounded-md py-2 text-sm font-semibold">Delete</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingPackage(newPackageTemplate); setCurrentView('editPackage'); }} className="border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-800/50 hover:border-amber-400 hover:text-amber-400 transition min-h-[250px]">
                            <PlusIcon /> Create New Package
                        </button>
                    </div>
                    
                    <div className="max-w-2xl mx-auto bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
                         <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">Generate Quote Link</h3>
                         <div className="space-y-4">
                            <input type="text" placeholder="Client Primary Name" value={clientDetails.name} onChange={e => setClientDetails(c => ({...c, name: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                            <input type="email" placeholder="Client Email" value={clientDetails.email} onChange={e => setClientDetails(c => ({...c, email: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                            <button onClick={handleGenerateQuote} disabled={isLoading} className="w-full bg-amber-500 text-black font-bold py-3 rounded-md hover:bg-amber-400 disabled:opacity-50">
                                {isLoading ? 'Generating...' : 'Generate & Open Quote Link'}
                            </button>
                         </div>
                    </div>
                     {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                </div>
            </div>
        );
    }
    
    // --- View 2: Package Editor ---
    if (currentView === 'editPackage' && editingPackage) {
        const handleFeatureChange = (index, value) => setEditingPackage(p => ({ ...p, inclusions: p.inclusions.map((v, i) => i === index ? value : v) }));
        const addFeature = () => setEditingPackage(p => ({ ...p, inclusions: [...p.inclusions, ''] }));
        const removeFeature = (index) => setEditingPackage(p => ({ ...p, inclusions: p.inclusions.filter((_, i) => i !== index) }));
        return (
             <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-8">
                <div className="max-w-2xl mx-auto">
                    <AppHeader title={editingPackage.id ? "Edit Package" : "Create New Package"} subtitle="Define the details for this offering." />
                    <div className="space-y-6 bg-gray-800/50 p-8 rounded-xl shadow-lg border border-gray-700">
                        <input type="text" placeholder="Package Name" value={editingPackage.name} onChange={e => setEditingPackage(p => ({...p, name: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-3 text-lg font-bold"/>
                        <input type="number" placeholder="Price (e.g., 3999)" value={editingPackage.price} onChange={e => setEditingPackage(p => ({...p, price: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-3"/>
                        <textarea placeholder="Short Description" value={editingPackage.description} onChange={e => setEditingPackage(p => ({...p, description: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-3" rows="3"></textarea>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Inclusions</label>
                            {editingPackage.inclusions.map((inc, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <input type="text" value={inc} onChange={e => handleFeatureChange(index, e.target.value)} className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                                    <button onClick={() => removeFeature(index)} className="p-2 bg-gray-600 hover:bg-red-800 rounded-md">&times;</button>
                                </div>
                            ))}
                            <button onClick={addFeature} className="text-sm mt-2 flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md"><PlusIcon/>Add Inclusion</button>
                        </div>
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                            <button onClick={() => setCurrentView('packageDashboard')} className="bg-gray-700 hover:bg-gray-600 font-bold py-2 px-6 rounded-lg">Cancel</button>
                            <button onClick={handleSavePackage} disabled={isLoading} className="bg-amber-500 text-black font-bold py-2 px-6 rounded-lg">{isLoading ? 'Saving...' : 'Save Package'}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- View 3: Client-Facing Quote Page ---
    if (currentView === 'viewQuote' && quoteData) {
        const sortedPackages = [...quoteData.packages].sort((a,b) => a.price - b.price);
        const middleIndex = Math.floor(sortedPackages.length / 2);

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
                                {index === middleIndex && <div className="text-center mb-4"><span className="bg-amber-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</span></div>}
                                <h3 className="text-3xl font-bold text-center text-amber-400">{pkg.name}</h3>
                                <p className="text-5xl font-thin text-center my-6">${Number(pkg.price).toLocaleString()}</p>
                                <p className="text-center text-gray-400 text-sm mb-6 h-12">{pkg.description}</p>
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

