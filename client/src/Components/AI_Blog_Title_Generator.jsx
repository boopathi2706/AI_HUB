import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  TrendingUp,
  Sliders,
  Download,
  BookOpen,
  FileText,
  Lightbulb
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Blog_Title_Generator() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Viral & Catchy"); // Professional, Clickbait, SEO Focus
  const [niche, setNiche] = useState("Technology & Business");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [titlesList, setTitlesList] = useState(null);

  const loadDemoTopic = (sampleTopic, sampleNiche) => {
    setTopic(sampleTopic);
    setNiche(sampleNiche);
    setTitlesList(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateTitles = async () => {
    if (!topic.trim()) {
      setError("Please write or paste a core topic/idea for your blog.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setTitlesList(null);

    // If API key is not configured, show a helpful validation error
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("API Key is missing. Please edit the code to configure a valid GEMINI_API_KEY.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an SEO and viral copywriting expert.
Based on the topic "${topic}", niche "${niche}", and desired tone: "${tone}", generate exactly 10 high-impact, click-worthy, and SEO-optimized blog titles.

You must identify 1 or 2 high-converting "power words" or key phrases in each title that must be highlighted in the UI.

Return a strictly formatted JSON object with this exact schema:
{
  "titles": [
    {
      "text": "The complete blog title goes here",
      "type": "Specific sub-category (e.g. Listicle, Guide, Curious, Case Study)",
      "highlights": ["1 or 2 specific words or short phrases from the text string to highlight in yellow"]
    }
  ]
}
Return only raw JSON. Do not wrap the JSON inside markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Topic: ${topic}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            titles: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  text: { type: "STRING" },
                  type: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["text", "type", "highlights"]
              }
            }
          },
          required: ["titles"]
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
        const msg = errorData.error?.message || `HTTP Server Status: ${response.status}`;
        throw new Error(msg);
      }

      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeFetch();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawJson) {
          throw new Error("No readable response generated from model.");
        }

        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.titles)) {
          setTitlesList(parsed.titles);
        } else {
          throw new Error("Returned structure does not match required JSON array.");
        }
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to establish secure connection to generative language engine.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopySingle = (text, index) => {
    const tempElement = document.createElement('textarea');
    tempElement.value = text;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch (err) {
      setError("Unable to copy to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadAll = () => {
    if (!titlesList || titlesList.length === 0) return;
    const plainText = titlesList.map((t, idx) => `${idx + 1}. [${t.type}] ${t.text}`).join("\n");
    const formatted = `SUMM.TITLES REPORT\n====================\nNiche: ${niche}\nTone profile: ${tone}\nOrigin prompt: "${topic}"\n\n${plainText}\n\nGenerated secure and offline via SUMM.TITLES`;
    
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AI_Titles_${niche.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedTitle = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-900 font-bold">{text}</span>;
    }

    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    let parts = [text];

    sortedHighlights.forEach((phrase) => {
      if (!phrase || phrase.trim() === "") return;
      const nextParts = [];
      
      parts.forEach((part) => {
        if (typeof part !== 'string') {
          nextParts.push(part);
          return;
        }

        const matchIdx = part.toLowerCase().indexOf(phrase.toLowerCase());
        if (matchIdx !== -1) {
          let currentStr = part;
          while (currentStr.toLowerCase().indexOf(phrase.toLowerCase()) !== -1) {
            const index = currentStr.toLowerCase().indexOf(phrase.toLowerCase());
            const before = currentStr.substring(0, index);
            const match = currentStr.substring(index, index + phrase.length);
            
            if (before) nextParts.push(before);
            
            nextParts.push(
              <span 
                key={`${match}-${index}-${Math.random()}`}
                className="bg-yellow-200 text-black px-1.5 py-0.5 rounded font-extrabold shadow-sm inline-block mx-0.5"
              >
                {match}
              </span>
            );
            
            currentStr = currentStr.substring(index + phrase.length);
          }
          if (currentStr) nextParts.push(currentStr);
        } else {
          nextParts.push(part);
        }
      });
      parts = nextParts;
    });

    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {typeof part === 'string' ? <span className="text-neutral-900 font-bold">{part}</span> : part}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">SUMM<span className="text-yellow-500 font-semibold">.TITLES</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider">Aesthetic Blog Architecture</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadDemoTopic("How to cook premium sourdough artisan bread at home", "Culinary Arts")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-colors"
            >
              Autofill Sourdough Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        
        {/* Intro Block */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              Generate 10 <span className="bg-yellow-200 px-1 rounded-sm">High-CTR Blog Titles</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Design viral, catchy, and search engine friendly headers instantly. Our customized copywriting model picks up core ideas and embeds high-impact power words custom-highlighted in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoTopic("A guide on building robust React architectures in 2026", "Technology")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow"
          >
            Autofill Tech Demo
          </button>
        </div>

        {/* Dual Split Workspaces */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sliders className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Title Settings</span>
                </div>
              </div>

              {/* Form Areas */}
              <div className="p-6 space-y-5 flex-grow">
                
                {/* Topic Specification */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Blog Topic or Content Brief</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. 'A comprehensive list on learning react architecture rules for advanced developers'"
                    className="w-full text-sm text-black placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-4 min-h-[120px] resize-none focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Niche Categories */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Niche categorization</label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Technology, Lifestyle, Business"
                    className="w-full text-sm text-black placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 focus:outline-none transition-all"
                  />
                </div>

                {/* Tone Variations */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Editorial Tone contour</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="Viral & Catchy">🔥 Viral, Playful & Catchy</option>
                    <option value="Professional & Clear">💼 Authority-driven & Professional</option>
                    <option value="Clickbait / Hype">⚡ High CTR / Clickbait / Intrigue</option>
                    <option value="SEO Optimized">🎯 Pure Keyword / Search Engine Optimized</option>
                  </select>
                </div>

              </div>

              {/* Submit Control Card */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateTitles}
                  disabled={isLoading || !topic.trim()}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !topic.trim()
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Synthesizing Headlines...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate 10 Titles</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Display Titles */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[480px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Generated Ideas</span>
                {titlesList && (
                  <button
                    onClick={handleDownloadAll}
                    className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Report</span>
                  </button>
                )}
              </div>

              {/* Error Callouts */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">Authentication Required (HTTP {errorCode || 'Error'})</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-neutral-600 text-[11px]">
                    <strong>Action Required:</strong> To resolve this error, edit the code directly in your editor and replace <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">const GEMINI_API_KEY = "YOUR_API_KEY_HERE"</code> at the top with your verified Gemini API key.
                  </div>
                </div>
              )}

              {/* Content viewport */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Empty State */}
                {!isLoading && !titlesList && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-400">
                      <TrendingUp className="h-7 w-7 text-neutral-300" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Headline Hub Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Input your concept parameters on the left, click generate, and the copywriter engine will output 10 viral variations with focus terms highlighted.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Loading State */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Synthesizing High-CTR Options...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Refining dynamic phrases, sorting layout keywords, and creating optimal focus parameters.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {titlesList && !isLoading && (
                  <div className="space-y-5 flex-grow">

                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {titlesList.map((item, index) => (
                        <div 
                          key={index} 
                          className="p-4 bg-white hover:bg-neutral-50 rounded-xl border border-neutral-150 flex items-start justify-between gap-4 transition-all hover:shadow-sm"
                        >
                          <div className="space-y-2 flex-grow">
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] bg-neutral-100 text-neutral-500 font-extrabold px-2 py-0.5 rounded border border-neutral-200 uppercase tracking-widest">
                                {item.type}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono font-bold">Option #{index + 1}</span>
                            </div>
                            
                            <p className="text-sm font-sans leading-relaxed text-neutral-600">
                              {renderHighlightedTitle(item.text, item.highlights)}
                            </p>
                          </div>

                          <button
                            onClick={() => handleCopySingle(item.text, index)}
                            className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-150 rounded-lg transition-colors shrink-0 flex items-center justify-center"
                            title="Copy Title"
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

                {/* Contextual statistics */}
                {titlesList && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Engine: {ACTIVE_MODEL}</span>
                    <span>Format Tone: {tone} ({niche})</span>
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
          <p className="text-xs text-neutral-400 font-semibold">
            © 2026 SUMM.TITLES. Premium Creative Copywriting.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Secure Sandbox</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}