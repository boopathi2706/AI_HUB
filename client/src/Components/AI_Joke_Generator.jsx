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
  Smile,
  Volume2,
  VolumeX,
  Share2,
  Languages,
  BookOpen
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Joke_Generator() {
  const [language, setLanguage] = useState("English"); // Tamil, English, Hindi, Kannada, Malayalam, Telugu, Custom
  const [customLanguage, setCustomLanguage] = useState("");
  const [jokeCount, setJokeCount] = useState(3); // Minimum 3 jokes constraint
  const [jokeType, setJokeType] = useState("Puns & Wordplay"); // Tech Humor, Dad Jokes, Regional/Cultural

  // API and UI Action State Handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [jokesList, setJokesList] = useState(null);

  const activeLanguage = language === "Custom" ? customLanguage : language;

  const loadDemoSetup = (demoLang, demoCount, demoType) => {
    setLanguage(demoLang);
    setJokeCount(demoCount);
    setJokeType(demoType);
    setJokesList(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateJokes = async (isNewBatch = false) => {
    const finalLanguage = activeLanguage.trim() || "English";

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    if (!isNewBatch) {
      setJokesList(null);
    }

    // Stop speaking if any previous TTS was playing
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);

    // Validate if the key has been substituted
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are a world-class professional stand-up comedian, punmaster, and cultural writer.
Generate exactly ${jokeCount} highly engaging, clean, and contextually hilarious jokes customized for:
Language: ${finalLanguage} (The setup and punchline should be written in the script or format most natural to this language / regional audience).
Category: ${jokeType}

For each joke, provide a distinct setup and punchline.
Identify 1 to 4 core words or humorous punch phrases that should be highlighted in yellow in the user interface (usually the funny part or the climax of the punchline).

Return a strictly formatted JSON object matching this exact schema:
{
  "jokes": [
    {
      "setup": "The clear setup of the joke/pun",
      "punchline": "The hilarious punchline or climax of the joke",
      "highlights": ["the funniest word", "another funny phrase"]
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate ${jokeCount} funny jokes in ${finalLanguage}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            jokes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  setup: { type: "STRING" },
                  punchline: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["setup", "punchline", "highlights"]
              }
            }
          },
          required: ["jokes"]
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
        if (parsed && Array.isArray(parsed.jokes)) {
          setJokesList(parsed.jokes);
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

  const handleCopyJoke = (setup, punchline, index) => {
    const fullText = `${setup}\n\n${punchline}`;
    const tempElement = document.createElement('textarea');
    tempElement.value = fullText;
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

  const handleReadAloud = (setup, punchline, index) => {
    if ('speechSynthesis' in window) {
      if (speakingIndex === index) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        return;
      }

      window.speechSynthesis.cancel();
      const textToSpeak = `${setup}. ${punchline}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Attempt to pick a voice matching the selected language dialect
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      if (activeLanguage.toLowerCase().includes("tamil")) {
        selectedVoice = voices.find(v => v.lang.startsWith("ta-IN") || v.lang.startsWith("ta"));
      } else if (activeLanguage.toLowerCase().includes("hindi")) {
        selectedVoice = voices.find(v => v.lang.startsWith("hi-IN") || v.lang.startsWith("hi"));
      } else if (activeLanguage.toLowerCase().includes("malayalam")) {
        selectedVoice = voices.find(v => v.lang.startsWith("ml-IN") || v.lang.startsWith("ml"));
      } else if (activeLanguage.toLowerCase().includes("telugu") || activeLanguage.toLowerCase().includes("thelungu")) {
        selectedVoice = voices.find(v => v.lang.startsWith("te-IN") || v.lang.startsWith("te"));
      } else if (activeLanguage.toLowerCase().includes("kannada") || activeLanguage.toLowerCase().includes("karnadam")) {
        selectedVoice = voices.find(v => v.lang.startsWith("kn-IN") || v.lang.startsWith("kn"));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setSpeakingIndex(null);
      };

      utterance.onerror = () => {
        setSpeakingIndex(null);
      };

      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
    } else {
      setError("Speech synthesis is not supported on your browser.");
    }
  };

  const handleToggleFavorite = (jokeObj) => {
    if (favorites.some(f => f.setup === jokeObj.setup)) {
      setFavorites(favorites.filter(f => f.setup !== jokeObj.setup));
    } else {
      setFavorites([...favorites, jokeObj]);
    }
  };

  const handleDownloadReport = () => {
    if (!jokesList || jokesList.length === 0) return;
    const plainText = jokesList.map((j, idx) => `Joke #${idx + 1}\nSetup: ${j.setup}\nPunchline: ${j.punchline}\n---`).join("\n\n");
    const formatted = `LUCID.LAUGHS ARCHIVE\n====================\nLanguage Context: ${activeLanguage}\nGenre: ${jokeType}\nJoke Count: ${jokeCount}\n\n${plainText}\n\nGenerated via LUCID.LAUGHS`;
    
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LucidLaughs_${activeLanguage.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedPunchline = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-950 font-sans font-bold">{text}</span>;
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
                className="bg-yellow-200 text-black px-1.5 py-0.5 rounded font-extrabold inline-block mx-0.5 shadow-sm transform hover:scale-105 transition-transform"
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
        {typeof part === 'string' ? <span className="text-neutral-950 font-bold font-sans">{part}</span> : part}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-md">
              <Smile className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.LAUGHS</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Cognitive Humor Generator</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup("Tamil", 3, "Regional/Cultural")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Tamil Jokes (3Q)
            </button>
            <button
              onClick={() => loadDemoSetup("English", 5, "Puns & Wordplay")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: English Puns (5Q)
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        
        {/* Intro Hero Header */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              AI Joke <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed font-sans">
              Generate fully customized, culturally specific humor batches instantly. Select your preferred Indian or Global dialect, define joke counts of at least 3, and enjoy punchy setups with dynamic yellow highlights.
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup("Hindi", 4, "Dad Jokes")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Hindi Dad Jokes
          </button>
        </div>

        {/* Dual split workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Humor Parameters</span>
                </div>
                {(language !== "English" || jokeCount !== 3 || jokeType !== "Puns & Wordplay") && (
                  <button 
                    onClick={() => { setLanguage("English"); setJokeCount(3); setJokeType("Puns & Wordplay"); setCustomLanguage(""); setJokesList(null); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Settings</span>
                  </button>
                )}
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* 1. Language Picker (supporting classical & modern Indian scripts) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Humor Language / Dialect</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="English">English (Global Stand-up)</option>
                    <option value="Tamil">Tamil (தமிழ் - Cultural / Tanglish)</option>
                    <option value="Hindi">Hindi (हिंदी - Hinglish / Hasya Kavi)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ - Karunada Wit)</option>
                    <option value="Malayalam">Malayalam (മലയാളം - Sarcastic/Regional)</option>
                    <option value="Telugu">Telugu (తెలుగు - Cinematic Punch)</option>
                    <option value="Custom">Custom Language / Dialect...</option>
                  </select>
                </div>

                {/* Custom Language Input Fallback */}
                {language === "Custom" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Specify Custom Language</label>
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      placeholder="e.g. Punjabi, Bengali, Marathi, German"
                      className="w-full text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                )}

                {/* 2. Category of Humor */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Comedy Category</label>
                  <select
                    value={jokeType}
                    onChange={(e) => setJokeType(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="Puns & Wordplay">🔥 Puns & Wordplay</option>
                    <option value="Dad Jokes">👨 Dad Jokes (Wholesome/Corny)</option>
                    <option value="Regional/Cultural">🍛 Regional / Cultural Wit</option>
                    <option value="Tech & Coding Humor">💻 Tech & Coding Jokes</option>
                    <option value="One-Liners">⚡ Quick One-Liners</option>
                  </select>
                </div>

                {/* 3. Slider Selection for Joke Count (Minimum 3 jokes constraint) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Joke Count (Min 3)</label>
                    <span className="text-xs font-bold text-black">{jokeCount} Jokes</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={jokeCount}
                    onChange={(e) => setJokeCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 font-mono font-bold uppercase">
                    <span>Min: 3 Jokes</span>
                    <span>Max: 10 Jokes</span>
                  </div>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={() => handleGenerateJokes(false)}
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
                      <span>Distilling Cognitive Comedy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Compile Jokes Batch</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Jokes Workspace</span>
                {jokesList && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDownloadReport}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Jokes</span>
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
                {!isLoading && !jokesList && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <Smile className="h-7 w-7 text-neutral-400 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider font-sans">Humor Hub Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Configure your target comedy metrics on the left side configuration workspace. The AI Stand-up editor will instantly draft a batch of at least 3 jokes complete with interactive speech playback and highlighted punchlines.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Compiling Creative Stand-up Set...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Translating cultural humor parameters, refining semantic wordplay setups, and highlighting key punchline terms in yellow.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {jokesList && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Header showing generated details and the "Generate More" button */}
                    <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl border border-neutral-150">
                      <div>
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Set Settings</span>
                        <span className="text-xs font-bold text-black font-sans">{activeLanguage} • {jokeType}</span>
                      </div>
                      <button
                        onClick={() => handleGenerateJokes(true)}
                        className="text-xs bg-black text-white hover:bg-neutral-800 transition-colors font-bold px-3 py-2 rounded-lg flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Generate More</span>
                      </button>
                    </div>

                    {/* Jokes List Container */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {jokesList.map((item, index) => (
                        <div 
                          key={index}
                          className="p-5 bg-white border border-neutral-200 rounded-2xl flex flex-col space-y-3.5 transition-all hover:shadow-sm"
                        >
                          <div className="space-y-2 flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-neutral-400">JOKE #{index + 1}</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleReadAloud(item.setup, item.punchline, index)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    speakingIndex === index 
                                      ? "bg-black text-yellow-400 border-black" 
                                      : "border-neutral-200 hover:bg-neutral-100 text-neutral-500"
                                  }`}
                                  title="Read Aloud"
                                >
                                  {speakingIndex === index ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleToggleFavorite(item)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    favorites.some(f => f.setup === item.setup)
                                      ? "text-red-500 border-red-200 bg-red-50"
                                      : "border-neutral-200 hover:bg-neutral-100 text-neutral-300"
                                  }`}
                                  title="Add to Shortlist"
                                >
                                  <Heart className="h-3.5 w-3.5 fill-current" />
                                </button>
                                <button
                                  onClick={() => handleCopyJoke(item.setup, item.punchline, index)}
                                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors"
                                  title="Copy"
                                >
                                  {copiedIndex === index ? (
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Setup */}
                            <p className="text-sm font-sans font-medium text-neutral-600 bg-neutral-50 p-3.5 rounded-xl border border-neutral-150/60 leading-relaxed italic">
                              "{item.setup}"
                            </p>
                            
                            {/* Punchline with Yellow Highlights */}
                            <div className="text-sm font-sans leading-relaxed text-neutral-800 pt-1">
                              👉 {renderHighlightedPunchline(item.punchline, item.highlights)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* Favorites Shortlist drawer */}
                {favorites.length > 0 && (
                  <div className="mt-6 border-t border-neutral-150 pt-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Saved Shortlist (${favorites.length})</span>
                      <button 
                        onClick={() => setFavorites([])}
                        className="text-[10px] text-red-500 font-bold hover:underline font-mono uppercase tracking-wider"
                      >
                        Clear List
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {favorites.map((fav, i) => (
                        <span 
                          key={i} 
                          className="text-xs bg-black text-white font-bold px-3 py-1 rounded-xl flex items-center space-x-2 shadow-sm"
                        >
                          <span className="truncate max-w-[150px]">{fav.setup}</span>
                          <button 
                            onClick={() => handleToggleFavorite(fav)}
                            className="text-neutral-400 hover:text-white transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer specs */}
                {jokesList && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Audit Model: {ACTIVE_MODEL}</span>
                    <span>Genre Style: {jokeType}</span>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>

      </main>

      {}
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
            © 2026 LUCID.LAUGHS. Cognitive Humor & Stands Sandbox.
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