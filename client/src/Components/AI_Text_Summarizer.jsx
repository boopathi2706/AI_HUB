import  { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ArrowRight, 
  Languages, 
  AlertCircle,
} from 'lucide-react';

// Initialize PDF.js worker
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function AI_Text_Summarizer() {
  const [option, setOption] = useState("Text"); // "Text" | "Upload_Pdf"
  const [textInput, setTextInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  
  // Customization Options
  const [summaryLength, setSummaryLength] = useState("medium"); // short, medium, detailed
  const [summaryFormat, setSummaryFormat] = useState("bullets"); // paragraphs, bullets, structured
  const [targetLanguage, setTargetLanguage] = useState("English");
  
  // API and Result States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryData, setSummaryData] = useState(null); 
  // summaryData: { summary: string, highlights: string[], bulletPoints: string[] }

  const fileInputRef = useRef(null);

  // Auto-fill test content helper
  const loadDemoText = () => {
    setTextInput(
      "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. Some popular accounts use the term 'artificial intelligence' to describe machines that mimic 'cognitive' functions that humans associate with the human mind, such as 'learning' and 'problem solving', however, modern AI researchers reject this definition. Major AI applications include advanced web search engines (e.g., Google Search), recommendation systems (used by YouTube, Amazon, and Netflix), understanding human speech (such as Google Assistant, Siri, and Alexa), self-driving cars (e.g., Waymo), generative or creative tools (ChatGPT and Midjourney), and competing at the highest level in strategic games (such as chess and Go)."
    );
    setOption("Text");
  };

  // Safe client-side PDF Extraction
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPdfError("Please select a valid PDF document.");
      return;
    }

    setFileName(file.name);
    setIsParsingPdf(true);
    setPdfError("");
    setError("");

    try {
      const pdfjs = await loadPdfJs();
      const reader = new FileReader();
      
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
          let fullText = "";
          const maxPages = Math.min(pdf.numPages, 15); // Limit to first 15 pages for performance

          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += pageText + "\n\n";
          }

          if (!fullText.trim()) {
            throw new Error("No readable text found in this PDF. It might be an image-only scan.");
          }

          setTextInput(fullText);
          setIsParsingPdf(false);
        } catch (err) {
          setPdfError(err.message || "Failed to extract text from PDF.");
          setIsParsingPdf(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setPdfError("Could not load PDF processing library. Please try again.");
      setIsParsingPdf(false);
    }
  };

  // Run the Gemini Summarization using strict API guidelines
  const handleSummarize = async () => {
    if (!textInput.trim()) {
      setError("Please provide some text or upload a document to summarize.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSummaryData(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Provided automatically at runtime
    const model = "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an elite research summarizer and analyst.
Analyze the source text carefully and formulate a comprehensive, high-quality, professional summary.
Your output MUST be a valid JSON object matching this schema strictly:
{
  "summary": "A concise master summary narrative of the input text",
  "highlights": ["3 to 6 highly specific, key industry/topic terms, keywords, or core ideas extracted directly from the text"],
  "bulletPoints": ["Detailed, logical, step-by-step key takeaways that represent the substance of the text"]
}
Do not return any formatting blocks or markdown wrapping around the JSON, just the JSON string. Ensure target language is strictly "${targetLanguage}". Make sure the summary length is "${summaryLength}" and format style is oriented towards "${summaryFormat}".`;

    const userQuery = `Summarize this text: \n\n${textInput}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            highlights: { type: "ARRAY", items: { type: "STRING" } },
            bulletPoints: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["summary", "highlights", "bulletPoints"]
        }
      }
    };

    // Exponential Backoff Retries Implementation (Strict Guideline)
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
        throw new Error(`API responded with code ${response.status}`);
      }

      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeRequest();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) {
          throw new Error("Invalid response format received from AI.");
        }

        const parsedData = JSON.parse(jsonText);
        setSummaryData(parsedData);
        setIsLoading(false);
        return; // Success, exit
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(`Unable to generate summary after multiple secure connections. Details: ${err.message}. Please try again.`);
          setIsLoading(false);
          return;
        }
        // Wait and double the delay
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  // Helper to copy text to clipboard using fallback document.execCommand
  const handleCopy = () => {
    if (!summaryData) return;
    
    const plainTextSummary = `SUMMARY:
${summaryData.summary}

KEY TAKEAWAYS:
${summaryData.bulletPoints.map(bp => `• ${bp}`).join('\n')}

TAGS/HIGHLIGHTS:
${summaryData.highlights.join(', ')}`;

    const el = document.createElement('textarea');
    el.value = plainTextSummary;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy automatically. Please select text manually.");
    }
    document.body.removeChild(el);
  };

  // Helper to download text summary as a file
  const handleDownload = () => {
    if (!summaryData) return;
    const text = `SUMMARY REPORT\n====================\n\n[Summary]\n${summaryData.summary}\n\n[Key Highlights]\n${summaryData.highlights.join(", ")}\n\n[Key Takeaways]\n${summaryData.bulletPoints.map(bp => `- ${bp}`).join("\n")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AI_Summary_${fileName ? fileName.replace('.pdf', '') : 'Document'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clean application state
  const handleClear = () => {
    setTextInput("");
    setFileName("");
    setSummaryData(null);
    setError("");
    setPdfError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Count metrics helper
  const getWordCount = (str) => {
    if (!str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-800 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-neutral-900 text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-neutral-900 block">SUMM<span className="text-yellow-500 font-bold">.AI</span></span>
              <span className="text-xs text-neutral-400 block -mt-1 font-medium">Next-gen intelligence engine</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadDemoText} 
              className="text-xs font-semibold px-4 py-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Try Demo Text
            </button>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-neutral-400 hover:text-neutral-600 font-medium hidden sm:inline"
            >
              v1.0.2 Stable
            </a>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-6">
        
        {/* Intro/Hero Panel */}
        <div className="bg-white rounded-2xl border border-neutral-150 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Transform messy text into <span className="text-yellow-500 px-1 rounded-sm">golden knowledge</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Upload documents, drag in files, or paste direct contents. Our contextual artificial intelligence model reads dense research files, extracting vital takeaways, summaries, and instant highlights.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-yellow-50 border border-yellow p-3 rounded-xl self-start md:self-center">
            <AlertCircle className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>Files up to 15 pages supported in client-side reader</span>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls & Input Area */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col flex-grow">
              
              {/* Tab Selector Header */}
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex bg-neutral-200/60 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => { setOption("Text"); setPdfError(""); }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      option === "Text" 
                        ? "bg-white text-neutral-900 shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Raw Text Input</span>
                  </button>
                  <button
                    onClick={() => { setOption("Upload_Pdf"); setPdfError(""); }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      option === "Upload_Pdf" 
                        ? "bg-white text-neutral-900 shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload PDF</span>
                  </button>
                </div>

                {textInput.trim().length > 0 && (
                  <button 
                    onClick={handleClear}
                    className="flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium ml-auto"
                    title="Clear content"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Working Panel */}
              <div className="p-6 flex-grow flex flex-col min-h-[380px]">
                {option === "Text" ? (
                  <div className="flex flex-col flex-grow relative">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Paste Content Source</label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste your rich research content, articles, newsletters, book chapters, or transcripts here..."
                      className="w-full flex-grow text-neutral-700 placeholder-neutral-400 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl p-4 text-sm resize-none focus:outline-none transition-all leading-relaxed"
                      style={{ minHeight: '300px' }}
                    />
                    
                    {/* Live Word Counter */}
                    <div className="absolute bottom-3 right-3 bg-neutral-950 text-white text-[10px] tracking-wide font-mono uppercase px-2.5 py-1 rounded-md opacity-75">
                      Words: {getWordCount(textInput)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col justify-center items-center">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 self-start">Document Upload</label>
                    
                    {/* File Dropzone */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex-grow border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200 ${
                        fileName 
                          ? "border-neutral-400 bg-neutral-50" 
                          : "border-neutral-200 hover:border-yellow-400 hover:bg-yellow-50/20"
                      }`}
                      style={{ minHeight: '300px' }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePdfUpload} 
                        accept="application/pdf" 
                        className="hidden" 
                      />
                      
                      <div className="p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm mb-4">
                        {isParsingPdf ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
                        ) : (
                          <Upload className="h-8 w-8 text-neutral-400" />
                        )}
                      </div>

                      {fileName ? (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-neutral-900 truncate max-w-xs sm:max-w-md">{fileName}</p>
                          <p className="text-xs text-neutral-400">PDF Document parsed successfully</p>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClear();
                            }}
                            className="text-xs text-red-500 font-semibold hover:underline"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-w-xs">
                          <p className="text-sm font-bold text-neutral-800">
                            {isParsingPdf ? "Reading Document Content..." : "Drag or select PDF file"}
                          </p>
                          <p className="text-xs text-neutral-400">
                            We will extract readable text dynamically to secure summarize your content.
                          </p>
                        </div>
                      )}

                      {pdfError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center space-x-2 max-w-md">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{pdfError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Fine Tuning Controls */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6 space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Configure Summary Engine</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Length Option */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5">Length target</label>
                    <select
                      value={summaryLength}
                      onChange={(e) => setSummaryLength(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2.5 font-medium text-neutral-700 focus:outline-none focus:border-neutral-900"
                    >
                      <option value="short">Short Bulletins (~100 words)</option>
                      <option value="medium">Medium Synopsis (~250 words)</option>
                      <option value="detailed">In-depth Analysis (~500 words)</option>
                    </select>
                  </div>

                  {/* Format Option */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5">Format Profile</label>
                    <select
                      value={summaryFormat}
                      onChange={(e) => setSummaryFormat(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2.5 font-medium text-neutral-700 focus:outline-none focus:border-neutral-900"
                    >
                      <option value="paragraphs">Fluid Paragraphs</option>
                      <option value="bullets">Clean List Takeaways</option>
                      <option value="structured">Structured Document Abstract</option>
                    </select>
                  </div>

                  {/* Language Option */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5">Target Language</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2.5 font-medium text-neutral-700 focus:outline-none focus:border-neutral-900"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                      <option value="Japanese">Japanese (日本語)</option>
                      <option value="Chinese">Chinese (中文)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                    </select>
                  </div>
                </div>

                {/* Primary CTA Submit */}
                <button
                  onClick={handleSummarize}
                  disabled={isLoading || !textInput.trim() || isParsingPdf}
                  className={`w-full mt-2 font-bold text-sm tracking-wide py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !textInput.trim() || isParsingPdf
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Distilling Source Material...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate AI Summary</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Results Section */}
          <div className="lg:col-span-6 flex flex-col">
            
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[450px]">
              
              {/* Header Info */}
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-wider text-neutral-400 uppercase">AI Summary Synthesis</span>
                
                {summaryData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-150 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                      title="Copy full summary"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownload}
                      className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-150 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                      title="Download Summary Report"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Callout */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-700 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Engine Communication Error</span>
                    <span className="text-xs opacity-90 leading-relaxed block mt-0.5">{error}</span>
                  </div>
                </div>
              )}

              {/* Dynamic View States */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Placeholder Empty State */}
                {!isLoading && !summaryData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-150 rounded-2xl flex items-center justify-center text-neutral-400 shadow-inner">
                      <Languages className="h-8 w-8" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h4 className="text-sm font-bold text-neutral-800">No summary compiled yet</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Input or upload your documents, adjust configurations and fire up the summarizing generator.
                      </p>
                    </div>
                    <button 
                      onClick={loadDemoText}
                      className="text-xs text-yellow-600 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg font-semibold transition-colors border border-yellow-200"
                    >
                      Use Demo Content
                    </button>
                  </div>
                )}

                {/* 2. Loading / Parsing State */}
                {isLoading && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      {/* Linear Loading Animation */}
                      <div className="relative h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      
                      <div className="space-y-2 text-center">
                        <p className="text-sm font-bold text-neutral-800">Reading Context Elements...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Generating highlights, identifying key vocabulary, and drafting structured knowledge nodes in {targetLanguage}.
                        </p>
                      </div>

                      {/* Fake preview skeleton */}
                      <div className="space-y-3 pt-6 opacity-30">
                        <div className="h-4 bg-neutral-200 rounded-md w-3/4" />
                        <div className="h-4 bg-neutral-200 rounded-md w-full" />
                        <div className="h-4 bg-neutral-200 rounded-md w-5/6" />
                        <div className="h-4 bg-neutral-200 rounded-md w-2/3" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output Rendered State */}
                {summaryData && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Highlighted Words list (Yellow themed badges) */}
                    {summaryData.highlights && summaryData.highlights.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Primary Focus Highlights</label>
                        <div className="flex flex-wrap gap-1.5">
                          {summaryData.highlights.map((keyword, index) => (
                            <span 
                              key={index} 
                              className="text-xs bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full border border-yellow-200 hover:scale-105 transition-transform duration-100 cursor-default"
                            >
                              ✨ {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Master Narrative Block */}
                    <div className="space-y-2 border-t border-neutral-100 pt-5">
                      <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Executive Summary</label>
                      <p className="text-neutral-600 text-sm leading-relaxed font-medium">
                        {summaryData.summary}
                      </p>
                    </div>

                    {/* Bullet Points Breakdowns */}
                    {summaryData.bulletPoints && summaryData.bulletPoints.length > 0 && (
                      <div className="space-y-3 border-t border-neutral-100 pt-5 flex-grow">
                        <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">Detailed Key takeaways</label>
                        <ul className="space-y-2.5">
                          {summaryData.bulletPoints.map((item, index) => (
                            <li key={index} className="text-xs text-neutral-600 flex items-start space-x-2.5 leading-relaxed">
                              <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <span className="font-medium">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer attribution */}
                {summaryData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 flex items-center justify-between">
                    <span>Generated using gemini-2.5-flash</span>
                    <span>Target Language: {targetLanguage}</span>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>

      </main>

      {/* CSS Animation Additions for Tailwinds */}
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
          <p className="text-xs text-neutral-400 font-medium">
            © 2026 SUMM.AI Technologies. Built for secure analytical document parsing.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span className="hover:text-neutral-700 cursor-pointer">Security Protocol</span>
            <span>•</span>
            <span className="hover:text-neutral-700 cursor-pointer">Local Storage Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}