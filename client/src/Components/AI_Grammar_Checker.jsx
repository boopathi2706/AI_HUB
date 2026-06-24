import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  FileText,
  ThumbsUp,
  SpellCheck,
  BookOpen
} from 'lucide-react';

// PLACE YOUR GEMINI API KEY HERE
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Grammar_Checker() {
  const [textInput, setTextInput] = useState("");
  const [tone, setTone] = useState("Professional"); // Professional, Casual, Academic, Creative
  const [dialect, setDialect] = useState("American English");
  
  // Core loading, analysis and result parameters
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState(null); 

  const loadDemoText = () => {
    setTextInput(
      "yesterday i goes to the market for buying some apple. the seller were very friendly but he do not have any fresh fruits left. i is very disappoint."
    );
    setResults(null);
    setError("");
    setErrorCode(null);
  };

  const handleGrammarCheck = async () => {
    if (!textInput.trim()) {
      setError("Please paste or write some text to evaluate.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setResults(null);

    // Verify key configuration
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("API Key is missing inside the code. Please edit App.jsx and replace 'YOUR_API_KEY_HERE' with your real Gemini API Key from Google AI Studio.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite linguistic editor and grammar expert.
Analyze the provided text. Correct any spelling errors, grammatical mistakes, structural mishaps, punctuation gaps, and adjust the tone to "${tone}" using the dialect of "${dialect}".
Your output MUST be a valid JSON object matching this schema strictly:
{
  "originalText": "The original user input",
  "correctedText": "The fully polished and corrected text",
  "score": 85, // An integer score out of 100 evaluating the grammar quality of original text
  "overallFeedback": "A concise paragraph describing the quality of the original text and advice for the writer.",
  "corrections": [
    {
      "original": "the bad word/phrase",
      "corrected": "the corrected word/phrase",
      "explanation": "Brief context why it was changed",
      "category": "Grammar" // Can be Grammar, Spelling, Punctuation, or Style
    }
  ]
}
Do not return any markdown or markdown code blocks (such as \`\`\`json), just return the raw JSON object string. Use only double quotes for JSON keys and properties.`;

    const payload = {
      contents: [{ parts: [{ text: textInput }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            originalText: { type: "STRING" },
            correctedText: { type: "STRING" },
            score: { type: "INTEGER" },
            overallFeedback: { type: "STRING" },
            corrections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  original: { type: "STRING" },
                  corrected: { type: "STRING" },
                  explanation: { type: "STRING" },
                  category: { type: "STRING", enum: ["Grammar", "Spelling", "Punctuation", "Style"] }
                },
                required: ["original", "corrected", "explanation", "category"]
              }
            }
          },
          required: ["originalText", "correctedText", "score", "overallFeedback", "corrections"]
        }
      }
    };

    let attempt = 0;
    const maxAttempts = 5;
    let delay = 1000;

    const executeRequest = async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setErrorCode(response.status);
        const errorDetails = await response.json().catch(() => ({}));
        const message = errorDetails.error?.message || `HTTP status ${response.status}`;
        throw new Error(message);
      }

      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeRequest();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) {
          throw new Error("Empty content received from AI.");
        }

        const parsedData = JSON.parse(jsonText);
        setResults(parsedData);
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to establish secure API handshakes.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopy = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2050);
    } catch (err) {
      setError("Failed to copy text automatically.");
    }
    document.body.removeChild(el);
  };

  const handleDownload = () => {
    if (!results) return;
    const fileContent = `LUCID_REPORT\n===========================\nQuality Score: ${results.score}/100\n\n[Original Draft]\n${results.originalText}\n\n[Polished Result (${tone} - ${dialect})]\n${results.correctedText}\n\n[Linguistic Feedback]\n${results.overallFeedback}\n\n[Step-by-Step Edits]\n${results.corrections.map((c, i) => `${i+1}. "${c.original}" -> "${c.corrected}" [${c.category}]: ${c.explanation}`).join('\n')}`;
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Polished_Analysis_Report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedText = (text, corrections) => {
    if (!corrections || corrections.length === 0) return <span className="text-neutral-500">{text}</span>;
    
    // Sort corrections descending by size to prevent substring matching clashes
    const sortedCorrections = [...corrections].sort((a, b) => b.corrected.length - a.corrected.length);
    let parts = [text];

    sortedCorrections.forEach((correction) => {
      const searchVal = correction.corrected;
      if (!searchVal) return;

      const newParts = [];
      parts.forEach((part) => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        const index = part.indexOf(searchVal);
        if (index !== -1) {
          let currentStr = part;
          while (currentStr.indexOf(searchVal) !== -1) {
            const matchIndex = currentStr.indexOf(searchVal);
            const before = currentStr.substring(0, matchIndex);
            const match = currentStr.substring(matchIndex, matchIndex + searchVal.length);
            
            if (before) newParts.push(before);
            
            newParts.push(
              <span 
                key={`${match}-${matchIndex}-${Math.random()}`}
                className="bg-[#7209b7] text-white border-b-2 border-[#7209b7] px-1 py-0.5 mx-0.5 rounded font-semibold cursor-help group relative inline-block transition-transform duration-75 hover:scale-105"
              >
                {match}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-[10px] p-2.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none w-52 z-30 text-center font-normal mb-1.5 leading-normal">
                  Changed from: <del className="text-red-300 font-mono">"{correction.original}"</del>
                  <span className="block mt-1 text-yellow-300 font-semibold">{correction.explanation}</span>
                </span>
              </span>
            );
            
            currentStr = currentStr.substring(matchIndex + searchVal.length);
          }
          if (currentStr) newParts.push(currentStr);
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {typeof part === 'string' ? <span className="text-neutral-600">{part}</span> : part}
      </React.Fragment>
    ));
  };

  const wordCount = (textInput || "").trim() === "" ? 0 : textInput.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-white text-neutral-600 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-[#7209b7] text-white p-2 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">MagicPrompt<span className="text-[#7209b7] font-bold">.Grammar Checker</span></span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadDemoText} 
              className="text-xs font-semibold px-3.5 py-2 text-neutral-600 hover:text-white bg-neutral-100 hover:bg-[#7209b7] cursor-pointer rounded-lg transition-colors"
            >
              Load Broken Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-6">
        
        {/* Workspace Dual-Split Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          { }
          {/* Input Panel */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Your Draft Writing</span>
                </div>
                {textInput && (
                  <button 
                    onClick={() => { setTextInput(""); setResults(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 flex items-center space-x-1 font-medium transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Draft</span>
                  </button>
                )}
              </div>

              {/* Text Area */}
              <div className="p-6 flex-grow flex flex-col relative min-h-[320px]">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your sentences or paragraphs here. We will analyze the wording, grammar constraints, punctuation, and flow instantly..."
                  className="w-full flex-grow text-neutral-700 placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-[#7209b7] focus:border-[#7209b7] focus:ring-1 focus:ring-[#7209b7] rounded-xl p-4 text-sm resize-none focus:outline-none transition-all leading-relaxed"
                  style={{ minHeight: '280px' }}
                />
                
                {/* Live words counter */}
                <div className="absolute bottom-10 right-10 bg-black text-white text-[9px] tracking-widest font-mono uppercase px-2 py-0.5 rounded opacity-75">
                  WORDS: {wordCount}
                </div>
              </div>

              {/* Action Controls */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Tone */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">Adjustment Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2.5 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                    >
                      <option value="Professional">💼 Professional / Corporate</option>
                      <option value="Casual">☕ Casual / Friendly</option>
                      <option value="Academic">🎓 Academic / Strict</option>
                      <option value="Creative">🎨 Creative / Expressive</option>
                    </select>
                  </div>

                  {/* Select Dialect */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">Target Dialect</label>
                    <select
                      value={dialect}
                      onChange={(e) => setDialect(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2.5 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                    >
                      <option value="American English">🇺🇸 English (US)</option>
                      <option value="British English">🇬🇧 English (UK)</option>
                      <option value="Canadian English">🇨🇦 English (CA)</option>
                      <option value="Australian English">🇦🇺 English (AU)</option>
                      <option value="Spanish (Castilian)">🇪🇸 Spanish (ES)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGrammarCheck}
                  disabled={isLoading || !textInput.trim()}
                  className={`w-full font-bold text-xs uppercase cursor-pointer tracking-widest py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !textInput.trim()
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-[#7209b7] hover:bg-purple-500 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      <span>Synthesizing Corrections...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-white animate-bounce" />
                      <span>Check Grammar & Spelling</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {}
          {/* Output Panel */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[450px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-black uppercase tracking-wider">Polished Masterpiece</span>
                {results && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(results.correctedText)}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy The Correct Sentence</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Troubleshooting Diagnostics Drawer */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-150 rounded-2xl flex flex-col space-y-3 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">API Request Blocked</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>

                  {errorCode === 401 && (
                    <div className="bg-white p-3 rounded-xl border border-red-100 space-y-2 text-neutral-600">
                      <span className="font-bold text-red-800 text-[10px] block">Action Required:</span>
                      <p className="text-neutral-500 text-[11px] leading-relaxed">
                        To resolve this error, edit <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">App.jsx</code> in your editor and replace <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">"YOUR_API_KEY_HERE"</code> with your valid Gemini API Key.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Main View Port Window rendering states */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Placeholder */}
                {!isLoading && !results && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Engine Idle</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Input writing drafts on the left viewport and click submit to trigger automatic grammar polishing.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Loading State */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-[#7209b7] rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Synthesizing Text Structural Fixes...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Checking syntax bounds, spelling matrices, and adjusting tone contours.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results state */}
                {results && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Top Scoring header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-150">
                      <div className="flex items-center space-x-3">
                        <div className="relative h-11 w-11 rounded-full border-4 border-[#7209b7] flex items-center justify-center bg-white shadow-sm">
                          <span className="text-xs font-bold text-black">{results.score}%</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Quality score</span>
                          <span className="text-xs font-semibold text-black block -mt-0.5">
                            {results.score >= 90 ? "Brilliant flow!" : results.score >= 70 ? "Good draft copy" : "Needs basic editing"}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-[11px] text-neutral-400 font-medium max-w-sm border-l border-neutral-200 pl-4 py-0.5 hidden sm:block">
                        {results.overallFeedback}
                      </p>
                    </div>

                    {/* Interactive Highlights Output Box */}
                    <div className="space-y-2 flex-grow">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Corrected Prose Viewport</label>
                      <div className="p-4 bg-white border border-neutral-150 rounded-xl leading-relaxed whitespace-pre-wrap text-sm">
                        {renderHighlightedText(results.correctedText, results.corrections)}
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-1 italic">
                        Hover over words highlighted in <span className="bg-[#7209b7] text-white px-1 rounded font-semibold">purple</span> to show original terminology.
                      </span>
                    </div>

                    {/* List corrections detail */}
                    {results.corrections && results.corrections.length > 0 ? (
                      <div className="space-y-3 border-t border-neutral-100 pt-5">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Detail of Alterations ({results.corrections.length})</label>
                        
                        <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                          {results.corrections.map((corr, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100/50 rounded-xl border border-neutral-150 gap-2 transition-colors">
                              <div className="flex items-center space-x-2">
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-200 text-[#7209b7] border border-purple-400">
                                  {corr.category}
                                </span>
                                <div className="text-xs text-neutral-400 font-mono">
                                  <span className="line-through">"{corr.original}"</span>
                                  <span className="text-black font-semibold font-sans ml-1.5">➔ "{corr.corrected}"</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-neutral-500 font-medium pl-1 italic">
                                {corr.explanation}
                              </span>
                            </div>
                          ))}
                        </div>

                      </div>
                    ) : (
                      <div className="p-4 bg-neutral-50 rounded-2xl flex items-center space-x-3 text-neutral-500 text-xs">
                        <ThumbsUp className="h-5 w-5 text-black" />
                        <div>
                          <span className="font-bold text-black block">Perfect Integrity Detected!</span>
                          <span className="opacity-90 block mt-0.5">Your spelling, syntax patterns, and phrase choices are flawless.</span>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Info footer metadata */}
                {results && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 flex items-center justify-between">
                    <span>Engine: {ACTIVE_MODEL}</span>
                    <span>Style Preset: {tone} ({dialect})</span>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Global CSS Inject */}
      <style>{`
        @keyframes infiniteLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-infinite-loading {
          animation: infiniteLoading 1.6s infinite linear;
        }
      `}</style>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 font-medium">
            © 2026 LUCID.AI Writing Solutions. All metrics calculated securely in memory.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Security Protocols</span>
            <span>•</span>
            <span>Local Processing Privacy</span>
          </div>
        </div>
      </footer>

    </div>
  );
}