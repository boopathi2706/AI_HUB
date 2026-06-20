import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Terminal,
  Trash2,
  Cpu,
  BookOpen,
  Code,
  Download,
  Award,
  Lightbulb
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Code_Explainer() {
  const [code, setCode] = useState("");
  const [explainLevel, setExplainLevel] = useState("Beginner"); // Beginner, Intermediate, Senior Engineer
  const [language, setLanguage] = useState("Automatic");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedExplanation, setCopiedExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState(null);

  const loadDemoCode = (sampleCode, lang, level) => {
    setCode(sampleCode);
    setLanguage(lang);
    setExplainLevel(level);
    setExplanationData(null);
    setError("");
    setErrorCode(null);
  };

  const handleExplainCode = async () => {
    if (!code.trim()) {
      setError("Please paste or write some code inside the editor area.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setExplanationData(null);

    // Prompt user to customize key if not updated
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly on your editor on the right and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite, world-class Principal Software Engineer and Technical Instructor.
Explain the provided code snippet to a reader at the target comprehension level: "${explainLevel}".
The language of the code is estimated to be: "${language}".

Provide structural analysis, complexity metrics, and clean block explanations. 
You must identify 4 to 8 high-value technical terms, key functions, standard APIs, or variables within your text explanations to highlight in yellow inside the UI.

Return a strictly formatted JSON object matching this exact schema:
{
  "summary": "A concise 1-2 sentence overall master overview of what this script achieves.",
  "complexity": {
    "time": "O(N) or O(1) or O(N log N) etc.",
    "space": "O(1) or O(N) etc.",
    "explanation": "A concise explanation of why these asymptotic bounds exist."
  },
  "breakdowns": [
    {
      "segment": "Specific line, function name, or code section",
      "explanation": "Detailed, highly accessible instruction explaining what this segment does and why it matters.",
      "highlights": ["list of key terms, variable names, APIs, or keywords used in THIS explanation string to highlight in yellow"]
    }
  ],
  "optimizations": [
    {
      "concept": "Name of refactoring or improvement concept",
      "description": "Brief explanation of how to make this code faster, more readable, or cleaner."
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown blocks.`;

    const payload = {
      contents: [{ parts: [{ text: code }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            complexity: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING" },
                space: { type: "STRING" },
                explanation: { type: "STRING" }
              },
              required: ["time", "space", "explanation"]
            },
            breakdowns: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  segment: { type: "STRING" },
                  explanation: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["segment", "explanation", "highlights"]
              }
            },
            optimizations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  concept: { type: "STRING" },
                  description: { type: "STRING" }
                },
                required: ["concept", "description"]
              }
            }
          },
          required: ["summary", "complexity", "breakdowns", "optimizations"]
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
          throw new Error("Empty response received from artificial intelligence layer.");
        }

        const parsed = JSON.parse(rawJson);
        setExplanationData(parsed);
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to communicate with the generative language server.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopyExplanation = () => {
    if (!explanationData) return;
    
    const plainText = `SUMMARY:
${explanationData.summary}

COMPLEXITY:
Time: ${explanationData.complexity.time} | Space: ${explanationData.complexity.space}
${explanationData.complexity.explanation}

SEGMENT BREAKDOWN:
${explanationData.breakdowns.map(b => `[${b.segment}]\n${b.explanation}`).join('\n\n')}

RECOMMENDATIONS:
${explanationData.optimizations.map(o => `• ${o.concept}: ${o.description}`).join('\n')}`;

    const tempElement = document.createElement('textarea');
    tempElement.value = plainText;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedExplanation(true);
      setTimeout(() => setCopiedExplanation(false), 2000);
    } catch (err) {
      setError("Unable to copy to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadExplanation = () => {
    if (!explanationData) return;
    
    const plainText = `AI CODE EXPLAINER ANALYSIS\n============================\nTarget Audience Level: ${explainLevel}\nLanguage Profile: ${language}\n\n[Summary]\n${explanationData.summary}\n\n[Complexity Profiles]\nTime Complexity: ${explanationData.complexity.time}\nSpace Complexity: ${explanationData.complexity.space}\nExplanation: ${explanationData.complexity.explanation}\n\n[Code Segment Breakdowns]\n${explanationData.breakdowns.map((b, idx) => `Breakdown #${idx + 1}: ${b.segment}\n${b.explanation}`).join('\n\n')}\n\n[Recommendations]\n${explanationData.optimizations.map(o => `- ${o.concept}: ${o.description}`).join('\n')}\n\nAnalyzed via AI Code Explainer.`;
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Code_Explanation_${language.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedExplanation = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600 font-sans">{text}</span>;
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
                className="bg-yellow-200 text-black px-1.5 py-0.5 rounded font-bold inline-block mx-0.5"
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
        {typeof part === 'string' ? <span className="text-neutral-600 font-sans">{part}</span> : part}
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
              <Code className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.CODE</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Structural Logic Inspector</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoCode(
                "function findDuplicates(arr) {\n  let seen = new Set();\n  let duplicates = [];\n  for (let val of arr) {\n    if (seen.has(val)) {\n      duplicates.push(val);\n    } else {\n      seen.add(val);\n    }\n  }\n  return duplicates;\n}", 
                "JavaScript", 
                "Beginner"
              )}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Javascript
            </button>
            <button
              onClick={() => loadDemoCode(
                "def binary_search(arr, target):\n    low = 0\n    high = len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1", 
                "Python", 
                "Intermediate"
              )}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: Python
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
              AI Code <span className="bg-yellow-200 px-1.5 rounded-sm">Explainer</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Deconstruct complexity, demystify legacy scripts, and learn clean paradigms. Paste any function, adjust your preferred explanation level, and watch as high-value programmatic keys are highlighted cleanly in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoCode(
              "public class Singleton {\n    private static Singleton instance;\n    private Singleton() {}\n    public static synchronized Singleton getInstance() {\n        if (instance == null) {\n            instance = new Singleton();\n        }\n        return instance;\n    }\n}", 
              "Java", 
              "Senior Engineer"
            )}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Singleton
          </button>
        </div>

        {/* Dual splits layout structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Codes */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Editor Workspace</span>
                </div>
                {code && (
                  <button 
                    onClick={() => { setCode(""); setExplanationData(null); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Workspace</span>
                  </button>
                )}
              </div>

              {/* Text Input Content */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* Code Editor block */}
                <div className="space-y-1.5 flex-grow flex flex-col">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Paste Script Code Here</label>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Paste your complex code snippets, algorithm blocks, or legacy APIs here..."
                    className="w-full flex-grow text-xs text-neutral-800 placeholder-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-mono focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none min-h-[250px]"
                  />
                </div>

                {/* Level parameters */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Explanation Complexity Target</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Beginner", value: "Beginner" },
                      { label: "Intermediate", value: "Intermediate" },
                      { label: "Senior Engineer", value: "Senior Engineer" }
                    ].map((item) => {
                      const isSelected = explainLevel === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setExplainLevel(item.value)}
                          className={`p-3 text-xs font-semibold rounded-xl border transition-all ${
                            isSelected 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language parameter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Programming Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="Automatic">Automatic Detection</option>
                    <option value="JavaScript">JavaScript / TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="C++">C++ / C</option>
                    <option value="C#">C# / .NET</option>
                    <option value="Go">Go / Golang</option>
                    <option value="Rust">Rust</option>
                  </select>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleExplainCode}
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
                      <span>Deconstructing Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Explain Code</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Output Analysis */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Analysis Board</span>
                {explanationData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyExplanation}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copiedExplanation ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>Copy Explanation</span>
                    </button>
                    <button
                      onClick={handleDownloadExplanation}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
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
                {!isLoading && !explanationData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <BookOpen className="h-7 w-7 text-neutral-400" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Inspector Hub Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Customize source code on the left config editor, select target parameters, and witness clean modular breakdowns and algorithmic complexity profiling.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Evaluating Code Patterns...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Evaluating control structures, inspecting Big O asymptotics, and drafting structural highlights for the explained cards.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {explanationData && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Overall Summary block */}
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Core Summary Overview</span>
                      <p className="text-xs text-neutral-700 leading-relaxed font-sans font-medium">
                        {explanationData.summary}
                      </p>
                    </div>

                    {/* Complexity Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Time Complexity */}
                      <div className="p-4 bg-white rounded-xl border border-neutral-200 flex items-start space-x-3 shadow-sm hover:shadow-md transition-all">
                        <div className="p-2 bg-yellow-100 rounded-lg text-yellow-800 shrink-0">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Time Complexity</span>
                          <span className="text-black font-extrabold font-mono text-sm block">{explanationData.complexity.time}</span>
                          <p className="text-[11px] text-neutral-500 leading-normal font-sans">
                            {explanationData.complexity.explanation}
                          </p>
                        </div>
                      </div>

                      {/* Space Complexity */}
                      <div className="p-4 bg-white rounded-xl border border-neutral-200 flex items-start space-x-3 shadow-sm hover:shadow-md transition-all">
                        <div className="p-2 bg-neutral-100 rounded-lg text-neutral-800 shrink-0">
                          <Terminal className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Space Complexity</span>
                          <span className="text-black font-extrabold font-mono text-sm block">{explanationData.complexity.space}</span>
                          <p className="text-[11px] text-neutral-500 leading-normal font-sans">
                            Overall auxiliary space bounds are optimized in memory limits.
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Step breakdowns list with custom segment highlights */}
                    <div className="space-y-3.5 flex-grow max-h-[380px] overflow-y-auto pr-1">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Line-by-Line Breakdown</span>
                      
                      {explanationData.breakdowns.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-150 space-y-2 hover:bg-neutral-50 transition-all"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                              {item.segment || "General Block"}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">Module #{idx + 1}</span>
                          </div>

                          <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                            {renderHighlightedExplanation(item.explanation, item.highlights)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Optimizations Card list */}
                    {explanationData.optimizations && explanationData.optimizations.length > 0 && (
                      <div className="space-y-3 border-t border-neutral-100 pt-5">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Optimization Recommendations</span>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {explanationData.optimizations.map((item, idx) => (
                            <div key={idx} className="flex items-start space-x-3 p-3 bg-yellow-50/30 rounded-xl border border-yellow-150">
                              <Lightbulb className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-xs text-neutral-900 block">{item.concept}</span>
                                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* Footer contextual specifications */}
                {explanationData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Platform: {ACTIVE_MODEL}</span>
                    <span>Target Level: {explainLevel}</span>
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
            © 2026 LUCID.CODE. Secure Code Intelligence & Analytics.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Engineering Sandbox</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}