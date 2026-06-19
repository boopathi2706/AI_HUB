import React, { useState } from 'react';
import { 
  Mail, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  FileText,
  ThumbsUp,
  Briefcase,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';

// PASTE YOUR GEMINI API KEY HERE
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Email_Writer() {
  const [subject, setSubject] = useState("");
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState("Professional"); // Professional, Friendly, Urgent, Persuasive
  const [length, setLength] = useState("Medium"); // Short, Medium, Long
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");

  // System states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [emailData, setEmailData] = useState(null); 
  /* emailData schema:
    {
      subject: "Generated Subject Line",
      body: "Generated email text...",
      highlights: ["important word 1", "[Name]", "Deadline"]
    }
  */

  const loadDemoPrompt = () => {
    setSubject("Rescheduling Project Sync meeting");
    setPurpose("I need to push our Friday meeting to Monday afternoon because of an urgent client conflict. Apologize for the inconvenience and ask if 2 PM works.");
    setTone("Professional");
    setLength("Medium");
    setSenderName("Alex");
    setRecipientName("Sarah");
    setEmailData(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateEmail = async () => {
    if (!purpose.trim()) {
      setError("Please outline the core purpose or notes for your email.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setEmailData(null);

    // Verify key configuration before making the call
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
      setError("API Key is missing inside the code. Please edit App.jsx and replace 'YOUR_API_KEY_HERE' with your real Gemini API Key from Google AI Studio.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite corporate copywriter and executive communications expert.
Write an email based on the user's requirements.
The sender name is "${senderName || 'Sender'}" and the recipient is "${recipientName || 'Recipient'}".
Format the tone to "${tone}" and keep the length orientation "${length}".

Your output MUST be a valid JSON object matching this schema strictly:
{
  "subject": "The email subject line",
  "body": "The full complete email body including salutations and sign-offs",
  "highlights": ["3 to 8 high-impact action phrases, dates, variables, or placeholder items like '[Date]', '[Name]', '[Meeting]', etc. present in the email to highlight"]
}
Do not return any markdown or markdown code blocks (such as \`\`\`json), just return the raw JSON object string. Use only double quotes for JSON keys and properties.`;

    const userQuery = `Subject suggestion: ${subject}\nPurpose/Details: ${purpose}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING" },
            body: { type: "STRING" },
            highlights: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["subject", "body", "highlights"]
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
          throw new Error("Empty response received from the generation engine.");
        }

        const parsedData = JSON.parse(jsonText);
        setEmailData(parsedData);
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to communicate with the writing model.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopy = () => {
    if (!emailData) return;
    const fullText = `Subject: ${emailData.subject}\n\n${emailData.body}`;
    const el = document.createElement('textarea');
    el.value = fullText;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Unable to copy email body automatically.");
    }
    document.body.removeChild(el);
  };

  const handleDownload = () => {
    if (!emailData) return;
    const fileContent = `EMAIL DRAFT REVISION\n===========================\nSubject: ${emailData.subject}\n\n${emailData.body}\n\n===========================\nGenerated with LUCID.EMAIL`;
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AI_Email_Draft.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearAllFields = () => {
    setSubject("");
    setPurpose("");
    setSenderName("");
    setRecipientName("");
    setEmailData(null);
    setError("");
    setErrorCode(null);
  };

  const renderHighlightedBody = (text, highlights) => {
    if (!highlights || highlights.length === 0) return <span className="text-neutral-600">{text}</span>;
    
    // Sort highlights by length descending to avoid substring overlapping replacements
    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    let parts = [text];

    sortedHighlights.forEach((phrase) => {
      if (!phrase || phrase.trim() === "") return;
      const newParts = [];
      
      parts.forEach((part) => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        const index = part.indexOf(phrase);
        if (index !== -1) {
          let currentStr = part;
          while (currentStr.indexOf(phrase) !== -1) {
            const matchIndex = currentStr.indexOf(phrase);
            const before = currentStr.substring(0, matchIndex);
            const match = currentStr.substring(matchIndex, matchIndex + phrase.length);
            
            if (before) newParts.push(before);
            
            newParts.push(
              <span 
                key={`${match}-${matchIndex}-${Math.random()}`}
                className="bg-yellow-200 text-black px-1 py-0.5 rounded font-semibold border-b border-yellow-300 transition-colors"
                title="AI Key Highlighted Item"
              >
                {match}
              </span>
            );
            
            currentStr = currentStr.substring(matchIndex + phrase.length);
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

  return (
    <div className="min-h-screen bg-white text-neutral-600 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-light">.EMAIL</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-mono uppercase tracking-widest">Aesthetic Copywriter</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadDemoPrompt} 
              className="text-xs font-semibold px-3.5 py-2 text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Load Demo Brief
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-6">
        
        {/* Dual Split Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Email Configuration / Input fields */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Email Generation Brief</span>
                </div>
                {(subject || purpose || senderName || recipientName) && (
                  <button 
                    onClick={clearAllFields}
                    className="text-xs text-neutral-400 hover:text-red-500 flex items-center space-x-1 font-medium transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Draft</span>
                  </button>
                )}
              </div>

              {/* Input Form Elements */}
              <div className="p-6 space-y-5 flex-grow">
                
                {/* Subject suggestion */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Subject Guideline (Optional)</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Quick check-in, Meeting Reschedule"
                    className="w-full text-sm text-neutral-800 placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 focus:outline-none transition-all"
                  />
                </div>

                {/* Purpose of Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">What is this email about? (Required)</label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe the main message or purpose... e.g., 'Thanking the interviewer for their time. Highlight my enthusiasm for the frontend position.'"
                    className="w-full text-sm text-neutral-800 placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-4 min-h-[140px] resize-none focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Sender & Recipient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Recipient Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g., Sarah"
                      className="w-full text-sm text-neutral-800 placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sender Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g., Alex"
                      className="w-full text-sm text-neutral-800 placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Tone and Length Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tone Contour</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                    >
                      <option value="Professional">💼 Elegant & Professional</option>
                      <option value="Friendly">☕ Warm & Friendly</option>
                      <option value="Urgent">🚨 Urgent & Time-Sensitive</option>
                      <option value="Persuasive">🎯 Convincing & Sales-focused</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Length Target</label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                    >
                      <option value="Short">⚡ Short & Concise</option>
                      <option value="Medium">📄 Medium Standard</option>
                      <option value="Long">📚 In-Depth & Detailed</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateEmail}
                  disabled={isLoading || !purpose.trim()}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !purpose.trim()
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Drafting your Email...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate Draft Copy</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Email Output Viewport */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[460px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-black uppercase tracking-wider">Polished Draft Result</span>
                {emailData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
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
                          <span>Copy Draft</span>
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

              {/* Error Callout Drawer */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-3 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">API Action Required</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>

                  {errorCode === 401 && (
                    <div className="bg-white p-3 rounded-xl border border-red-100 space-y-2 text-neutral-600">
                      <span className="font-bold text-red-800 text-[10px] block">Instructions:</span>
                      <p className="text-neutral-500 text-[11px] leading-relaxed">
                        To activate generation capability, edit the <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">App.jsx</code> file inside the code editor on the right and replace <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">"YOUR_API_KEY_HERE"</code> with your actual Gemini API key.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Central Viewing Chamber */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Placeholder empty state */}
                {!isLoading && !emailData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400">
                      <Mail className="h-7 w-7 text-neutral-300" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Engine Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Provide your instructions on the left workspace and click generate to review pristine custom drafts.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Generation Loading state */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Synthesizing Email Tone Matrix...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Refining greeting layout and embedding context highlights into custom draft paragraphs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results viewer */}
                {emailData && !isLoading && (
                  <div className="space-y-5 flex-grow flex flex-col">
                    
                    {/* Subject line output card */}
                    <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex items-start space-x-2 text-xs">
                      <span className="font-bold text-neutral-400 uppercase tracking-widest block shrink-0 mt-0.5">Subject:</span>
                      <span className="text-black font-semibold font-sans">{emailData.subject}</span>
                    </div>

                    {/* Interactive Highlights Output Area */}
                    <div className="space-y-2 flex-grow">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Interactive Copy Body</label>
                      <div className="p-4 bg-white border border-neutral-150 rounded-xl leading-relaxed whitespace-pre-wrap text-sm font-sans min-h-[220px]">
                        {renderHighlightedBody(emailData.body, emailData.highlights)}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-[10px] text-neutral-400 mt-1 italic">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Dynamic items and placeholder targets are automatically highlighted in <span className="bg-yellow-200 text-black px-1 rounded font-semibold">yellow</span>.</span>
                      </div>
                    </div>

                    {/* Focus Highlights keywords tags */}
                    {emailData.highlights && emailData.highlights.length > 0 && (
                      <div className="space-y-2 border-t border-neutral-100 pt-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Action Keywords Included ({emailData.highlights.length})</label>
                        <div className="flex flex-wrap gap-1.5">
                          {emailData.highlights.map((tag, i) => (
                            <span key={i} className="text-[10px] bg-neutral-100 text-neutral-700 font-bold px-2 py-0.5 rounded border border-neutral-150">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer metadata */}
                {emailData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 flex items-center justify-between">
                    <span>Active Engine: {ACTIVE_MODEL}</span>
                    <span>Preset Preset: {tone} ({length})</span>
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
            © 2026 LUCID.EMAIL Writing Solutions. All context and draft templates calculated in memory.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Security Protocols</span>
            <span>•</span>
            <span>Local Copy Workspace</span>
          </div>
        </div>
      </footer>

    </div>
  );
}