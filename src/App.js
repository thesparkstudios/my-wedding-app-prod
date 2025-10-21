import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, collection } from 'firebase/firestore';

// --- DATA: Pre-defined Wedding Packages ---
const packagesData = {
    essential: {
        name: 'Essential Collection',
        price: 2400,
        description: 'Perfect for intimate weddings or couples who want cinematic coverage without all the extras.',
        team: '1 Photographer + 1 Videographer',
        hours: 8,
        features: [
            'Unlimited professionally edited photos',
            'Cinematic Highlight Film (3–5 min)',
            'Full Feature Film (Full Day Edit)',
            'Online Gallery + Delivery (3–6 months)',
        ],
        addOnsLabel: 'Drone, Engagement E-Shoot, Content Creation, Albums',
    },
    classic: {
        name: 'Classic Collection',
        price: 3999,
        description: 'Our most popular choice — full-day cinematic coverage with story-driven visuals and content for social media.',
        team: '1 Photographer + 1 Videographer',
        hours: 10,
        features: [
            'Unlimited edited photos',
            'Cinematic Highlight Film (4–6 min)',
            'Full Feature Film (30–45 min)',
            'Drone Coverage included',
            'Content Creation (for Reels/TikToks)',
            'Engagement E-Shoot (1 hour)',
            'Online Gallery + Delivery (within 3 months)',
        ],
        idealFor: 'Ideal for couples who want a cinematic film and ready-to-post content.',
    },
    signature: {
        name: 'Signature Collection',
        price: 5499,
        description: 'For couples who want their wedding to feel like a feature film and social-media campaign combined.',
        team: '2 Photographers + 2 Videographers',
        hours: 14,
        features: [
            'Unlimited edited photos',
            'Cinematic Highlight Film (5–7 min)',
            'Full Feature Film (45–60 min)',
            'Drone Coverage included',
            'Dedicated Content Creator',
            'Engagement E-Shoot + Love Story Film',
            'Personalized Story & Timeline Consultation',
            'Luxury Keepsake Box (USB + 20 Fine Art Prints)',
            'Priority Editing Delivery (within 2 months)',
        ],
    },
};

// --- DATA: FAQ Content ---
const faqData = [
    {
        q: "What happens before the event?",
        a: "Before your event takes place, we'll discuss the flow of the day and all the major details that will help our videographers and photographers capture everything perfectly. Any references for photoshoots, highlights, or mood boards should also be discussed during this stage."
    },
    {
        q: "How does the payment work?",
        a: "Ideally, we'd like to receive at least 30% of the total amount as soon as possible to secure your event date. The remaining balance can be paid on the day of the event."
    },
    {
        q: "When do you get the pictures and video?",
        a: "Our work begins right after your payment has been cleared, unless we've discussed a different arrangement. Our typical delivery time is between 3 to 6 months. While sometimes delivery can be much earlier, it's almost never delayed. Generally, pictures are delivered sooner than the video."
    },
    {
        q: "Want to book us?",
        a: "To finalize your booking, we'll ask you to fill out a contract. This document will clearly outline everything we've discussed, including prices, delivery times, booking fees, and all other terms. We look forward to the opportunity to work with you and help make your wedding memories truly unforgettable."
    }
];


// --- Firebase Configuration ---
var __firebase_config;
var __app_id;
var __initial_auth_token;

let app;
let auth;
let db;
let firebaseInitializationError = null;

try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        const firebaseConfig = JSON.parse(__firebase_config);
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error("Firebase config is missing apiKey or projectId.");
        }
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        throw new Error("Firebase configuration was not provided by the environment.");
    }
} catch (e) {
    console.error("FATAL: Firebase initialization failed.", e);
    firebaseInitializationError = e.message;
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// --- Helper Components ---
const IconCheck = () => <svg className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>;
const LoadingSpinner = ({ text }) => (<div className="flex items-center justify-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{text}</div>);
const AppHeader = ({ title, subtitle }) => (<div className="text-center mb-10"><h1 className="text-4xl md:text-5xl font-bold text-gray-800">{title}</h1><p className="text-xl text-gray-500 mt-2">{subtitle}</p></div>);

const FAQItem = ({ q, a, isOpen, onClick }) => (
    <div className="border-b border-gray-200 py-4">
        <button onClick={onClick} className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-800">
            <span>{q}</span>
            <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        {isOpen && <p className="mt-3 text-gray-600 text-base leading-relaxed">{a}</p>}
    </div>
);


// --- Main App Component ---
const App = () => {
    // App state
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState('');
    const [currentStep, setCurrentStep] = useState('selectPackage'); // selectPackage, customizeQuote, viewQuote
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [urlCopyMessage, setUrlCopyMessage] = useState('');
    const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState('');
    const [openFaq, setOpenFaq] = useState(null);

    // Quote data state
    const getInitialQuoteData = () => ({
        clientName: '',
        selectedPackageKey: null,
        customDays: [],
        customAddOns: [],
    });
    const [quoteData, setQuoteData] = useState(getInitialQuoteData());

    // --- Effects for Auth and URL Loading ---
    useEffect(() => {
        if (!auth) {
            setIsAuthReady(true);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) setUserId(user.uid); else setUserId(null);
            setIsAuthReady(true);
        });
        const signIn = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (err) {
                console.error("Auth Error:", err);
                setAuthError(`Authentication failed: ${err.message}`);
            }
        };
        signIn();
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isAuthReady) {
            const params = new URLSearchParams(window.location.search);
            const authorId = params.get('authorId');
            const quoteId = params.get('quoteId');
            if (authorId && quoteId) {
                loadQuote(authorId, quoteId);
            } else {
                setCurrentStep('selectPackage');
                setQuoteData(getInitialQuoteData());
            }
        }
    }, [isAuthReady]);

    // --- Data Handling ---
    const handlePackageSelect = (packageKey) => {
        const pkg = packagesData[packageKey];
        setQuoteData({
            ...getInitialQuoteData(),
            selectedPackageKey: packageKey,
            customDays: [{ id: Date.now(), day: 'Wedding Day', hours: `${pkg.hours} hours`, videographer: pkg.team, photographer: '' }],
        });
        setCurrentStep('customizeQuote');
    };

    const handleInputChange = (e) => setQuoteData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleDayChange = (id, field, value) => setQuoteData(prev => ({ ...prev, customDays: prev.customDays.map(d => d.id === id ? { ...d, [field]: value } : d) }));
    const handleAddDay = () => setQuoteData(prev => ({ ...prev, customDays: [...prev.customDays, { id: Date.now(), day: `Day ${prev.customDays.length + 1}`, hours: '', videographer: '', photographer: '' }] }));
    const handleRemoveDay = (id) => setQuoteData(prev => ({ ...prev, customDays: prev.customDays.filter(d => d.id !== id) }));
    const handleAddOnChange = (id, field, value) => setQuoteData(prev => ({ ...prev, customAddOns: prev.customAddOns.map(a => a.id === id ? { ...a, [field]: value } : a) }));
    const handleAddAddOn = () => setQuoteData(prev => ({ ...prev, customAddOns: [...prev.customAddOns, { id: Date.now(), description: '', price: 0 }] }));
    const handleRemoveAddOn = (id) => setQuoteData(prev => ({ ...prev, customAddOns: prev.customAddOns.filter(a => a.id !== id) }));

    const getFinalQuoteDetails = () => {
        if (!quoteData.selectedPackageKey) return null;
        const basePackage = packagesData[quoteData.selectedPackageKey];
        const addOnsPrice = quoteData.customAddOns.reduce((acc, addOn) => acc + (parseFloat(addOn.price) || 0), 0);
        const totalPrice = basePackage.price + addOnsPrice;
        return { ...basePackage, ...quoteData, totalPrice };
    };

    // --- Firestore ---
    const saveQuote = async () => {
        if (!db || !userId) { setError("Database connection not ready."); return; }
        if (!quoteData.clientName || !quoteData.selectedPackageKey) { setError('Client Name and a selected package are required.'); return; }
        
        setIsLoading(true); setError('');
        try {
            const userQuotesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/weddingQuotes`);
            const docRef = await addDoc(userQuotesCollectionRef, { ...quoteData, authorId: userId, createdAt: new Date().toISOString() });
            const url = `${window.location.origin}${window.location.pathname}?authorId=${userId}&quoteId=${docRef.id}`;
            setGeneratedQuoteUrl(url);
            setCurrentStep('viewQuote');
        } catch (e) {
            console.error("Error saving document: ", e);
            setError(`Failed to save quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuote = async (authorId, quoteId) => {
        setIsLoading(true); setError('');
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${authorId}/weddingQuotes`, quoteId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setQuoteData(docSnap.data());
                const url = `${window.location.origin}${window.location.pathname}?authorId=${authorId}&quoteId=${quoteId}`;
                setGeneratedQuoteUrl(url);
                setCurrentStep('viewQuote');
            } else {
                setError("Quote not found.");
                setCurrentStep('selectPackage');
            }
        } catch (e) {
            console.error("Error loading document: ", e);
            setError(`Failed to load quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Render Logic ---
    if (firebaseInitializationError) return <div className="min-h-screen flex items-center justify-center bg-red-50 p-4"><div className="text-center bg-white p-8 rounded-lg shadow-lg border border-red-200"><h1 className="text-2xl font-bold text-red-700 mb-2">Application Error</h1><p className="text-red-600">Could not initialize Firebase.</p><p className="text-sm text-gray-500 mt-4 font-mono bg-gray-100 p-2 rounded">{firebaseInitializationError}</p></div></div>;
    if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center"><div className="flex items-center justify-center text-gray-600"><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Initializing...</div></div>;

    // --- Step 1: Package Selection Screen ---
    if (currentStep === 'selectPackage') {
        const packageEntries = Object.entries(packagesData);
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-inter">
                <div className="max-w-7xl mx-auto">
                    <AppHeader title="Select a Package" subtitle="Choose a starting point for your client's quote." />
                    <div className={`grid grid-cols-1 lg:grid-cols-${packageEntries.length} gap-8`}>
                        {packageEntries.map(([key, pkg]) => (
                            <div key={key} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                                <h2 className="text-3xl font-bold text-gray-800">{pkg.name}</h2>
                                <p className="text-4xl font-extrabold text-indigo-600 my-4">${pkg.price.toLocaleString()}</p>
                                <p className="text-gray-600 flex-grow">{pkg.description}</p>
                                <ul className="my-6 space-y-2 text-gray-700">
                                    {pkg.features.slice(0, 4).map((feature, i) => <li key={i} className="flex items-center"><IconCheck/><span>{feature}</span></li>)}
                                    {pkg.features.length > 4 && <li className="flex items-center"><IconCheck/><span>And {pkg.features.length - 4} more...</span></li>}
                                </ul>
                                <button onClick={() => handlePackageSelect(key)} className="mt-auto w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-300">Select & Customize</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    // --- Step 2: Customize Quote Screen ---
    if (currentStep === 'customizeQuote') {
        const selectedPackage = packagesData[quoteData.selectedPackageKey];
        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
                <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-8">
                    <AppHeader title={`Customizing: ${selectedPackage.name}`} subtitle="Adjust the details for your client." />
                    <div className="space-y-8">
                         <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                            <input type="text" id="clientName" name="clientName" value={quoteData.clientName} onChange={handleInputChange} className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Jane & John Doe" />
                        </div>
                        
                        <div>
                             <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Coverage Details</h3>
                             <div className="space-y-4">
                                {quoteData.customDays.map((row) => (
                                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 border rounded-lg bg-gray-50">
                                        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <input type="text" value={row.day} onChange={(e) => handleDayChange(row.id, 'day', e.target.value)} className="w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Day"/>
                                            <input type="text" value={row.hours} onChange={(e) => handleDayChange(row.id, 'hours', e.target.value)} className="w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Hours"/>
                                            <input type="text" value={row.videographer} onChange={(e) => handleDayChange(row.id, 'videographer', e.target.value)} className="w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Videographer"/>
                                            <input type="text" value={row.photographer} onChange={(e) => handleDayChange(row.id, 'photographer', e.target.value)} className="w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Photographer"/>
                                        </div>
                                        <button onClick={() => handleRemoveDay(row.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-md transition duration-200 w-full md:w-auto">Remove</button>
                                    </div>
                                ))}
                             </div>
                             <button onClick={handleAddDay} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-200">Add Day</button>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Optional Add-ons</h3>
                            <div className="space-y-4">
                                {quoteData.customAddOns.map((addOn) => (
                                    <div key={addOn.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 border rounded-lg bg-gray-50">
                                        <input type="text" value={addOn.description} onChange={(e) => handleAddOnChange(addOn.id, 'description', e.target.value)} className="md:col-span-2 w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Description"/>
                                        <input type="number" value={addOn.price} onChange={(e) => handleAddOnChange(addOn.id, 'price', e.target.value)} className="w-full px-2 py-1 border-gray-300 rounded-md" placeholder="Price ($)"/>
                                        <button onClick={() => handleRemoveAddOn(addOn.id)} className="md:col-start-4 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-md transition duration-200">Remove</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddAddOn} className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-200">Add Add-on</button>
                        </div>
                        
                        <div className="text-center pt-8 border-t flex items-center justify-center gap-4">
                            <button onClick={() => setCurrentStep('selectPackage')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg transition">Back to Packages</button>
                            <button onClick={saveQuote} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition transform hover:scale-105 disabled:opacity-50">
                                {isLoading ? <LoadingSpinner text="Saving..."/> : 'Save & Generate Quote'}
                            </button>
                        </div>
                         {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // --- Step 3: View Final Quote Screen ---
    if (currentStep === 'viewQuote') {
        const finalQuote = getFinalQuoteDetails();
        if (!finalQuote) return <div>Loading Quote...</div>; // Or an error state
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8 font-inter">
                <div className="max-w-5xl mx-auto">
                    {generatedQuoteUrl && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg mb-8 shadow-md" role="alert">
                            <div className="flex items-center justify-between">
                                <p><strong className="font-bold">Quote Link Ready!</strong> Share this with your client.</p>
                                <button onClick={() => { const ta=document.createElement('textarea');ta.value=generatedQuoteUrl;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);setUrlCopyMessage('Copied!');setTimeout(()=>setUrlCopyMessage(''),2000)}} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-xs ml-4 transition flex-shrink-0">{urlCopyMessage || 'Copy Link'}</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
                        <div className="p-8 md:p-12">
                            <div className="text-center">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight">{finalQuote.name}</h1>
                                <p className="text-xl text-gray-500 mt-2">Prepared for: <span className="text-gray-700 font-semibold">{finalQuote.clientName}</span></p>
                            </div>

                            <div className="mt-10 p-8 bg-slate-50 rounded-2xl">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">What's Included</h3>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    {finalQuote.features.map((feature, i) => <li key={i} className="flex items-start"><IconCheck/><span>{feature}</span></li>)}
                                </ul>
                            </div>
                            
                            <div className="mt-8">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">Coverage</h3>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="min-w-full"><thead className="bg-gray-50"><tr><th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase">Day</th><th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase">Hours</th><th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase">Team</th></tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {finalQuote.customDays.map(row => <tr key={row.id}><td className="py-4 px-4 text-gray-700">{row.day}</td><td className="py-4 px-4 text-gray-700">{row.hours}</td><td className="py-4 px-4 text-gray-700">{row.videographer}</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="mt-8 text-center bg-indigo-600 text-white p-8 rounded-2xl">
                                <h3 className="text-xl font-semibold uppercase tracking-wider">Total Investment</h3>
                                <p className="text-6xl font-extrabold mt-2">${finalQuote.totalPrice.toLocaleString()}</p>
                                <p className="mt-2 opacity-80">Based on a base price of ${finalQuote.price.toLocaleString()} + add-ons</p>
                            </div>
                            
                             {finalQuote.customAddOns.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Optional Add-ons Included</h3>
                                    <div className="bg-gray-50 rounded-lg p-6 border">
                                        {finalQuote.customAddOns.map(addOn => (<div key={addOn.id} className="flex justify-between items-center text-gray-700 py-2 border-b last:border-0"><span className="flex-1 pr-2">{addOn.description}</span><span className="font-semibold">${(parseFloat(addOn.price) || 0).toLocaleString()}</span></div>))}
                                    </div>
                                </div>
                            )}

                        </div>
                        
                        <div className="bg-slate-50 px-8 md:px-12 py-10">
                            <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Frequently Asked Questions</h2>
                            <div className="max-w-3xl mx-auto">
                                {faqData.map((faq, index) => <FAQItem key={index} q={faq.q} a={faq.a} isOpen={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} />)}
                            </div>
                        </div>

                    </div>
                    
                    <div className="mt-8 text-center">
                        <button onClick={() => { setCurrentStep('selectPackage'); setGeneratedQuoteUrl(''); setQuoteData(getInitialQuoteData()); }} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition">Create Another Quote</button>
                    </div>
                </div>
            </div>
        );
    }
};

export default App;

