import React, { useState, useEffect, useRef } from 'react';

// --- INITIAL DATA & TEMPLATES ---
const packageTemplates = {
  essential: {
    name: 'Essential Collection',
    inclusions: [
      'Unlimited Professionally Edited Photos',
      'Cinematic Highlight Film (3-5 min)',
      'Full Feature Film (Full Day Edit)',
      'Online Gallery + Delivery',
    ],
  },
  classic: {
    name: 'Classic Collection',
    inclusions: [
      'Unlimited Edited Photos',
      'Cinematic Highlight Film (4-6 min)',
      'Full Feature Film (30-45 min)',
      'Drone Coverage Included',
      'Content Creation (for Reels/TikToks)',
      'Engagement E-Shoot (1 hour)',
      'Online Gallery + Delivery',
    ],
  },
  signature: {
    name: 'Signature Collection',
    inclusions: [
      'Unlimited Edited Photos',
      'Cinematic Highlight Film (5-7 min)',
      'Full Feature Film (45-60 min)',
      'Drone Coverage Included',
      'Dedicated Content Creator',
      'Engagement E-Shoot + Love Story Film',
      'Personalized Story & Timeline Consultation',
      'Luxury Keepsake Box (USB + 20 Fine Art Prints)',
      'Priority Editing Delivery',
    ],
  },
};

const getNewQuote = () => ({
  id: Date.now(),
  lastSaved: new Date().toISOString(),
  client: {
    primaryName: '',
    partnerName: '',
    email: '',
    phone: '',
    weddingDate: '',
    venue: '',
    notes: '',
  },
  package: {
    name: 'Custom Package',
    inclusions: [''],
  },
  days: [{ id: Date.now(), name: 'Wedding Day', hours: 8, crew: '1 Photographer, 1 Videographer' }],
  addOns: [],
  pricing: {
    basePrice: '',
    addOnsTotal: '',
    tax: '',
    discount: '',
    grandTotal: '',
  },
});

// --- HELPER ICONS ---
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

// --- MAIN APP COMPONENT ---
const App = () => {
  const [quotes, setQuotes] = useState([]);
  const [activeQuote, setActiveQuote] = useState(getNewQuote());
  const [message, setMessage] = useState('');
  const printRef = useRef();

  // Load quotes from local storage on initial render
  useEffect(() => {
    try {
      const savedQuotes = localStorage.getItem('sparkStudiosQuotes');
      if (savedQuotes) {
        setQuotes(JSON.parse(savedQuotes));
      }
    } catch (error) {
      console.error("Failed to load quotes from local storage:", error);
    }
  }, []);

  // Save quotes to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sparkStudiosQuotes', JSON.stringify(quotes));
    } catch (error)      {
      console.error("Failed to save quotes to local storage:", error);
    }
  }, [quotes]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSelectPackage = (pkgKey) => {
    const template = packageTemplates[pkgKey];
    setActiveQuote(prev => ({
      ...prev,
      package: { ...template }
    }));
  };

  const handleInputChange = (section, field, value) => {
    setActiveQuote(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleListChange = (listName, index, field, value) => {
    const newList = [...activeQuote[listName]];
    newList[index][field] = value;
    setActiveQuote(prev => ({ ...prev, [listName]: newList }));
  };

  const handleAddListItem = (listName, newItem) => {
    setActiveQuote(prev => ({ ...prev, [listName]: [...prev[listName], newItem] }));
  };
  
  const handleRemoveListItem = (listName, index) => {
    setActiveQuote(prev => ({ ...prev, [listName]: prev[listName].filter((_, i) => i !== index) }));
  };

  const handleInclusionChange = (index, value) => {
     const newInclusions = [...activeQuote.package.inclusions];
     newInclusions[index] = value;
     setActiveQuote(prev => ({...prev, package: {...prev.package, inclusions: newInclusions}}));
  };
  
  const handleAddInclusion = () => {
    setActiveQuote(prev => ({...prev, package: {...prev.package, inclusions: [...prev.package.inclusions, '']}}));
  };
  
  const handleRemoveInclusion = (index) => {
    setActiveQuote(prev => ({...prev, package: {...prev.package, inclusions: prev.package.inclusions.filter((_, i) => i !== index)}}));
  };

  const handleSaveQuote = () => {
    const updatedQuote = { ...activeQuote, lastSaved: new Date().toISOString() };
    const existingIndex = quotes.findIndex(q => q.id === updatedQuote.id);
    if (existingIndex > -1) {
      const newQuotes = [...quotes];
      newQuotes[existingIndex] = updatedQuote;
      setQuotes(newQuotes);
    } else {
      setQuotes([...quotes, updatedQuote]);
    }
    setActiveQuote(updatedQuote);
    showMessage('Quote saved successfully!');
  };

  const handleLoadQuote = (quoteId) => {
    const quoteToLoad = quotes.find(q => q.id === quoteId);
    if (quoteToLoad) {
      setActiveQuote(quoteToLoad);
      showMessage('Quote loaded.');
    }
  };

  const handleNewQuote = () => {
    setActiveQuote(getNewQuote());
    showMessage('Started a new blank quote.');
  };
  
  const handleDeleteQuote = (quoteId) => {
    if (window.confirm("Are you sure you want to delete this quote permanently?")) {
        setQuotes(quotes.filter(q => q.id !== quoteId));
        if (activeQuote.id === quoteId) {
            handleNewQuote();
        }
        showMessage('Quote deleted.');
    }
  };

  const handleCopySummary = () => {
    const q = activeQuote;
    const summary = `
QUOTE SUMMARY for ${q.client.primaryName}
===================================
Package: ${q.package.name}
Total Price: $${q.pricing.grandTotal || '___'}

CLIENT DETAILS:
- Names: ${q.client.primaryName}${q.client.partnerName ? ' & ' + q.client.partnerName : ''}
- Contact: ${q.client.email} | ${q.client.phone}
- Date: ${q.client.weddingDate}
- Venue: ${q.client.venue}

COVERAGE:
${q.days.map(d => `- ${d.name}: ${d.hours} hours - ${d.crew}`).join('\n')}

INCLUSIONS:
${q.package.inclusions.map(i => `- ${i}`).join('\n')}

ADD-ONS:
${q.addOns.map(a => `- ${a.name}: $${a.price}`).join('\n')}

PRICING:
- Base: $${q.pricing.basePrice}
- Add-ons: $${q.pricing.addOnsTotal}
- Tax: $${q.pricing.tax}
- Discount: $${q.pricing.discount}
-----------------------------------
GRAND TOTAL: $${q.pricing.grandTotal}
    `;
    navigator.clipboard.writeText(summary.trim());
    showMessage('Quote summary copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans antialiased print:bg-white print:text-black">
        {/* --- Header & Controls --- */}
        <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 print:hidden">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-amber-400">The Spark Studios</h1>
                <h2 className="ml-4 text-lg font-light text-gray-400 hidden md:block">Quote Configurator</h2>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="relative">
                  <select
                    onChange={(e) => e.target.value ? handleLoadQuote(Number(e.target.value)) : handleNewQuote()}
                    value={activeQuote.id}
                    className="bg-gray-800 border border-gray-700 rounded-md py-2 pl-3 pr-8 text-sm focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">-- Load a Quote --</option>
                    {quotes.sort((a,b) => new Date(b.lastSaved) - new Date(a.lastSaved)).map(q => (
                      <option key={q.id} value={q.id}>
                        {q.client.primaryName || 'Untitled Quote'} ({new Date(q.lastSaved).toLocaleTimeString()})
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={handleNewQuote} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md">New</button>
                <button onClick={handleSaveQuote} className="px-3 py-2 text-sm bg-amber-500 text-black hover:bg-amber-400 rounded-md font-semibold">Save</button>
                <button onClick={handleCopySummary} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md">Copy</button>
                <button onClick={handlePrint} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md">Print</button>
                {activeQuote.id && <button onClick={() => handleDeleteQuote(activeQuote.id)} className="px-3 py-2 text-sm bg-red-800 hover:bg-red-700 rounded-md"><TrashIcon/></button>}
              </div>
            </div>
          </div>
          {message && <div className="bg-emerald-600 text-white text-center text-sm py-1">{message}</div>}
        </header>

        {/* --- Main Content --- */}
        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1">
            
            {/* --- Left Column: Configuration --- */}
            <div className="lg:col-span-2 space-y-8 print:hidden">
              {/* Package Selector */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">1. Select Package Template</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.keys(packageTemplates).map(key => (
                    <button key={key} onClick={() => handleSelectPackage(key)} className={`p-4 rounded-lg text-left transition ${activeQuote.package.name === packageTemplates[key].name ? 'bg-amber-500/20 border-amber-500' : 'bg-gray-700 hover:bg-gray-600'} border border-transparent`}>
                      <h4 className="font-bold capitalize">{key}</h4>
                      <p className="text-xs text-gray-400">{packageTemplates[key].inclusions.slice(0, 2).join(', ')}...</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Package Details */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                 <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">2. Customize Inclusions</h3>
                 <div className="space-y-2">
                    {activeQuote.package.inclusions.map((inclusion, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" value={inclusion} onChange={(e) => handleInclusionChange(index, e.target.value)} className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-amber-500 focus:border-amber-500"/>
                            <button onClick={() => handleRemoveInclusion(index)} className="p-2 bg-gray-600 hover:bg-red-800 rounded-md"><TrashIcon/></button>
                        </div>
                    ))}
                 </div>
                 <button onClick={handleAddInclusion} className="text-sm mt-3 flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md"><PlusIcon/>Add Inclusion</button>
              </div>

              {/* Time Configuration */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">3. Configure Coverage Days</h3>
                <div className="space-y-4">
                  {activeQuote.days.map((day, index) => (
                    <div key={day.id} className="grid grid-cols-1 sm:grid-cols-8 gap-3 items-center">
                      <input type="text" placeholder="Day Name (e.g., Mehndi)" value={day.name} onChange={e => handleListChange('days', index, 'name', e.target.value)} className="sm:col-span-3 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <input type="text" placeholder="Hours" value={day.hours} onChange={e => handleListChange('days', index, 'hours', e.target.value)} className="sm:col-span-1 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <input type="text" placeholder="Crew Setup" value={day.crew} onChange={e => handleListChange('days', index, 'crew', e.target.value)} className="sm:col-span-3 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <button onClick={() => handleRemoveListItem('days', index)} className="p-2 bg-gray-600 hover:bg-red-800 rounded-md sm:col-span-1"><TrashIcon/></button>
                    </div>
                  ))}
                </div>
                 <button onClick={() => handleAddListItem('days', {id: Date.now(), name:'', hours:'', crew:''})} className="text-sm mt-4 flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md"><PlusIcon/>Add Day</button>
              </div>
              
              {/* Add-Ons */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">4. Optional Add-ons & Custom Items</h3>
                 <div className="space-y-4">
                  {activeQuote.addOns.map((addOn, index) => (
                    <div key={addOn.id} className="grid grid-cols-1 sm:grid-cols-8 gap-3 items-center">
                      <input type="text" placeholder="Item Name (e.g., Album)" value={addOn.name} onChange={e => handleListChange('addOns', index, 'name', e.target.value)} className="sm:col-span-4 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <input type="text" placeholder="Price" value={addOn.price} onChange={e => handleListChange('addOns', index, 'price', e.target.value)} className="sm:col-span-1 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <input type="text" placeholder="Optional Notes" value={addOn.notes} onChange={e => handleListChange('addOns', index, 'notes', e.target.value)} className="sm:col-span-2 bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                      <button onClick={() => handleRemoveListItem('addOns', index)} className="p-2 bg-gray-600 hover:bg-red-800 rounded-md sm:col-span-1"><TrashIcon/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleAddListItem('addOns', {id: Date.now(), name:'', price:'', notes:''})} className="text-sm mt-4 flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md"><PlusIcon/>Add Item</button>
              </div>
            </div>

            {/* --- Right Column: Client & Totals --- */}
            <div className="lg:col-span-1 space-y-8 print:hidden">
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg sticky top-24">
                <h3 className="text-xl font-semibold mb-4 text-amber-400 border-b border-gray-700 pb-3">Client Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Primary Name" value={activeQuote.client.primaryName} onChange={e => handleInputChange('client', 'primaryName', e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                    <input type="text" placeholder="Partner Name" value={activeQuote.client.partnerName} onChange={e => handleInputChange('client', 'partnerName', e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                  </div>
                  <input type="email" placeholder="Email Address" value={activeQuote.client.email} onChange={e => handleInputChange('client', 'email', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                  <input type="tel" placeholder="Phone Number" value={activeQuote.client.phone} onChange={e => handleInputChange('client', 'phone', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Wedding Date(s)" value={activeQuote.client.weddingDate} onChange={e => handleInputChange('client', 'weddingDate', e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                    <input type="text" placeholder="Venue(s)" value={activeQuote.client.venue} onChange={e => handleInputChange('client', 'venue', e.target.value)} className="bg-gray-700 border-gray-600 rounded-md p-2 text-sm"/>
                  </div>
                   <textarea placeholder="Notes (cultural details, travel, etc.)" value={activeQuote.client.notes} onChange={e => handleInputChange('client', 'notes', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm" rows="3"></textarea>
                </div>
                
                <h3 className="text-xl font-semibold mt-8 mb-4 text-amber-400 border-b border-gray-700 pb-3">Pricing (Manual Entry)</h3>
                <div className="space-y-4">
                    <div className="flex items-center"><label className="w-28 font-semibold text-sm">Base Price</label><input type="text" placeholder="$0" value={activeQuote.pricing.basePrice} onChange={e => handleInputChange('pricing', 'basePrice', e.target.value)} className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-right"/></div>
                    <div className="flex items-center"><label className="w-28 font-semibold text-sm">Add-ons</label><input type="text" placeholder="$0" value={activeQuote.pricing.addOnsTotal} onChange={e => handleInputChange('pricing', 'addOnsTotal', e.target.value)} className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-right"/></div>
                    <div className="flex items-center"><label className="w-28 font-semibold text-sm">Tax</label><input type="text" placeholder="$0" value={activeQuote.pricing.tax} onChange={e => handleInputChange('pricing', 'tax', e.target.value)} className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-right"/></div>
                    <div className="flex items-center"><label className="w-28 font-semibold text-sm">Discount</label><input type="text" placeholder="$0" value={activeQuote.pricing.discount} onChange={e => handleInputChange('pricing', 'discount', e.target.value)} className="flex-grow bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-right"/></div>
                    <div className="pt-4 border-t border-gray-700 flex items-center"><label className="w-28 font-bold text-amber-400 text-lg">Grand Total</label><input type="text" placeholder="$0.00" value={activeQuote.pricing.grandTotal} onChange={e => handleInputChange('pricing', 'grandTotal', e.target.value)} className="flex-grow bg-gray-900 border-amber-500 rounded-md p-2 text-lg font-bold text-amber-400 text-right"/></div>
                </div>
              </div>
            </div>
            
            {/* --- Printable Area --- */}
            <div ref={printRef} className="hidden print:block col-span-1 p-8 bg-white text-black">
                 <div className="text-center mb-12">
                     <div className="w-48 h-16 bg-gray-200 mx-auto mb-4 flex items-center justify-center"><span className="text-gray-500">The Spark Studios Logo</span></div>
                     <h1 className="text-4xl font-bold">Quote Proposal</h1>
                 </div>

                 <div className="mb-8">
                     <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Client Details</h2>
                     <p><strong>Prepared for:</strong> {activeQuote.client.primaryName} {activeQuote.client.partnerName && `& ${activeQuote.client.partnerName}`}</p>
                     <p><strong>Contact:</strong> {activeQuote.client.email} | {activeQuote.client.phone}</p>
                     <p><strong>Date:</strong> {activeQuote.client.weddingDate}</p>
                     <p><strong>Venue:</strong> {activeQuote.client.venue}</p>
                 </div>

                 <div className="mb-8">
                     <h2 className="text-2xl font-semibold border-b pb-2 mb-4">{activeQuote.package.name}</h2>
                     <ul className="list-disc list-inside space-y-1">
                        {activeQuote.package.inclusions.filter(i => i).map((inc, i) => <li key={i}>{inc}</li>)}
                     </ul>
                 </div>
                 
                 <div className="mb-8">
                     <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Coverage</h2>
                      {activeQuote.days.map(day => (
                        <div key={day.id} className="mb-2">
                          <p><strong>{day.name}:</strong> {day.hours} hours of coverage with {day.crew}</p>
                        </div>
                      ))}
                 </div>
                 
                 {activeQuote.addOns.length > 0 && (
                 <div className="mb-8">
                     <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Optional Add-ons</h2>
                     <ul className="list-disc list-inside space-y-1">
                        {activeQuote.addOns.filter(a => a.name).map((addOn, i) => <li key={i}>{addOn.name} {addOn.notes && `(${addOn.notes})`}</li>)}
                     </ul>
                 </div>
                 )}
                 
                 <div className="mt-12 pt-8 border-t-2">
                     <h2 className="text-2xl font-semibold mb-4 text-right">Investment Summary</h2>
                     <table className="w-full text-right">
                        <tbody>
                            <tr><td className="py-1">Base Package:</td><td className="font-semibold">${activeQuote.pricing.basePrice}</td></tr>
                            <tr><td className="py-1">Add-ons Total:</td><td className="font-semibold">${activeQuote.pricing.addOnsTotal}</td></tr>
                            <tr><td className="py-1">Tax:</td><td className="font-semibold">${activeQuote.pricing.tax}</td></tr>
                            <tr><td className="py-1">Discount:</td><td className="font-semibold">-${activeQuote.pricing.discount}</td></tr>
                            <tr className="border-t-2 text-xl"><td className="pt-4 font-bold">Grand Total:</td><td className="pt-4 font-bold">${activeQuote.pricing.grandTotal}</td></tr>
                        </tbody>
                     </table>
                 </div>
            </div>

          </div>
        </main>
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default App;

