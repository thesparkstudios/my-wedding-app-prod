import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { Camera, Video, Film, Plane, Image, GalleryHorizontal, HardDrive, Clock, Clapperboard, Download, Link as LinkIcon, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';

// Define Firebase configuration variables based on environment
// eslint-disable-next-line no-var
var __firebase_config; // Injected by Canvas
// eslint-disable-next-line no-var
var __app_id; // Injected by Canvas
// eslint-disable-next-line no-var
var __initial_auth_token; // Injected by Canvas

let firebaseConfig = {};
let appId = 'default-app-id'; // Default for local dev or if no env var
let initialAuthToken = null; // Will be populated by Canvas runtime or null

// Prioritize Canvas environment (which injects __variables)
if (typeof __firebase_config !== 'undefined') {
    try {
        firebaseConfig = JSON.parse(__firebase_config);
    } catch (e) {
        console.error("Error parsing __firebase_config from Canvas:", e);
        // Fallback to process.env for local/Vercel if Canvas parsing fails
        firebaseConfig = {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
    }
} else {
    // Use process.env for Vercel or other server-side environments
    firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
}

// Logic for appId for Firestore collection path
if (typeof __app_id !== 'undefined') {
    appId = __app_id; // Value injected by Canvas
} else if (process.env.REACT_APP_APP_ID_FOR_FIRESTORE) { // Direct access
    appId = process.env.REACT_APP_APP_ID_FOR_FIRESTORE; // Env var from Vercel for Firestore path
}

// Logic for initial auth token (Canvas specific)
if (typeof __initial_auth_token !== 'undefined') {
    initialAuthToken = __initial_auth_token;
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Collection reference for public quotes
const quotesCollectionRef = collection(db, `artifacts/${appId}/public/data/weddingQuotes`);

// Core service options with their base prices (Icons are HERE, not in state)
const serviceOptions = [
    { id: 'photography_only', label: 'Photography Only', icon: Camera },
    { id: 'videography_only', label: 'Videography Only', icon: Video },
    { id: 'photography_videography', label: 'Photography + Videography', icon: Film },
];

// Inclusions data with icons (Icons are HERE, not in state)
const allInclusions = [
    { id: 'droneUpgrade', text: 'Drone upgrade included', price: 450, icon: Plane }, 
    { id: 'highRes', text: 'High-resolution Photos and Videos', icon: Image }, 
    { id: 'unlimitedEditedPhotos', text: 'Unlimited edited photos', icon: GalleryHorizontal },
    { id: 'rawPhotos', text: 'Raw photos', icon: HardDrive },
    { id: 'shootsWithinTimeframe', text: 'Photo shoots and video shoots within the above-mentioned time frame', icon: Clock },
    { id: 'highlightsFilm', text: '1 combined or separate wedding highlights film of all the events', icon: Clapperboard },
    { id: 'fullLengthVideo', text: 'Separate full-length edited video of the day', icon: Video },
    { id: 'onlineDeliveryApproval', text: 'Online videos or/and photos delivery for approval', icon: LinkIcon },
    { id: 'finalDelivery', text: 'Final videos or/and photos delivered in an online link', icon: Download },
];

// Define quote validity duration in days
const QUOTE_VALIDITY_DAYS = 15;

// Define the ADMIN_PASSWORD here. **CHANGE THIS TO A STRONG PASSWORD IN PRODUCTION**
const ADMIN_PASSWORD = "your_secure_admin_password"; 


// Main App component
const App = () => {
    // State for password protection
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // State for Firebase and user
    const [firebaseDb, setFirebaseDb] = useState(null);
    const [firebaseAuth, setFirebaseAuth] = useState(null); 
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState('');

    // State to manage the current quote details (for creation or viewing)
    const [quoteDetails, setQuoteDetails] = useState(() => {
        const defaultServiceType = serviceOptions[2].id; // Default to Photography + Videography

        return {
            clientName: '',
            packageName: 'Custom Package',
            serviceType: defaultServiceType, 
            basePrice: 0, 
            addOns: [], 
            inclusions: allInclusions.map(inc => ({
                id: inc.id,
                text: inc.text,
                price: inc.price || null, // Changed to null if no price, to prevent '0' display
                selected: inc.id === 'highRes' || inc.id === 'shootsWithinTimeframe' ||
                          inc.id === 'highlightsFilm' || inc.id === 'fullLengthVideo' ||
                          inc.id === 'onlineDeliveryApproval' || inc.id === 'finalDelivery'
            })),
            tableData: [ 
                { id: Date.now(), day: 'Day 1', hours: '4 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' },
                { id: Date.now() + 1, day: 'Day 2', hours: '10 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' }
            ],
            companyEmail: 'info@thesparkstudios.ca',
            introMessage: "Thank you for your interest in our services. Based on the information you provided, we have prepared the following quote for you. We are pleased to confirm our availability for your event date and would be delighted to assist you. Please feel free to reach out if you have any questions or if there is anything you would like to discuss further. We look forward to the opportunity to work with you.",
            validUntil: null // New field for quote validity timestamp
        };
    });

    // States for general app functionality
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [copyMessage, setCopyMessage] = useState('');
    const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState('');
    const [isViewingQuote, setIsViewingQuote] = useState(false);
    const [currentQuoteId, setCurrentQuoteId] = useState(''); 

    // --- Firebase Initialization and Authentication ---
    useEffect(() => {
        const initFirebase = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Firebase Auth Error:", error);
                setAuthError(`Authentication failed: ${error.message}`);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setFirebaseDb(db);
                setFirebaseAuth(auth);
                setIsAuthReady(true);
                setAuthError(''); 
            } else {
                setUserId(null);
                setFirebaseDb(null);
                setFirebaseAuth(null);
                setIsAuthReady(true); 
            }
        });

        initFirebase(); 

        return () => unsubscribe();
    }, []);

    // loadQuote function definition, memoized with useCallback.
    const loadQuote = useCallback(async (id) => {
        if (!firebaseDb) {
            setApiError("Firebase database not initialized.");
            return;
        }

        setIsLoading(true);
        setApiError('');
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/weddingQuotes`, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const loadedData = docSnap.data();
                // When loading, reconstruct the inclusions array to include 'icon' components for display
                const reconstructedInclusions = loadedData.inclusions.map(inc => {
                    const originalInclusion = allInclusions.find(item => item.id === inc.id);
                    // Ensure 'price' is a number or null
                    return originalInclusion ? { ...inc, icon: originalInclusion.icon, price: inc.price || null } : inc;
                });
                
                setQuoteDetails({
                    ...loadedData,
                    inclusions: reconstructedInclusions,
                });
                setGeneratedQuoteUrl(`${window.location.origin}/?quoteId=${id}`); 
                setApiError(''); 
            } else {
                console.log("No such document!");
                setApiError("Quote not found. Please check the URL.");
                setIsViewingQuote(false); 
                // Reset to default new quote state when quote not found
                setQuoteDetails(() => {
                    const defaultServiceType = serviceOptions[2].id;
                    return {
                        clientName: '',
                        packageName: 'Custom Package',
                        serviceType: defaultServiceType,
                        basePrice: 0, // Reset to 0 for manual input
                        addOns: [],
                        inclusions: allInclusions.map(inc => ({
                            id: inc.id,
                            text: inc.text,
                            price: inc.price || null, 
                            selected: inc.id === 'highRes' || inc.id === 'shootsWithinTimeframe' ||
                                      inc.id === 'highlightsFilm' || inc.id === 'fullLengthVideo' ||
                                      inc.id === 'onlineDeliveryApproval' || inc.id === 'finalDelivery'
                        })),
                        tableData: [
                            { id: Date.now(), day: 'Day 1', hours: '4 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' },
                            { id: Date.now() + 1, day: 'Day 2', hours: '10 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' }
                        ],
                        companyEmail: 'info@thesparkstudios.ca',
                        introMessage: "Thank you for your interest in our services. Based on the information you provided, we have prepared the following quote for you. We are pleased to confirm our availability for your event date and would be delighted to assist you. Please feel free to reach out if you have any questions or if there is anything you would like to discuss further. We look forward to the opportunity to work with you."
                    };
                });
            }
        } catch (e) {
            console.error("Error getting document:", e);
            setApiError(`Failed to load quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [firebaseDb, appId, setQuoteDetails]);


    // --- URL Handling and Quote Loading ---
    useEffect(() => {
        // This useEffect runs once Firebase is ready and also manages client-side view based on URL.
        // It needs to trigger password authentication if no quoteId is present.
        if (isAuthReady && firebaseDb) {
            const urlParams = new URLSearchParams(window.location.search);
            const quoteIdFromUrl = urlParams.get('quoteId');

            if (quoteIdFromUrl) {
                // If quoteId is present, this is a client viewing a shared quote.
                // We show the quote directly, no password needed for clients.
                setCurrentQuoteId(quoteIdFromUrl);
                setIsViewingQuote(true); 
                loadQuote(quoteIdFromUrl);
                setIsAuthenticated(true); // Authenticate directly for client view
            } else {
                // If no quoteId, this is the owner accessing the app.
                // Keep isAuthenticated as false initially to show password screen.
                setIsViewingQuote(false); 
                setGeneratedQuoteUrl(''); 
                // Reset to default new quote state for owner's creation form
                setQuoteDetails(() => {
                    const defaultServiceType = serviceOptions[2].id;
                    return {
                        clientName: '',
                        packageName: 'Custom Package',
                        serviceType: defaultServiceType,
                        basePrice: 0, 
                        addOns: [],
                        inclusions: allInclusions.map(inc => ({
                            id: inc.id,
                            text: inc.text,
                            price: inc.price || null, 
                            selected: inc.id === 'highRes' || inc.id === 'shootsWithinTimeframe' ||
                                      inc.id === 'highlightsFilm' || inc.id === 'fullLengthVideo' ||
                                      inc.id === 'onlineDeliveryApproval' || inc.id === 'finalDelivery'
                        })),
                        tableData: [
                            { id: Date.now(), day: 'Day 1', hours: '4 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' },
                            { id: Date.now() + 1, day: 'Day 2', hours: '10 hours', videographer: '1 Videographer (2 cameras)', photographer: '1 Photographer' }
                        ],
                        companyEmail: 'info@thesparkstudios.ca',
                        introMessage: "Thank you for your interest in our services. Based on the information you provided, we have prepared the following quote for you. We are pleased to confirm our availability for your event date and would be delighted to assist you. Please feel free to reach out if you have any questions or if there is anything you would like to discuss further. We look forward to the opportunity to work with you."
                    };
                });
            }
        }
    }, [isAuthReady, firebaseDb, loadQuote]); 

    // --- Password Authentication Logic ---
    const handlePasswordSubmit = (e) => {
        e.preventDefault(); // Prevent default form submission
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError('');
        } else {
            setPasswordError('Incorrect password. Please try again.');
        }
    };

    // --- Data Input Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            [name]: name === 'basePrice' ? parseFloat(value) || 0 : value
        }));
    };

    // Handler for customizable intro message
    const handleIntroMessageChange = (e) => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            introMessage: e.target.value
        }));
    };

    // Handler for service type (Radio Buttons)
    const handleServiceTypeChange = (event) => {
        const selectedId = event.target.value;
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            serviceType: selectedId,
        }));
    };

    // Handler for selectable inclusions (checkboxes)
    const handleInclusionToggle = (id) => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            inclusions: prevDetails.inclusions.map(inc =>
                inc.id === id ? { ...inc, selected: !inc.selected } : inc
            )
        }));
    };

    // Handler for dynamic table rows (days)
    const handleTableDataChange = (id, field, value) => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            tableData: prevDetails.tableData.map(row =>
                row.id === id ? { ...row, [field]: value } : row
            )
        }));
    };

    const handleAddDay = () => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            tableData: [...prevDetails.tableData, { id: Date.now(), day: `Day ${quoteDetails.tableData.length + 1}`, hours: '', videographer: '', photographer: '' }]
        }));
    };

    const handleRemoveDay = (idToRemove) => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            tableData: prevDetails.tableData.filter(row => row.id !== idToRemove)
        }));
    };

    const handleAddAddOn = () => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            addOns: [...prevDetails.addOns, { id: Date.now().toString(), description: '', price: 0, hours: 0 }]
        }));
    };

    const handleAddOnInputChange = (id, field, value) => {
        setQuoteDetails(prevDetails => {
            const newAddOns = prevDetails.addOns.map(addOn =>
                addOn.id === id ? { ...addOn, [field]: (field === 'price' || field === 'hours') ? parseFloat(value) || 0 : value } : addOn
            );
            return { ...prevDetails, addOns: newAddOns };
        });
    };

    const handleRemoveAddOn = (idToRemove) => {
        setQuoteDetails(prevDetails => ({
            ...prevDetails,
            addOns: prevDetails.addOns.filter(addOn => addOn.id !== idToRemove)
        }));
    };

    // Calculate total price including add-ons and selected inclusions with prices
    const calculateTotalWithAddOns = () => {
        let total = quoteDetails.basePrice; // Start with the base price determined by service type
        
        // Add prices from selected inclusions (like Drone Upgrade)
        quoteDetails.inclusions.forEach(inc => {
            // Only add price if selected AND not the droneUpgrade (which has price but is treated as value-add)
            if (inc.selected && inc.price && inc.id !== 'droneUpgrade') { 
                total += inc.price;
            }
        });

        // Add prices from custom add-ons
        quoteDetails.addOns.forEach(addOn => {
            total += addOn.price;
        });
        return total;
    };

    // Calculate days remaining for quote validity
    const calculateDaysRemaining = () => {
        if (!quoteDetails.validUntil) return null;
        const now = new Date();
        const validUntilDate = new Date(quoteDetails.validUntil);
        const diffTime = validUntilDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };


    // --- Firestore Operations ---
    const saveQuote = async () => {
        if (!firebaseDb || !userId) {
            setApiError("Firebase not ready or user not authenticated.");
            return;
        }

        setIsLoading(true);
        setApiError('');
        try {
            if (!quoteDetails.clientName || !quoteDetails.packageName || quoteDetails.basePrice === 0) {
                setApiError('Please fill in Client Name, Package Name, and Base Price.');
                setIsLoading(false);
                return;
            }

            // Calculate validUntil date (90 days from now for internal storage/cleanup reference)
            const created = new Date();
            const validUntilDate = new Date(created.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from now

            // Prepare inclusions and serviceType for saving by removing icon components
            const serializableInclusions = quoteDetails.inclusions.map(({ icon, ...rest }) => rest);
            const serializableServiceType = quoteDetails.serviceType; 

            const quoteDataToSave = {
                ...quoteDetails,
                inclusions: serializableInclusions,
                serviceType: serializableServiceType, 
                createdAt: created.toISOString(),
                validUntil: validUntilDate.toISOString(), // Save 90-day validity
                createdBy: userId,
            };

            const docRef = await addDoc(quotesCollectionRef, quoteDataToSave);
            const url = `${window.location.origin}/?quoteId=${docRef.id}`;
            setGeneratedQuoteUrl(url);
            setCurrentQuoteId(docRef.id); 
            console.log("Document written with ID: ", docRef.id);
            setApiError(''); 
        } catch (e) {
            console.error("Error adding document: ", e);
            setApiError(`Failed to save quote: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // PDF Generation Function
    const generatePdf = () => {
        const doc = new jsPDF('p', 'pt', 'a4'); 
        
        const margin = 40;
        let yPos = margin;
        const lineHeight = 14;
        const textWidth = doc.internal.pageSize.getWidth() - 2 * margin;

        // Company Header (Top Left, similar to website)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#4D4583'); // The Spark Studios brand color
        doc.text("The Spark Studios", margin, yPos);
        yPos += lineHeight * 1.5;

        // Contact Info (Small, below company name)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#6D64A1'); // Lighter brand color
        doc.text("info@thesparkstudios.ca", margin, yPos);
        yPos += lineHeight * 2;

        // Quote Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor('#333333');
        doc.text("Wedding Quote", margin, yPos);
        yPos += lineHeight * 2;

        // Client Greeting
        doc.setFontSize(11);
        doc.setTextColor('#555555');
        doc.text(`Hi ${quoteDetails.clientName},`, margin, yPos);
        yPos += lineHeight;
        
        // Intro Message
        doc.text(doc.splitTextToSize(quoteDetails.introMessage, textWidth), margin, yPos);
        yPos += (doc.splitTextToSize(quoteDetails.introMessage, textWidth).length * lineHeight) + lineHeight;

        // Validity Ticker
        const daysRemaining = calculateDaysRemaining();
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#4D4583');
        doc.setFontSize(10);
        if (daysRemaining !== null) {
            if (daysRemaining > 0) {
                doc.text(`Quote valid for next ${QUOTE_VALIDITY_DAYS} days.`, margin, yPos); 
            } else {
                doc.text("Quote has Expired.", margin, yPos);
            }
        }
        yPos += lineHeight * 2;

        // Service Type
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor('#4D4583');
        doc.text("Service Type:", margin, yPos);
        yPos += lineHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#333333');
        // Ensure service type label is correctly pulled from serviceOptions
        doc.text(`Service Selected: ${serviceOptions.find(opt => opt.id === quoteDetails.serviceType)?.label || 'N/A'}`, margin, yPos);
        yPos += lineHeight * 2;

        // Inclusions
        const selectedInclusions = quoteDetails.inclusions.filter(inc => inc.selected);
        if (selectedInclusions.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor('#4D4583');
            doc.text("Following is included in the package:", margin, yPos);
            yPos += lineHeight;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor('#333333');
            selectedInclusions.forEach(inc => {
                let inclusionText = `- ${inc.text}`;
                // Only add price value if it's not droneUpgrade and has a valid price
                if (inc.id !== 'droneUpgrade' && inc.price !== null && inc.price !== undefined && inc.price !== 0) {
                    inclusionText += ` ($${inc.price} value)`;
                }
                doc.text(inclusionText, margin + 10, yPos);
                yPos += lineHeight;
            });
            yPos += lineHeight;
        } else {
            doc.setFontSize(11);
            doc.setTextColor('#555555');
            doc.text("No additional inclusions selected for the base package.", margin, yPos);
            yPos += lineHeight * 2;
        }

        // Coverage Details (Manual Table in PDF)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor('#4D4583');
        doc.text("Coverage Details (Days):", margin, yPos);
        yPos += lineHeight * 1.5;

        // Headers
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor('#4D4583');
        doc.text('Day', margin, yPos);
        doc.text('Hours', margin + 70, yPos);
        doc.text('Videographer', margin + 140, yPos);
        doc.text('Photographer', margin + 290, yPos);
        yPos += lineHeight;
        doc.setLineWidth(0.5);
        doc.setDrawColor('#DDDDDD');
        doc.line(margin, yPos, doc.internal.pageSize.getWidth() - margin, yPos);
        yPos += 5; // Small padding after header line

        // Rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#333333');
        quoteDetails.tableData.forEach(row => {
            doc.text(row.day, margin, yPos);
            doc.text(row.hours, margin + 70, yPos);
            // Manually handle text splitting for videographer/photographer to fit column width
            doc.text(doc.splitTextToSize(row.videographer, 140), margin + 140, yPos);
            doc.text(doc.splitTextToSize(row.photographer, 140), margin + 290, yPos);
            yPos += lineHeight;
            doc.line(margin, yPos, doc.internal.pageSize.getWidth() - margin, yPos);
            yPos += 5; // Padding after each row
        });
        yPos += lineHeight; // Additional space after table


        // Optional Add-ons (Manual Table in PDF)
        if (quoteDetails.addOns.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor('#4D4583');
            doc.text("Optional Additional Charges:", margin, yPos);
            yPos += lineHeight * 1.5;

            // Headers
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor('#4D4583');
            doc.text('Description', margin, yPos);
            doc.text('Price', margin + 210, yPos);
            doc.text('Hours', margin + 290, yPos);
            yPos += lineHeight;
            doc.setLineWidth(0.5);
            doc.setDrawColor('#DDDDDD');
            doc.line(margin, yPos, doc.internal.pageSize.getWidth() - margin, yPos);
            yPos += 5; // Small padding after header line

            // Rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor('#333333');
            quoteDetails.addOns.forEach(addOn => {
                doc.text(doc.splitTextToSize(addOn.description, 200), margin, yPos);
                doc.text(`$${addOn.price}`, margin + 210, yPos);
                doc.text(addOn.hours ? `${addOn.hours} hours` : 'N/A', margin + 290, yPos);
                yPos += lineHeight;
                doc.line(margin, yPos, doc.internal.pageSize.getWidth() - margin, yPos);
                yPos += 5; // Padding after each row
            });
            yPos += lineHeight; // Additional space after table
        } else {
            doc.setFontSize(11);
            doc.setTextColor('#555555');
            doc.text("No optional additional charges selected for this quote.", margin, yPos);
            yPos += lineHeight * 2;
        }

        // Pricing Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor('#4D4583');
        doc.text("Pricing Summary:", margin, yPos);
        yPos += lineHeight * 1.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor('#333333');
        doc.text(`Total Package: $${quoteDetails.basePrice}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`With Add-on(s): $${(calculateTotalWithAddOns() - quoteDetails.basePrice)}`, margin, yPos);
        yPos += lineHeight * 1.5;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor('#4D4583');
        doc.text(`Final Estimated Total: $${calculateTotalWithAddOns()}`, margin, yPos);
        // Add HST label with smaller font
        doc.setFontSize(12); // Smaller font size for HST
        doc.text("+HST", doc.internal.pageSize.getWidth() - margin - doc.getTextWidth("+HST"), yPos); // Position relative to Total
        doc.setFontSize(20); // Reset font size
        yPos += lineHeight * 2;

        // Footer Contact
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#6D64A1');
        doc.text("If you have any questions, feel free to reach out.", margin, yPos);
        yPos += lineHeight;
        doc.text(`Best regards,\nThe Spark Studios\n${quoteDetails.companyEmail}`, margin, yPos);

        doc.save(`Quote_${quoteDetails.clientName.replace(/\s/g, '_')}.pdf`);
    };

    // Function to copy text to clipboard
    const copyToClipboard = (textToCopy) => {
        if (textToCopy) {
            try {
                // Using document.execCommand('copy') as navigator.clipboard.writeText() may not work due to iFrame restrictions.
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                setCopyMessage('Copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text:', err);
                setCopyMessage('Failed to copy. Please copy manually.');
            }
        }
    };

    // Show loading spinner if Firebase not ready
    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-[#4D4583] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-700 text-lg">Initializing application...</p>
                    {authError && <p className="text-red-500 mt-2">{authError}</p>}
                </div>
            </div>
        );
    }

    const daysRemaining = calculateDaysRemaining();
    const quoteExpired = daysRemaining !== null && daysRemaining <= 0;

    return (
        <div className="min-h-screen bg-gray-100 p-4 font-inter">
            {/* Display current user ID for debugging/sharing */}
            <div className="text-center text-sm text-gray-500 mb-4">
                User ID: <span className="font-mono">{userId}</span>
                {authError && <p className="text-red-500 mt-1">{authError}</p>} 
            </div>

            {/* Main Container */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden md:p-8 p-4">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Photo & Video Quote</h1>
                    <p className="text-lg text-gray-600">// The Spark Studios</p>
                </div>

                {/* Conditional rendering based on authentication */}
                {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50 p-6 rounded-lg shadow-inner">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Access Restricted</h2>
                        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm">
                            <div className="mb-4">
                                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                                    Password:
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#4D4583]"
                                    placeholder="Enter password"
                                />
                            </div>
                            {passwordError && <p className="text-red-500 text-sm mb-4">{passwordError}</p>}
                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    className="bg-[#4D4583] hover:bg-[#6D64A1] text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200"
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    // Main App Content (visible only if isAuthenticated is true)
                    <>
                        {/* Quote Input Form (visible when not viewing an existing quote) */}
                        {!isViewingQuote && (
                            <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner"> {/* Changed to bg-gray-50 */}
                                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create New Quote</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label htmlFor="clientName" className="block text-gray-700 text-sm font-bold mb-2">Client Name:</label>
                                        <input
                                            type="text"
                                            id="clientName"
                                            name="clientName"
                                            value={quoteDetails.clientName}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#4D4583]" // Updated focus ring color
                                            placeholder="e.g., Jane & John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="packageName" className="block text-gray-700 text-sm font-bold mb-2">Base Package Name:</label>
                                        <input
                                            type="text"
                                            id="packageName"
                                            name="packageName"
                                            value={quoteDetails.packageName}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#4D4583]" // Updated focus ring color
                                            placeholder="e.g., Gold Wedding Package"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="basePrice" className="block text-gray-700 text-sm font-bold mb-2">Base Package Price ($):</label>
                                        <input
                                            type="number"
                                            id="basePrice"
                                            name="basePrice"
                                            value={quoteDetails.basePrice}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#4D4583]" // Updated focus ring color
                                            placeholder="e.g., 4250"
                                        />
                                    </div>
                                </div>

                                {/* Customizable Intro Message Input */}
                                <div className="mb-4">
                                    <label htmlFor="introMessage" className="block text-gray-700 text-sm font-bold mb-2">Introductory Message:</label>
                                    <textarea
                                        id="introMessage"
                                        name="introMessage"
                                        value={quoteDetails.introMessage}
                                        onChange={handleIntroMessageChange}
                                        rows="5"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#4D4583] resize-y" // Updated focus ring color
                                        placeholder="Enter your introductory message here..."
                                    ></textarea>
                                </div>


                                {/* Service Type Selection (Radio Buttons) */}
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Select Service Type:</h3>
                                <div className="flex flex-wrap gap-4 mb-4">
                                    {serviceOptions.map(option => (
                                        <div key={option.id} className="flex items-center">
                                            <input
                                                type="radio"
                                                id={option.id}
                                                name="serviceType"
                                                value={option.id}
                                                checked={quoteDetails.serviceType === option.id}
                                                onChange={handleServiceTypeChange}
                                                className="form-radio h-4 w-4 text-[#4D4583] transition duration-150 ease-in-out focus:ring-[#4D4583]" // Updated radio color
                                            />
                                            <label htmlFor={option.id} className="ml-2 text-gray-700 text-base flex items-center">
                                                {option.icon && <option.icon className="w-5 h-5 mr-2 text-[#4D4583]" />} {/* Icon for Service Type */}
                                                {option.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                {/* Selectable Inclusions (Checkboxes) */}
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Base Package Inclusions (Select):</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {quoteDetails.inclusions.map(inc => (
                                        <div key={inc.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`inc-${inc.id}`}
                                                checked={inc.selected}
                                                onChange={() => handleInclusionToggle(inc.id)}
                                                className="form-checkbox h-4 w-4 text-[#4D4583] rounded focus:ring-[#4D4583]" // Updated checkbox color
                                            />
                                            <label htmlFor={`inc-${inc.id}`} className="ml-2 text-gray-700 text-base flex items-center">
                                                {/* Find original inclusion to get the icon */}
                                                {allInclusions.find(item => item.id === inc.id)?.icon && 
                                                 React.createElement(allInclusions.find(item => item.id === inc.id).icon, { className: "w-5 h-5 mr-2 text-[#4D4583]" })} {/* Icon for Inclusions */}
                                                <span>{inc.text} {inc.id !== 'droneUpgrade' && inc.price !== null && inc.price !== undefined && inc.price !== 0 && <span className="text-sm text-gray-600 ml-1">(${(inc.price)})</span>}</span> {/* Exclude 0 and droneUpgrade value */}
                                            </label>
                                        </div>
                                    ))}
                                </div>


                                {/* Coverage Details (Days) Input */}
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Coverage Details (Days):</h3>
                                {quoteDetails.tableData.map((row) => (
                                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 border border-gray-300 rounded-lg bg-white shadow-sm items-end"> {/* Added border-gray-300 */}
                                        <div>
                                            <label htmlFor={`day-${row.id}`} className="block text-gray-700 text-xs font-bold mb-1">Day:</label>
                                            <input
                                                type="text"
                                                id={`day-${row.id}`}
                                                value={row.day}
                                                onChange={(e) => handleTableDataChange(row.id, 'day', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-[#6D64A1]" // Updated focus ring color
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`hours-${row.id}`} className="block text-gray-700 text-xs font-bold mb-1">Hours:</label>
                                            <input
                                                type="text"
                                                id={`hours-${row.id}`}
                                                value={row.hours}
                                                onChange={(e) => handleTableDataChange(row.id, 'hours', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-[#6D64A1]" // Updated focus ring color
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`videographer-${row.id}`} className="block text-gray-700 text-xs font-bold mb-1">Videographer:</label>
                                            <input
                                                type="text"
                                                id={`videographer-${row.id}`}
                                                value={row.videographer}
                                                onChange={(e) => handleTableDataChange(row.id, 'videographer', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-[#6D64A1]" // Updated focus ring color
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`photographer-${row.id}`} className="block text-gray-700 text-xs font-bold mb-1">Photographer:</label>
                                            <input
                                                type="text"
                                                id={`photographer-${row.id}`}
                                                value={row.photographer}
                                                onChange={(e) => handleTableDataChange(row.id, 'photographer', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveDay(row.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-sm transition duration-200"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        onClick={handleAddDay}
                                        className="bg-[#4D4583] hover:bg-[#6D64A1] text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-200" // Updated button color
                                    >
                                        Add Day
                                    </button>
                                </div>

                                {/* Optional Additional Charges Input */}
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Optional Additional Charges:</h3>
                                {quoteDetails.addOns.map((addOn) => (
                                    <div key={addOn.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 p-3 border border-gray-300 rounded-lg bg-white shadow-sm items-end"> {/* Added border-gray-300 */}
                                        <div className="md:col-span-2">
                                            <label htmlFor={`addon-desc-${addOn.id}`} className="block text-gray-700 text-xs font-bold mb-1">Description:</label>
                                            <input
                                                type="text"
                                                id={`addon-desc-${addOn.id}`}
                                                value={addOn.description}
                                                onChange={(e) => handleAddOnInputChange(addOn.id, 'description', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                                                placeholder="e.g., Second Videographer"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`addon-price-${addOn.id}`} className="block text-gray-700 text-xs font-bold mb-1">Price ($):</label>
                                            <input
                                                type="number"
                                                id={`addon-price-${addOn.id}`}
                                                value={addOn.price}
                                                onChange={(e) => handleAddOnInputChange(addOn.id, 'price', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`addon-hours-${addOn.id}`} className="block text-gray-700 text-xs font-bold mb-1">Hours (Optional):</label>
                                            <input
                                                type="number"
                                                id={`addon-hours-${addOn.id}`}
                                                value={addOn.hours}
                                                onChange={(e) => handleAddOnInputChange(addOn.id, 'hours', e.target.value)}
                                                className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAddOn(addOn.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-sm transition duration-200"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddAddOn}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm mt-2 transition duration-200"
                                >
                                    Add Additional Charge
                                </button>

                                <div className="mt-6 text-center">
                                    <button
                                        onClick={saveQuote}
                                        disabled={isLoading || !firebaseDb}
                                        className="bg-[#4D4583] hover:bg-[#6D64A1] text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" // Updated button color
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving Quote...
                                            </div>
                                        ) : (
                                            'Save Quote & Generate Link'
                                        )}
                                    </button>
                                    {apiError && <p className="text-red-500 mt-3">{apiError}</p>}
                                </div>
                            </div>
                        )}

                        {/* Display Area for Quote Details (visible when viewing an existing quote or after saving) */}
                        {(isViewingQuote || generatedQuoteUrl) && (
                            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                    Quote for <span className="text-[#4D4583]">{quoteDetails.clientName}</span> {/* Updated text color */}
                                </h2>

                                {/* Polished Quote URL Display - ONLY visible when *just created* a quote (not viewing existing) */}
                                {generatedQuoteUrl && !isViewingQuote && ( 
                                    <div className="bg-[#EFEFF5] border-l-4 border-[#4D4583] text-gray-800 p-4 rounded-lg shadow-md mb-6 transition duration-300 ease-in-out flex items-center justify-between"> {/* Updated colors */}
                                        <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-sm mb-1">Share this professional quote link:</p>
                                            <a href={generatedQuoteUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[#4D4583] hover:underline font-mono text-xs md:text-sm whitespace-nowrap overflow-hidden text-ellipsis block pr-2"> {/* Updated text color */}
                                                {generatedQuoteUrl}
                                            </a>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(generatedQuoteUrl)}
                                            className="bg-[#4D4583] hover:bg-[#6D64A1] text-white font-semibold py-1.5 px-3 rounded-md text-sm shadow-sm transition duration-200 ease-in-out flex-shrink-0 ml-4" // Updated button color
                                            title="Copy Link to Clipboard"
                                        >
                                            Copy Link
                                        </button>
                                    </div>
                                )}

                                {/* Validity Ticker */}
                                <div className={`text-center text-lg font-bold p-3 rounded-lg mb-6 ${quoteExpired ? 'bg-red-100 text-red-700' : 'bg-[#EFEFF5] text-[#4D4583]'}`}> {/* Updated colors */}
                                    {quoteExpired ? (
                                        "Quote has Expired."
                                    ) : (
                                        `Quote valid for next ${QUOTE_VALIDITY_DAYS} days.` // Removed "Days Remaining"
                                    )}
                                </div>

                                <p className="text-gray-700 text-lg leading-relaxed mb-2">
                                    Hi <span className="font-semibold text-gray-900">{quoteDetails.clientName}</span>,
                                </p>
                                <p className="text-gray-700 text-lg leading-relaxed mt-2 mb-6 whitespace-pre-wrap">
                                    {quoteDetails.introMessage} {/* Dynamic intro message */}
                                </p>

                                {/* Service Type - on Quote Page (No Price) */}
                                <div className="bg-gradient-to-r from-gray-50 to-[#F5F5F9] p-6 rounded-lg mb-8 shadow-inner"> {/* Updated background gradient */}
                                    <h2 className="text-2xl font-semibold text-[#4D4583] mb-4">Service Type:</h2> {/* Updated text color */}
                                    <p className="text-lg text-gray-700 mb-2 flex items-center">
                                        Service Selected: <span className="font-semibold text-gray-900 ml-2">
                                            {/* Ensure serviceOptions is available on load and find the label */}
                                            {serviceOptions.find(opt => opt.id === quoteDetails.serviceType)?.icon && 
                                             React.createElement(serviceOptions.find(opt => opt.id === quoteDetails.serviceType).icon, { className: "w-6 h-6 mr-2 text-[#4D4583]" })}
                                            {serviceOptions.find(opt => opt.id === quoteDetails.serviceType)?.label || 'N/A'}
                                        </span>
                                    </p>
                                    {/* Base Price is removed from the display here as requested */}
                                </div>

                                {/* Selected Inclusions */}
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Following is included in the package:</h2> {/* Changed heading */}
                                    <ul className="list-disc list-inside text-gray-700 text-lg space-y-2">
                                        {quoteDetails.inclusions.filter(inc => inc.selected).length > 0 ? (
                                            quoteDetails.inclusions.filter(inc => inc.selected).map((item) => (
                                                <li key={item.id} className="flex items-center">
                                                    {/* Find original inclusion to get the icon */}
                                                    {allInclusions.find(original => original.id === item.id)?.icon && 
                                                     React.createElement(allInclusions.find(original => original.id === item.id).icon, { className: "w-5 h-5 mr-2 text-[#4D4583]" })} {/* Updated icon color */}
                                                    {/* Removed price display for droneUpgrade and if price is 0/null */}
                                                    <span>{item.text} {item.id !== 'droneUpgrade' && item.price !== null && item.price !== undefined && item.price !== 0 && <span className="text-sm text-gray-600 ml-1">(${(item.price)})</span>}</span> 
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No additional inclusions selected for the base package.</p>
                                        )}
                                    </ul>
                                </div>


                                {/* Coverage Table */}
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Coverage Details (Days):</h2>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                                            <thead>
                                                <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                                                    <th className="py-3 px-6 border-b border-gray-300 rounded-tl-lg">Day</th>
                                                    <th className="py-3 px-6 border-b border-gray-300">Hours</th>
                                                    <th className="py-3 px-6 border-b border-gray-300">Videographer</th>
                                                    <th className="py-3 px-6 border-b border-gray-300 rounded-tr-lg">Photographer</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-700 text-base font-light">
                                                {quoteDetails.tableData.map((row) => (
                                                    <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="py-3 px-6 whitespace-nowrap">{row.day}</td>
                                                        <td className="py-3 px-6 whitespace-nowrap">{row.hours}</td>
                                                        <td className="py-3 px-6 whitespace-nowrap">{row.videographer}</td>
                                                        <td className="py-3 px-6 whitespace-nowrap">{row.photographer}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Optional Add-ons and Total Price */}
                                {quoteDetails.addOns.length > 0 && (
                                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
                                        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Optional Additional Charges:</h3>
                                        <ul className="list-disc list-inside text-gray-700 text-lg space-y-2 mb-6">
                                            {quoteDetails.addOns.map(addOn => (
                                                <li key={addOn.id} className="flex items-center">
                                                    <svg className="w-5 h-5 text-[#4D4583] mr-2" fill="currentColor" viewBox="0 0 20 20"> {/* Updated icon color */}
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                                    </svg>
                                                    <span>{addOn.description} <span className="font-semibold">${addOn.price}/{addOn.hours} hours</span></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {!quoteDetails.addOns.length && (
                                     <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center text-gray-500 mb-8">
                                         <p>No optional additional charges selected for this quote.</p>
                                     </div>
                                )}

                                {/* Final Pricing Summary */}
                                <div className="bg-[#F5F5F9] p-6 rounded-lg border border-gray-200 shadow-inner"> {/* Updated background color */}
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Pricing Summary:</h2>
                                    <div className="flex justify-between items-center text-lg text-gray-700 mb-2">
                                        <span>Total Package:</span> {/* Changed label */}
                                        <span className="font-semibold text-[#4D4583]">${quoteDetails.basePrice}</span> {/* Updated text color */}
                                    </div>
                                    <div className="flex justify-between items-center text-lg text-gray-700 mb-4">
                                        <span>With Add-on(s):</span> {/* Changed label */}
                                        <span className="font-semibold text-[#4D4583]"> {/* Updated text color */}
                                            ${(calculateTotalWithAddOns() - quoteDetails.basePrice)}
                                        </span>
                                    </div>
                                    <div className="text-right border-t pt-4 border-gray-300">
                                        <p className="text-3xl font-bold text-gray-900">
                                            Final Estimated Total: <span className="text-[#4D4583]">${calculateTotalWithAddOns()}<span className="text-base align-super">+HST</span></span> {/* Smaller +HST */}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* PDF Download Button - Only visible on the quote display page */}
                                {isViewingQuote && ( 
                                    <div className="mt-8 text-center border-t pt-6 border-gray-200">
                                        <button
                                            onClick={generatePdf}
                                            className="bg-[#4D4583] hover:bg-[#6D64A1] text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                                        >
                                            Download Quote (PDF)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Section */}
                        <div className="mt-8 text-center border-t pt-6 border-gray-200">
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                If you have any questions, feel free to reach out.
                            </p>
                            <p className="text-xl font-semibold text-gray-800">Best regards,</p>
                            <p className="text-lg text-gray-700">The Spark Studios</p>
                            <a href={`mailto:${quoteDetails.companyEmail}`} className="text-[#4D4583] hover:underline text-lg"> {/* Updated link color */}
                                {quoteDetails.companyEmail}
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;
