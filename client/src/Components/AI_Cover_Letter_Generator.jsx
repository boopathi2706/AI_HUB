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
  Briefcase,
  ChevronRight,
  Printer
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Cover_Letter_Generator() {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [wordCount, setWordCount] = useState("150"); // 100, 150, 250
  const [coverTone, setCoverTone] = useState("Professional"); // Professional, Bold & Creative, Enthusiastic
  const [additionalContext, setAdditionalContext] = useState(""); // Optional resume/skills overview
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(null);

  const loadDemoSetup = (title, company, words, tone, skills) => {
    setJobTitle(title);
    setCompanyName(company);
    setWordCount(words);
    setCoverTone(tone);
    setAdditionalContext(skills);
    setGeneratedLetter(null);
    setError("");
    setErrorCode(null);
  };

  const handleClear = () => {
    setJobTitle("");
    setCompanyName("");
    setWordCount("150");
    setCoverTone("Professional");
    setAdditionalContext("");
    setGeneratedLetter(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateLetter = async () => {
    if (!jobTitle.trim() || !companyName.trim()) {
      setError("Please specify both the Job Title and Company Name to continue.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setGeneratedLetter(null);

    // Block process if API key is not configured in the file
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the React code on the right and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite career coach and expert copywriter.
Your task is to generate an exceptional, highly persuasive cover letter for the role: "${jobTitle}" at "${companyName}".
- Length must target approximately ${wordCount} words.
- Tone must be strictly "${coverTone}".
- If provided, weave in this professional background context naturally: "${additionalContext}".

Ensure the output is professional, engaging, and incorporates dynamic, highlighted placeholders like [Your Name], [Your Phone], [Email Link] so the user can easily locate where to customize the text.
You must also identify 4 to 8 high-impact phrases, skills, or action verbs in the letter to be highlighted in yellow in the user interface.

Return a strictly formatted JSON object matching this exact schema:
{
  "subjectLine": "Subject: Application for...",
  "body": "Dear Hiring Team,\\n\\n[Paragraph 1 - Hook]\\n\\n[Paragraph 2 - Body detailing skills/fit]\\n\\n[Paragraph 3 - Conclusion & Call to Action]\\n\\nSincerely,\\n[Your Name]",
  "highlights": ["list of exact keywords, action verbs, skills, or brackets (like [Your Name], [Phone]) used in the letter text to highlight in yellow"]
}
Return only raw JSON. Do not wrap the output inside markdown blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate a cover letter for ${jobTitle} at ${companyName}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subjectLine: { type: "STRING" },
            body: { type: "STRING" },
            highlights: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["subjectLine", "body", "highlights"]
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
        const msg = errorData.error?.message || `HTTP Connection Status: ${response.status}`;
        throw new Error(msg);
      }

      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeFetch();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawJson) {
          throw new Error("Empty response received from generation model.");
        }

        const parsed = JSON.parse(rawJson);
        if (parsed && parsed.body) {
          setGeneratedLetter(parsed);
        } else {
          throw new Error("Structured JSON does not match correct schema properties.");
        }
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

  const handleCopyAll = () => {
    if (!generatedLetter) return;
    const plainText = `${generatedLetter.subjectLine}\n\n${generatedLetter.body}`;
    
    const tempElement = document.createElement('textarea');
    tempElement.value = plainText;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Unable to copy to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadReport = () => {
    if (!generatedLetter) return;
    const completeFileContent = `COVER LETTER GENERATED REPORT\n================================\nRole: ${jobTitle}\nCompany: ${companyName}\nTone: ${coverTone}\n\n${generatedLetter.subjectLine}\n\n${generatedLetter.body}\n\nCompiled via AI Cover Letter Generator.`;
    const blob = new Blob([completeFileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cover_Letter_${companyName.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedText = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600">{text}</span>;
    }

    // Sort terms by length descending to prevent partial match conflicts
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
        {typeof part === 'string' ? <span className="text-neutral-600">{part}</span> : part}
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
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.LETTER</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider">Linguistic Placement Engine</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup("Frontend Engineer", "Google", "150", "Enthusiastic", "Strong experience with React, Tailwind CSS, TypeScript, and interactive web tools.")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Frontend
            </button>
            <button
              onClick={() => loadDemoSetup("Product Manager", "Stripe", "250", "Bold & Creative", "5+ years leading cross-functional engineering teams, scaling APIs, and boosting conversion rate by 18%.")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: PM
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        
        {/* Intro Block */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              AI Cover Letter <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Dynamically formulate custom-tailored cover letters designed to align with job descriptions. Key candidate attributes, highlights, and placeholders are emphasized cleanly in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup("Data Scientist", "Netflix", "150", "Professional", "Expert in ML pipelines, predictive modeling, Python, and big data visualization.")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Data Science
          </button>
        </div>

        {/* Dual splits workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Controls Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Evaluation Config</span>
                </div>
                {generatedLetter && (
                  <button 
                    onClick={handleClear}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Workspace</span>
                  </button>
                )}
              </div>

              {/* Form Input Section */}
              <div className="p-6 space-y-5 flex-grow">
                
                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Software Architect"
                    className="w-full text-xs bg-white border border-neutral-250 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. OpenAI"
                    className="w-full text-xs bg-white border border-neutral-250 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* Cover Letter Length */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Word Count</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Short (100w)", value: "100" },
                      { label: "Medium (150w)", value: "150" },
                      { label: "Detailed (250w)", value: "250" }
                    ].map((item) => {
                      const isSelected = wordCount === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setWordCount(item.value)}
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

                {/* Cover Letter Tone */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Letter Writing Tone</label>
                  <select
                    value={coverTone}
                    onChange={(e) => setCoverTone(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-250 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="Professional">Professional & Polished</option>
                    <option value="Bold & Creative">Bold, Creative & Narrative</option>
                    <option value="Enthusiastic">High Energy & Enthusiastic</option>
                    <option value="Warm & Humble">Warm, Grounded & Humble</option>
                  </select>
                </div>

                {/* Additional Context / Keywords / Skills */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Your Key Skills & Accomplishments (Optional)</label>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Include specific career highlights or relevant technical experience you want integrated..."
                    rows={4}
                    className="w-full text-xs bg-white border border-neutral-250 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                  />
                </div>

              </div>

              {/* Control Trigger Area */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateLetter}
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
                      <span>Drafting Pitch Deck Letter...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Synthesize Cover Letter</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Display Panel */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Generated Document Board</span>
                {generatedLetter && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyAll}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>Copy Letter</span>
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download file</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Credentials Validation Alert Card */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">Authentication Fail (HTTP {errorCode || 'Error'})</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-neutral-600 text-[11px] leading-relaxed">
                    <strong>Action Required:</strong> Open the workspace file editor on the right and update the <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">const GEMINI_API_KEY = "YOUR_API_KEY_HERE"</code> variable at the top of `App.jsx` with your Google AI Studio API key.
                  </div>
                </div>
              )}

              {/* Main Content Render Box */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Placeholder empty layout */}
                {!isLoading && !generatedLetter && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <FileText className="h-7 w-7 text-neutral-400" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Letter Generation Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Customize target parameters in the left config board, hit generate, and the expert system will construct a comprehensive, professionally targeted cover letter.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Architecting Cover Letter...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Synthesizing personalized achievements, matching standard structural guidelines, and highlighting core values.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {generatedLetter && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Header Context Metrics Banner */}
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Selected Company Target</span>
                        <span className="text-black font-extrabold">{companyName} — {jobTitle}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Tone Profile</span>
                          <span className="text-black font-extrabold uppercase">{coverTone}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Word Target</span>
                          <span className="text-black font-extrabold font-mono">~{wordCount} words</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Q&A list wrapper */}
                    <div className="flex-grow space-y-4 p-5 bg-neutral-50/50 rounded-2xl border border-neutral-150 max-h-[500px] overflow-y-auto">
                      
                      {/* Subject Line display */}
                      <div className="pb-3 border-b border-neutral-200/60">
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Subject Line</span>
                        <h2 className="text-sm font-bold text-neutral-900">
                          {renderHighlightedText(generatedLetter.subjectLine, generatedLetter.highlights)}
                        </h2>
                      </div>

                      {/* Letter Body Display */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">Letter Body</span>
                        <p className="text-xs text-neutral-600 font-sans leading-relaxed whitespace-pre-wrap">
                          {renderHighlightedText(generatedLetter.body, generatedLetter.highlights)}
                        </p>
                      </div>

                    </div>

                    {/* Quick Hint Footer */}
                    <div className="text-[10px] text-neutral-400 italic bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 flex items-center space-x-2">
                      <span className="bg-yellow-200 px-1 py-0.5 rounded font-extrabold text-black shrink-0">Note:</span>
                      <span>Review and replace the highlighted parameters like [Your Name] or [Date] before sending.</span>
                    </div>

                  </div>
                )}

                {/* Footer Context Info */}
                {generatedLetter && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Platform: {ACTIVE_MODEL}</span>
                    <span>Tone Target: {coverTone}</span>
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
            © 2026 LUCID.LETTER. Premium Candidate Solutions.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Career Placement Sandbox</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}