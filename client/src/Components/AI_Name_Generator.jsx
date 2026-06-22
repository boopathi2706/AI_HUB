import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Trash2,
  Download,
  RefreshCw,
  Heart,
  Baby,
  Briefcase,
  Layers
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Name_Generator() {
  const [purpose, setPurpose] = useState("Startup"); // Startup, Brand, Baby Name
  const [babyGender, setBabyGender] = useState("Boy"); // Boy, Girl, Unisex
  const [startingLetter, setStartingLetter] = useState("");
  const [culture, setCulture] = useState("Tamil"); // Tamil, Malayalam, Kannada, Sanskrit, Telugu, Modern English, etc.
  const [customCulture, setCustomCulture] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [namesList, setNamesList] = useState(null);

  const activePurpose = purpose;
  const activeCulture = culture === "Custom" ? customCulture : culture;

  const loadDemoSetup = (demoPurpose, demoLetter, demoCulture, demoGender = "Boy") => {
    setPurpose(demoPurpose);
    setStartingLetter(demoLetter);
    setCulture(demoCulture);
    setBabyGender(demoGender);
    setNamesList(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateNames = async (isNewBatch = false) => {
    const finalPurpose = activePurpose || "General Brand";
    const finalCulture = activeCulture.trim() || "Modern English";
    const genderContext = purpose === "Baby Name" ? ` (${babyGender})` : "";
    const finalPurposeWithGender = `${finalPurpose}${genderContext}`;

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    if (!isNewBatch) {
      setNamesList(null);
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an expert naming strategist, linguist, and brand architect.
Generate exactly 10 highly creative, memorable, and unique names customized for:
Purpose: ${finalPurposeWithGender}
Starting Letter Restriction: ${startingLetter ? `Must start with the letter "${startingLetter.toUpperCase()}"` : "No starting letter restriction"}
Language, Culture, or Regional Influence: ${finalCulture}

For each generated name, provide a concise, beautiful 1-sentence meaning or semantic origin.
Identify 1 to 3 core keywords or cultural terms in each meaning that should be highlighted in yellow in the user interface.

Return a strictly formatted JSON object matching this exact schema:
{
  "names": [
    {
      "name": "The Generated Name",
      "meaning": "A beautiful 1-sentence description or meaning of the name.",
      "highlights": ["word1", "word2"]
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate 10 names for ${finalPurposeWithGender}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            names: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  meaning: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["name", "meaning", "highlights"]
              }
            }
          },
          required: ["names"]
        }
      }
    };

    let attempt = 0;
    const maxAttempts = 5;
    let delay = 1000;

    const executeFetch = async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setErrorCode(response.status);
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP Status Code: ${response.status}`;
        throw new Error(msg);
      }

      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeFetch();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawJson) {
          throw new Error("No response returned from the AI model.");
        }

        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.names)) {
          setNamesList(parsed.names);
        } else {
          throw new Error("Returned structure does not match required JSON array.");
        }
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to establish connection with the Gemini server.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopyName = (text, index) => {
    const tempElement = document.createElement('textarea');
    tempElement.value = text;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      setError("Unable to copy to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleToggleFavorite = (nameObj) => {
    if (favorites.some(f => f.name === nameObj.name)) {
      setFavorites(favorites.filter(f => f.name !== nameObj.name));
    } else {
      setFavorites([...favorites, nameObj]);
    }
  };

  const handleDownloadReport = () => {
    if (!namesList || namesList.length === 0) return;
    const plainText = namesList.map((n, idx) => `${idx + 1}. ${n.name} - ${n.meaning}`).join("\n");
    const formatted = `LUCID.NAMES REPORT\n====================\nPurpose: ${activePurpose}${purpose === "Baby Name" ? ` (${babyGender})` : ""}\nCulture/Language Context: ${activeCulture}\nStarting Letter: ${startingLetter || "None"}\n\n${plainText}\n\nGenerated via LUCID.NAMES Generator`;
    
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LucidNames_${activePurpose.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedMeaning = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-500 font-sans">{text}</span>;
    }

    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    let segments = [text];

    sortedHighlights.forEach((term) => {
      if (!term || term.trim() === "") return;
      const nextSegments = [];
      
      segments.forEach((segment) => {
        if (typeof segment !== 'string') {
          nextSegments.push(segment);
          return;
        }

        const matchIdx = segment.toLowerCase().indexOf(term.toLowerCase());
        if (matchIdx !== -1) {
          let remainder = segment;
          while (remainder.toLowerCase().indexOf(term.toLowerCase()) !== -1) {
            const index = remainder.toLowerCase().indexOf(term.toLowerCase());
            const before = remainder.substring(0, index);
            const match = remainder.substring(index, index + term.length);
            
            if (before) nextSegments.push(before);
            
            nextSegments.push(
              <span 
                key={`${match}-${index}-${Math.random()}`}
                className="bg-yellow-200 text-black px-1 py-0.5 rounded font-bold inline-block mx-0.5"
              >
                {match}
              </span>
            );
            
            remainder = remainder.substring(index + term.length);
          }
          if (remainder) nextSegments.push(remainder);
        } else {
          nextSegments.push(segment);
        }
      });
      segments = nextSegments;
    });

    return segments.map((part, idx) => (
      <React.Fragment key={idx}>
        {typeof part === 'string' ? <span className="text-neutral-500 font-sans">{part}</span> : part}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.NAMES</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Semantic & Cultural Naming Engine</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup("Baby Name", "S", "Tamil", "Girl")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Tamil Baby Girl S-
            </button>
            <button
              onClick={() => loadDemoSetup("Startup", "A", "Sanskrit")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: Sanskrit Tech A-
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        
        {/* Intro Hero Header */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              AI Name <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed font-sans">
              Discover beautiful, meaningful, and context-aware names dynamically. Specify your cultural lineage, regional focus, or custom product parameters and watch high-converting keywords highlight beautifully in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup("Brand name", "V", "Malayalam")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Malayalam Brand Demo
          </button>
        </div>

        {/* Dual splits layout structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Purpose Parameters */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Naming Parameters</span>
                </div>
                {(purpose !== "Startup" || startingLetter || culture !== "Tamil") && (
                  <button 
                    onClick={() => { setPurpose("Startup"); setStartingLetter(""); setCulture("Tamil"); setCustomCulture(""); setNamesList(null); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Settings</span>
                  </button>
                )}
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* Purpose of Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Core Purpose</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "Startup", label: "Startup", icon: Briefcase },
                      { id: "Brand name", label: "Brand", icon: Sparkles },
                      { id: "Baby Name", label: "Baby", icon: Baby }
                    ].map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPurpose(p.id)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center space-y-1 ${
                            purpose === p.id 
                              ? "bg-black text-white border-black shadow-sm" 
                              : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Baby Name Gender Selection */}
                {purpose === "Baby Name" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Boy", "Girl", "Unisex"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setBabyGender(g)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                            babyGender === g
                              ? "bg-black text-white border-black"
                              : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language / Culture Lineage */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Culture, Language, or Roots</label>
                  <select
                    value={culture}
                    onChange={(e) => setCulture(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="Tamil">Tamil (Classical / Traditional Roots)</option>
                    <option value="Sanskrit">Sanskrit (Spiritual / Vedic Roots)</option>
                    <option value="Malayalam">Malayalam (Coastal / Regional Roots)</option>
                    <option value="Kannada">Kannada (Historical / Traditional Roots)</option>
                    <option value="Telugu">Telugu (Classical / Poetic Roots)</option>
                    <option value="Modern Global">Modern Global (Minimalist & Punchy)</option>
                    <option value="Custom">Custom Dialect / Region...</option>
                  </select>
                </div>

                {culture === "Custom" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Specify Custom Dialect / Region</label>
                    <input
                      type="text"
                      value={customCulture}
                      onChange={(e) => setCustomCulture(e.target.value)}
                      placeholder="e.g. Punjabi, Bengali, Hindi, Japanese, French"
                      className="w-full text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                )}

                {/* Starting Letter Restriction */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Starting Letter Restriction (Optional)</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={startingLetter}
                    onChange={(e) => setStartingLetter(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                    placeholder="e.g. S, A, K (Leave blank for no restriction)"
                    className="w-full text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase font-mono font-bold"
                  />
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={() => handleGenerateNames(false)}
                  disabled={isLoading}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Distilling Perfect Names...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate 10 Names</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Output & Semantic Audit Plan */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Semantic Output</span>
                {namesList && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDownloadReport}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download List</span>
                    </button>
                  </div>
                )}
              </div>

              {/* API credentials diagnostic alert card */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">Authentication Failure (HTTP {errorCode || 'Error'})</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-neutral-600 text-[11px] leading-relaxed">
                    <strong>Action Required:</strong> Open the workspace file editor on the right and update the <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">const GEMINI_API_KEY = "YOUR_API_KEY_HERE"</code> variable at the top of `App.jsx` with your verified Google AI Studio API key.
                  </div>
                </div>
              )}

              {/* Main Content viewport */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Empty Placeholder state */}
                {!isLoading && !namesList && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <Sparkles className="h-7 w-7 text-neutral-400 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider font-sans">Naming Console Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Input your desired brand, baby name, or startup guidelines on the left settings. The engine will instantly render 10 tailored names with their cultural meaning and root derivations.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Loading state */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Synthesizing Core Syllables...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Mapping linguistic history, evaluating phonetic qualities, and wrapping classical roots in high-visibility semantic tags.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {namesList && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Header showing generated details and the "Generate 10 More" button */}
                    <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl border border-neutral-150">
                      <div>
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Current Settings</span>
                        <span className="text-xs font-bold text-black font-sans">{activePurpose} {purpose === "Baby Name" ? `(${babyGender})` : ""} • {activeCulture}</span>
                      </div>
                      <button
                        onClick={() => handleGenerateNames(true)}
                        className="text-xs bg-black text-white hover:bg-neutral-800 transition-colors font-bold px-3 py-2 rounded-lg flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Generate 10 More</span>
                      </button>
                    </div>

                    {/* Names Grid */}
                    <div className="grid grid-cols-1 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {namesList.map((item, index) => (
                        <div 
                          key={index}
                          className="p-4 bg-white hover:bg-neutral-50 border border-neutral-150 rounded-2xl flex items-start justify-between gap-4 transition-all hover:shadow-sm"
                        >
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-[10px] font-extrabold text-neutral-400 font-mono">#{index + 1}</span>
                              <h3 className="text-base font-extrabold text-black font-sans tracking-tight">{item.name}</h3>
                              
                              <button
                                onClick={() => handleToggleFavorite(item)}
                                className={`p-1 rounded-md transition-all ${
                                  favorites.some(f => f.name === item.name)
                                    ? "text-red-500 scale-110"
                                    : "text-neutral-300 hover:text-red-400"
                                }`}
                                title="Favorite"
                              >
                                <Heart className="h-3.5 w-3.5 fill-current" />
                              </button>
                            </div>
                            <p className="text-xs text-neutral-500 leading-relaxed font-sans font-medium">
                              {renderHighlightedMeaning(item.meaning, item.highlights)}
                            </p>
                          </div>

                          <button
                            onClick={() => handleCopyName(item.name, index)}
                            className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
                            title="Copy Name"
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* Favorites Shelf drawer */}
                {favorites.length > 0 && (
                  <div className="mt-6 border-t border-neutral-150 pt-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Saved Shortlist ({favorites.length})</span>
                      <button 
                        onClick={() => setFavorites([])}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Clear Shortlist
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {favorites.map((fav, i) => (
                        <span 
                          key={i} 
                          className="text-xs bg-neutral-900 text-white font-bold px-3 py-1 rounded-xl flex items-center space-x-1.5 shadow-sm"
                        >
                          <span>{fav.name}</span>
                          <button 
                            onClick={() => handleToggleFavorite(fav)}
                            className="text-neutral-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer specs */}
                {namesList && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Audit Model: {ACTIVE_MODEL}</span>
                    <span>Language Target: {activeCulture}</span>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes infiniteLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-infinite-loading {
          animation: infiniteLoading 1.6s infinite linear;
        }
      `}</style>

      {/* Global Page Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 font-semibold font-mono">
            © 2026 LUCID.NAMES. Linguistic & Semantic Naming Sandbox.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400 font-sans">
            <span>Secure Generator</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}