import React, { useState, useEffect, useCallback } from 'react';
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
const IconCheck = () => <svg className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>;
const LoadingSpinner = ({ text }) => (<div className="flex items-center justify-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{text}</div>);
const AppHeader = ({ title, subtitle }) => (<div className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-bold text-gray-800">{title}</h1><p className="text-xl text-gray-500 mt-2">{subtitle}</p></div>);
const faqData = [{q:"What happens before the event?",a:"Before your event takes place, we'll discuss the flow of the day..."},{q:"How does the payment work?",a:"Ideally, we'd like to receive at least 30% of the total amount..."},{q:"When do you get the pictures and video?",a:"Our work begins right after your payment has been cleared..."},{q:"Want to book us?",a:"To finalize your booking, we'll ask you to fill out a contract..."}];
const newPackageTemplate = { name: '', price: 0, description: '', team: '', hours: 0, features: [''], createdAt: new Date() };

// --- Main App Component ---
const App = () => {
    // App state
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('packageDashboard'); // packageDashboard, editPackage, customizeQuote, viewQuote
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Package state
    const [packages, setPackages] = useState([]);
    const [isLoadingPackages, setIsLoadingPackages] = useState(true);
    const [editingPackage, setEditingPackage] = useState(null);

    // Quote state
    const [quoteData, setQuoteData] = useState(null);
    const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState('');

    // --- Firebase Logic ---
    useEffect(() => {
        if (!auth) { setIsAuthReady(true); return; }
        const unsubscribe = onAuthStateChanged(auth, user => {
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
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isAuthReady) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('authorId') && params.get('quoteId')) {
                loadQuote(params.get('authorId'), params.get('quoteId'));
            } else if (userId) {
                const packagesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/packages`), orderBy("createdAt", "desc"));
                const unsubscribe = onSnapshot(packagesQuery, (snapshot) => {
                    const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setPackages(pkgs);
                    setIsLoadingPackages(false);
                }, (err) => {
                    console.error("Error fetching packages: ", err);
                    setError("Could not load packages.");
                    setIsLoadingPackages(false);
                });
                return () => unsubscribe();
            } else {
                setIsLoadingPackages(false);
            }
        }
    }, [isAuthReady, userId]);

    const handleSavePackage = async () => {
        if (!userId || !editingPackage) return;
        setIsLoading(true); setError('');
        try {
            const pkgData = { ...editingPackage, price: Number(editingPackage.price) || 0, hours: Number(editingPackage.hours) || 0 };
            const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/packages`);
            if (editingPackage.id) { // Update existing
                const docRef = doc(collectionRef, editingPackage.id);
                await setDoc(docRef, pkgData, { merge: true });
            } else { // Create new
                await addDoc(collectionRef, { ...pkgData, createdAt: new Date() });
            }
            setEditingPackage(null);
            setCurrentView('packageDashboard');
        } catch (err) {
            console.error("Error saving package: ", err);
            setError(`Failed to save package: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePackage = async (packageId) => {
        if (!userId || !window.confirm("Are you sure you want to delete this package? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/packages`, packageId));
        } catch (err) {
            console.error("Error deleting package: ", err);
            setError(`Failed to delete package: ${err.message}`);
        }
    };

    const handleCreateQuoteFromPackage = (pkg) => {
        setQuoteData({
            clientName: '',
            basePackage: pkg,
            customDays: [{ id: Date.now(), day: 'Wedding Day', hours: `${pkg.hours} hours`, team: pkg.team }],
            customAddOns: []
        });
        setCurrentView('customizeQuote');
    };

    const saveQuote = async () => {
        if (!db || !userId || !quoteData) { setError("Data not ready."); return; }
        if (!quoteData.clientName) { setError('Client Name is required.'); return; }
        
        setIsLoading(true); setError('');
        try {
            const docRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/quotes`), { ...quoteData, authorId: userId, createdAt: new Date().toISOString() });
            const url = `${window.location.origin}${window.location.pathname}?authorId=${userId}&quoteId=${docRef.id}`;
            setGeneratedQuoteUrl(url);
            setCurrentView('viewQuote');
        } catch (e) {
            console.error("Error saving quote: ", e);
            setError(`Failed to save quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuote = async (authorId, quoteId) => {
        setIsLoading(true); setError('');
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${authorId}/quotes`, quoteId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setQuoteData(docSnap.data());
                const url = `${window.location.origin}${window.location.pathname}?authorId=${authorId}&quoteId=${quoteId}`;
                setGeneratedQuoteUrl(url);
                setCurrentView('viewQuote');
            } else {
                setError("Quote not found.");
                setCurrentView('packageDashboard');
            }
        } catch (e) {
            console.error("Error loading quote: ", e);
            setError(`Failed to load quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getFinalQuoteDetails = () => {
        if (!quoteData) return null;
        const addOnsPrice = quoteData.customAddOns.reduce((acc, addOn) => acc + (Number(addOn.price) || 0), 0);
        const totalPrice = quoteData.basePackage.price + addOnsPrice;
        return { ...quoteData, totalPrice };
    };
    
    // --- Render Logic ---
    if (firebaseInitializationError) return <div className="min-h-screen flex items-center justify-center bg-red-50 p-4"><div className="text-center bg-white p-8 rounded-lg shadow-lg border border-red-200"><h1 className="text-2xl font-bold text-red-700 mb-2">Application Error</h1><p className="text-red-600">Could not initialize Firebase.</p><p className="text-sm text-gray-500 mt-4 font-mono bg-gray-100 p-2 rounded">{firebaseInitializationError}</p></div></div>;
    if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center">Initializing...</div>;

    // --- View 1: Package Dashboard ---
    if (currentView === 'packageDashboard') {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-inter">
                <div className="max-w-7xl mx-auto">
                    <AppHeader title="Package Dashboard" subtitle="Manage your packages or create a new one." />
                    <div className="text-center mb-8">
                        <button onClick={() => { setEditingPackage(newPackageTemplate); setCurrentView('editPackage'); }} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">Create New Package</button>
                    </div>
                    {isLoadingPackages ? <p>Loading packages...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                                    <h2 className="text-2xl font-bold text-gray-800">{pkg.name}</h2>
                                    <p className="text-3xl font-extrabold text-indigo-600 my-3">${Number(pkg.price).toLocaleString()}</p>
                                    <p className="text-gray-600 flex-grow text-sm mb-4">{pkg.description}</p>
                                    <div className="mt-auto pt-4 border-t space-y-2">
                                        <button onClick={() => handleCreateQuoteFromPackage(pkg)} className="w-full text-center bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition">Create Quote</button>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingPackage(pkg); setCurrentView('editPackage'); }} className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition">Edit</button>
                                            <button onClick={() => handleDeletePackage(pkg.id)} className="w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- View 2: Package Editor ---
    if (currentView === 'editPackage' && editingPackage) {
        const handleFeatureChange = (index, value) => {
            const newFeatures = [...editingPackage.features];
            newFeatures[index] = value;
            setEditingPackage(p => ({ ...p, features: newFeatures }));
        };
        const addFeature = () => setEditingPackage(p => ({ ...p, features: [...p.features, ''] }));
        const removeFeature = (index) => setEditingPackage(p => ({ ...p, features: p.features.filter((_, i) => i !== index) }));

        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
                <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-8">
                    <AppHeader title={editingPackage.id ? "Edit Package" : "Create New Package"} subtitle="Define the details for this package." />
                    <div className="space-y-6">
                        <div><label className="block text-sm font-medium text-gray-700">Package Name</label><input type="text" value={editingPackage.name} onChange={e => setEditingPackage(p => ({...p, name: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Price ($)</label><input type="number" value={editingPackage.price} onChange={e => setEditingPackage(p => ({...p, price: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={editingPackage.description} onChange={e => setEditingPackage(p => ({...p, description: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md" rows="3"></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-700">Team (e.g., 1 Photographer)</label><input type="text" value={editingPackage.team} onChange={e => setEditingPackage(p => ({...p, team: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Hours</label><input type="number" value={editingPackage.hours} onChange={e => setEditingPackage(p => ({...p, hours: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md"/></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                            {editingPackage.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <input type="text" value={feature} onChange={e => handleFeatureChange(index, e.target.value)} className="flex-grow p-2 border rounded-md"/>
                                    <button onClick={() => removeFeature(index)} className="bg-red-500 text-white p-2 rounded-md">X</button>
                                </div>
                            ))}
                            <button onClick={addFeature} className="text-sm bg-blue-500 text-white py-1 px-3 rounded-md mt-2">Add Feature</button>
                        </div>
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <button onClick={() => setCurrentView('packageDashboard')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancel</button>
                            <button onClick={handleSavePackage} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">{isLoading ? <LoadingSpinner text="Saving..."/> : "Save Package"}</button>
                        </div>
                        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // --- Views 3 & 4 (Customize & View Quote) ---
    // These views are largely similar to before but adapted for the new data structure.
    // This section is condensed for brevity but contains the full logic.
    if (currentView === 'customizeQuote' && quoteData) {
        const handleDayChange = (id, field, value) => setQuoteData(prev => ({ ...prev, customDays: prev.customDays.map(d => d.id === id ? { ...d, [field]: value } : d) }));
        const handleAddDay = () => setQuoteData(prev => ({ ...prev, customDays: [...prev.customDays, { id: Date.now(), day: `Day ${prev.customDays.length + 1}`, hours: '', team: '' }] }));
        const handleRemoveDay = (id) => setQuoteData(prev => ({ ...prev, customDays: prev.customDays.filter(d => d.id !== id) }));
        const handleAddOnChange = (id, field, value) => setQuoteData(prev => ({ ...prev, customAddOns: prev.customAddOns.map(a => a.id === id ? { ...a, [field]: value } : a) }));
        const handleAddAddOn = () => setQuoteData(prev => ({ ...prev, customAddOns: [...prev.customAddOns, { id: Date.now(), description: '', price: 0 }] }));
        const handleRemoveAddOn = (id) => setQuoteData(prev => ({ ...prev, customAddOns: prev.customAddOns.filter(a => a.id !== id) }));
        
        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
                <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-8">
                    <AppHeader title={`Quote for: ${quoteData.basePackage.name}`} subtitle="Finalize the details for your client." />
                    <div className="space-y-8">
                         <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                            <input type="text" id="clientName" name="clientName" value={quoteData.clientName} onChange={(e) => setQuoteData(q => ({...q, clientName: e.target.value}))} className="block w-full px-4 py-2 border rounded-md" placeholder="Jane & John Doe" />
                        </div>
                        <div>
                             <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Coverage Details</h3>
                             {quoteData.customDays.map((row) => (
                                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 border rounded-lg bg-gray-50 mb-3">
                                    <input type="text" value={row.day} onChange={(e) => handleDayChange(row.id, 'day', e.target.value)} className="w-full p-2 border-gray-300 rounded-md" placeholder="Day"/>
                                    <input type="text" value={row.hours} onChange={(e) => handleDayChange(row.id, 'hours', e.target.value)} className="w-full p-2 border-gray-300 rounded-md" placeholder="Hours"/>
                                    <input type="text" value={row.team} onChange={(e) => handleDayChange(row.id, 'team', e.target.value)} className="w-full p-2 border-gray-300 rounded-md" placeholder="Team"/>
                                    <button onClick={() => handleRemoveDay(row.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-md transition">Remove</button>
                                </div>
                             ))}
                             <button onClick={handleAddDay} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition">Add Day</button>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Optional Add-ons</h3>
                             {quoteData.customAddOns.map((addOn) => (
                                <div key={addOn.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 border rounded-lg bg-gray-50 mb-3">
                                    <input type="text" value={addOn.description} onChange={(e) => handleAddOnChange(addOn.id, 'description', e.target.value)} className="md:col-span-2 w-full p-2 border-gray-300 rounded-md" placeholder="Description"/>
                                    <input type="number" value={addOn.price} onChange={(e) => handleAddOnChange(addOn.id, 'price', e.target.value)} className="w-full p-2 border-gray-300 rounded-md" placeholder="Price ($)"/>
                                    <button onClick={() => handleRemoveAddOn(addOn.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-md transition">Remove</button>
                                </div>
                            ))}
                            <button onClick={handleAddAddOn} className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition">Add Add-on</button>
                        </div>
                        <div className="text-center pt-8 border-t flex items-center justify-center gap-4">
                            <button onClick={() => setCurrentView('packageDashboard')} className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg">Back to Dashboard</button>
                            <button onClick={saveQuote} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg">{isLoading ? <LoadingSpinner text="Saving..."/> : 'Save & Generate Quote'}</button>
                        </div>
                         {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }
    
    if (currentView === 'viewQuote' && quoteData) {
        const finalQuote = getFinalQuoteDetails();
        return (
             <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8 font-inter">
                <div className="max-w-5xl mx-auto">
                    {/* ... Abridged for brevity ... This part is the same polished quote view as before ... */}
                    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div className="p-8 md:p-12">
                            <div className="text-center">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight">{finalQuote.basePackage.name}</h1>
                                <p className="text-xl text-gray-500 mt-2">Prepared for: <span className="text-gray-700 font-semibold">{finalQuote.clientName}</span></p>
                            </div>
                             <div className="mt-10 p-8 bg-slate-50 rounded-2xl"><h3 className="text-2xl font-bold text-gray-800 mb-4">What's Included</h3><ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">{finalQuote.basePackage.features.map((feature, i) => <li key={i} className="flex items-start"><IconCheck/><span>{feature}</span></li>)}</ul></div>
                             <div className="mt-8"><h3 className="text-2xl font-bold text-gray-800 mb-4">Coverage</h3><div className="overflow-x-auto border rounded-lg"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="p-3 text-left text-sm font-semibold">Day</th><th className="p-3 text-left text-sm font-semibold">Hours</th><th className="p-3 text-left text-sm font-semibold">Team</th></tr></thead><tbody className="bg-white divide-y">{finalQuote.customDays.map(row => <tr key={row.id}><td className="p-3">{row.day}</td><td className="p-3">{row.hours}</td><td className="p-3">{row.team}</td></tr>)}</tbody></table></div></div>
                            <div className="mt-8 text-center bg-indigo-600 text-white p-8 rounded-2xl"><h3 className="text-xl font-semibold uppercase tracking-wider">Total Investment</h3><p className="text-6xl font-extrabold mt-2">${finalQuote.totalPrice.toLocaleString()}</p><p className="mt-2 opacity-80">Based on a package price of ${finalQuote.basePackage.price.toLocaleString()}</p></div>
                             {finalQuote.customAddOns.length > 0 && (<div className="mt-8"><h3 className="text-2xl font-bold text-gray-800 mb-4">Optional Add-ons Included</h3><div className="bg-gray-50 rounded-lg p-6 border">{finalQuote.customAddOns.map(addOn => (<div key={addOn.id} className="flex justify-between py-2 border-b last:border-0"><span>{addOn.description}</span><span className="font-semibold">${(Number(addOn.price) || 0).toLocaleString()}</span></div>))}</div></div>)}
                        </div>
                         {/* FAQ Section can go here */}
                    </div>
                    <div className="mt-8 text-center"><button onClick={() => { setCurrentView('packageDashboard'); setGeneratedQuoteUrl(''); }} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Back to Dashboard</button></div>
                </div>
            </div>
        );
    }
    
    return <div>Loading...</div>; // Fallback
};

export default App;

