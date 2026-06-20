import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  ShieldAlert,
  Key,
  Trash2,
  Download,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Binary
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_JWT_Token_Generator() {
  const [keyLength, setKeyLength] = useState("256"); // 128, 256, 512 bit standard
  const [keyFormat, setKeyFormat] = useState("hex"); // hex, base64url, alphanumeric
  const [generatedKey, setGeneratedKey] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Native Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
  const generateSecureKey = (bits, format) => {
    try {
      const bytesCount = Math.ceil(bits / 8);
      const array = new Uint8Array(bytesCount);
      window.crypto.getRandomValues(array);

      if (format === 'hex') {
        return Array.from(array)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else if (format === 'base64url') {
        const binStr = Array.from(array).map(b => String.fromCharCode(b)).join('');
        return btoa(binStr)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      } else {
        // High-Entropy Alphanumeric + Special Characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let result = '';
        for (let i = 0; i < bytesCount * 2; i++) {
          const randomIndex = array[i % bytesCount] % chars.length;
          result += chars[randomIndex];
        }
        return result;
      }
    } catch (e) {
      return "generation-failed-local-crypto-unavailable";
    }
  };

  // Trigger initial key generation on mount
  useEffect(() => {
    handleRegenerateLocalKey();
  }, [keyLength, keyFormat]);

  const handleRegenerateLocalKey = () => {
    const key = generateSecureKey(parseInt(keyLength), keyFormat);
    setGeneratedKey(key);
    setAiAnalysis(null);
    setError("");
    setErrorCode(null);
  };

  const handleAuditKey = async () => {
    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setAiAnalysis(null);

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite cryptographer, DevSecOps auditor, and cloud security specialist.
Audit the generated key parameters:
Key Length: ${keyLength} bits
Key Format: ${keyFormat}
Key Value: ${generatedKey}

Provide an advanced entropy analysis, brute-force estimate, and operational deployment checklist.
You must identify 4 to 8 high-impact technical terms, standards (e.g. NIST, Shannon Entropy, brute-force, KMS, Vault), or security measures inside your text explanation to highlight in yellow in the UI.

Return a strictly formatted JSON object matching this exact schema:
{
  "securityScore": 95, // An integer evaluation out of 100 on the robustness of this key
  "critique": "A highly readable, concise 2-4 sentence analysis of the key's mathematical entropy, recommended applications, and compliance guidelines.",
  "highlights": ["list of exact technical terms or standards used in your critique to highlight in yellow in the UI"],
  "bestPractices": [
    {
      "step": "Title of step (e.g. Key Rotation, Environment Security)",
      "severity": "Low" | "Medium" | "High",
      "solution": "Actionable, precise solution or secure implementation guide."
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Analyze key strength and entropy.` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            securityScore: { type: "INTEGER" },
            critique: { type: "STRING" },
            highlights: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            bestPractices: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  step: { type: "STRING" },
                  severity: { type: "STRING", enum: ["Low", "Medium", "High"] },
                  solution: { type: "STRING" }
                },
                required: ["step", "severity", "solution"]
              }
            }
          },
          required: ["securityScore", "critique", "highlights", "bestPractices"]
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
        setAiAnalysis(parsed);
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

  const handleCopyKey = () => {
    if (!generatedKey) return;
    const tempElement = document.createElement('textarea');
    tempElement.value = generatedKey;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      setError("Unable to copy key to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleCopyAnalysis = () => {
    if (!aiAnalysis) return;
    const formattedText = `SECURITY AUDIT REPORT\n====================\nScore: ${aiAnalysis.securityScore}/100\n\n[Critique]\n${aiAnalysis.critique}\n\n[Best Practices]\n${aiAnalysis.bestPractices.map(p => `- [${p.severity}] ${p.step}: ${p.solution}`).join('\n')}`;
    const tempElement = document.createElement('textarea');
    tempElement.value = formattedText;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedAnalysis(true);
      setTimeout(() => setCopiedAnalysis(false), 2000);
    } catch (err) {
      setError("Unable to copy analysis report.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadKey = () => {
    if (!generatedKey) return;
    const blob = new Blob([generatedKey], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `secure_key_${keyLength}bit_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedCritique = (text, highlights) => {
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
                className="bg-yellow-200 text-black px-1.5 py-0.5 rounded font-bold inline-block mx-0.5 animate-pulse"
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
              <Key className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.KEY</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Secure Entropy Generator</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setKeyLength("256"); setKeyFormat("hex"); }}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Preset: 256-bit Hex
            </button>
            <button
              onClick={() => { setKeyLength("512"); setKeyFormat("base64url"); }}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Preset: 512-bit Base64
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
              AI Secure Key <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Instantly compile high-entropy cryptographic keys using native CSPRNG libraries. Customize your bit-length and format, then evaluate key robustness with our automated intelligence scanner.
            </p>
          </div>
          <button
            onClick={handleRegenerateLocalKey}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md flex items-center space-x-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Generate New Key</span>
          </button>
        </div>

        {/* Dual splits layout structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Payload Parameters */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Binary className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Strength Configuration</span>
                </div>
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-6 flex-grow flex flex-col">

                {/* Secret Token Key Length (bit representation) */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Bit-Length Strength</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["128", "256", "512"].map((bits) => (
                      <button
                        key={bits}
                        onClick={() => setKeyLength(bits)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                          keyLength === bits 
                            ? "bg-black text-white border-black" 
                            : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        {bits}-bit
                        <span className="block text-[9px] font-medium opacity-70 mt-0.5">
                          {bits === "128" ? "16 bytes" : bits === "256" ? "32 bytes" : "64 bytes"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Encoding Formats */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Output Encoding Format</label>
                  <div className="space-y-2">
                    {[
                      { id: "hex", label: "Hexadecimal (0-9, a-f)", desc: "Widely supported in databases and configs" },
                      { id: "base64url", label: "Base64URL", desc: "URL-safe, highly compact string format" },
                      { id: "alphanumeric", label: "Alphanumeric + Symbols", desc: "Maximum character entropy density" }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setKeyFormat(fmt.id)}
                        className={`w-full text-left p-4 rounded-xl text-xs transition-all border flex flex-col space-y-0.5 ${
                          keyFormat === fmt.id 
                            ? "bg-black text-white border-black" 
                            : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        <span className="font-bold">{fmt.label}</span>
                        <span className={`text-[10px] ${keyFormat === fmt.id ? "text-neutral-300" : "text-neutral-400"}`}>{fmt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleAuditKey}
                  disabled={isLoading || !generatedKey}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !generatedKey
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Running Security Audit...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Audit & Analyze Key</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Token Console & Security Audit Plan */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cryptographic Output</span>
                {generatedKey && (
                  <div className="flex items-center space-x-2">
                    {aiAnalysis && (
                      <button
                        onClick={handleCopyAnalysis}
                        className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                      >
                        {copiedAnalysis ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>Copy Audit Report</span>
                      </button>
                    )}
                    <button
                      onClick={handleDownloadKey}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Key</span>
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
                      <span className="font-extrabold text-sm text-black block">Analysis Failure (HTTP {errorCode || 'Error'})</span>
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
                
                {/* 1. Compile Display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Generated Cryptographic Secret Key</span>
                    <button
                      onClick={handleCopyKey}
                      className="text-xs text-neutral-400 hover:text-black flex items-center space-x-1 font-mono hover:bg-neutral-50 px-2.5 py-1 rounded border border-neutral-250 transition-all"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy Secret Key'}</span>
                    </button>
                  </div>
                  <div className="p-4 bg-neutral-950 rounded-xl font-mono text-xs overflow-x-auto whitespace-normal break-all leading-relaxed shadow-inner border border-neutral-900 text-center py-6">
                    {generatedKey ? (
                      <span className="text-yellow-300 font-extrabold tracking-wider text-sm select-all">{generatedKey}</span>
                    ) : (
                      <span className="text-neutral-500">Awaiting generation metrics...</span>
                    )}
                  </div>
                  <div className="flex space-x-4 text-[10px] text-neutral-400 font-mono justify-between items-center">
                    <span>Format Profile: <span className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">{keyFormat}</span></span>
                    <span>Entropy Density: <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold text-[9px]">{keyLength} Bits</span></span>
                  </div>
                </div>

                {/* 2. Loading state */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Conducting AI Cryptographic Audit...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Evaluating Shannon entropy levels, assessing brute-force resilience limits, planning rotation checklists, and highlighting secure architectures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {aiAnalysis && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col mt-6 border-t border-neutral-150 pt-6">
                    
                    {/* Security Rating Metric */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-neutral-150 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <div className="relative h-12 w-12 rounded-full border-4 border-yellow-200 flex items-center justify-center bg-white shadow-sm shrink-0">
                          <span className="text-xs font-extrabold text-black">{aiAnalysis.securityScore}%</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Entropy Rating</span>
                          <span className="text-xs font-semibold text-neutral-600 block -mt-0.5">
                            {aiAnalysis.securityScore >= 90 ? "Excellent production margin" : aiAnalysis.securityScore >= 70 ? "Standard security margin" : "Weak key profile detected"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-medium max-w-sm border-l border-neutral-200 pl-4 py-1 leading-relaxed hidden sm:block font-sans">
                        Audit parsed dynamically via Gemini.
                      </div>
                    </div>

                    {/* Step breakdowns with custom segment highlights */}
                    <div className="space-y-2">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">LUCID Security Evaluation</span>
                      <p className="text-xs leading-relaxed text-neutral-600">
                        {renderHighlightedCritique(aiAnalysis.critique, aiAnalysis.highlights)}
                      </p>
                    </div>

                    {/* Best Practices Recommendations */}
                    {aiAnalysis.bestPractices && aiAnalysis.bestPractices.length > 0 ? (
                      <div className="space-y-3 border-t border-neutral-100 pt-5">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Secure Deployment Architecture Guidelines</span>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {aiAnalysis.bestPractices.map((practice, idx) => (
                            <div key={idx} className="flex items-start space-x-3 p-3 bg-yellow-50/30 rounded-xl border border-yellow-150">
                              <ShieldAlert className={`h-4 w-4 shrink-0 mt-0.5 ${practice.severity === 'High' ? 'text-red-500' : practice.severity === 'Medium' ? 'text-yellow-600' : 'text-neutral-500'}`} />
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-xs text-neutral-950 font-bold">{practice.step}</span>
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${practice.severity === 'High' ? 'bg-red-100 text-red-800' : practice.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-neutral-100 text-neutral-600'}`}>
                                    {practice.severity} Priority
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">{practice.solution}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center space-x-3 text-emerald-800">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <div>
                          <span className="font-extrabold text-xs block">Optimal Cryptographic Fit</span>
                          <span className="text-[11px] opacity-90 block mt-0.5">Key parameters meet standard deployment security baselines.</span>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer specs */}
                {aiAnalysis && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Audit Model: {ACTIVE_MODEL}</span>
                    <span>CSPRNG Engine: window.crypto</span>
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
            © 2026 LUCID.KEY. Secure Cryptographic Key Utility.
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