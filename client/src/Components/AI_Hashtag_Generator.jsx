import React, { useState } from 'react';
import { 
  Hash, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  Sliders,
  Download,
  Share2
} from 'lucide-react';

// Secure inline SVGs for social media brand logos to bypass any lucide-react version export errors
const InstagramIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TwitterIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const LinkedinIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const TikTokIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
  </svg>
);

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Hashtag_Generator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram"); // Instagram, TikTok, Twitter/X, LinkedIn
  const [tone, setTone] = useState("Viral & Engaging"); // Viral, Aesthetic, Professional, Educational
  const [tagCount, setTagCount] = useState(10); // Minimum 5 based on request

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  
  // Results object matching strict schema
  const [generationData, setGenerationData] = useState(null);

  const loadDemoTopic = (sampleTopic, samplePlatform, sampleTone) => {
    setTopic(sampleTopic);
    setPlatform(samplePlatform);
    setTone(sampleTone);
    setGenerationData(null);
    setError("");
    setErrorCode(null);
  };

  const handleClear = () => {
    setTopic("");
    setGenerationData(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateHashtags = async () => {
    if (!topic.trim()) {
      setError("Please describe the topic, product, or caption for your social post.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setGenerationData(null);

    // Prompt user to customize the code if the key is still the default placeholder
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("API Key is missing. Please open the code editor on the right and edit the code to replace 'YOUR_API_KEY_HERE' with your real Gemini API key.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are a social media growth and search engine optimization (SEO) strategist.
Based on the topic: "${topic}", the targeted social platform: "${platform}", and the desired brand tone: "${tone}", generate a list of exactly ${tagCount} optimized, active, and relevant hashtags. Ensure the list has a minimum of 5 tags.

Categorize the hashtags into three structural buckets:
1. "Broad & Trending" - high-volume tags
2. "Niche Specific" - target-focused tags for high engagement
3. "Community & Lifestyle" - connection-oriented tags

Also, formulate a short, catchy post caption (1 or 2 lines) implementing some of these tags natively.

Return a strictly formatted JSON object matching this schema:
{
  "hashtags": [
    {
      "tag": "#HashtagTextWithNoSpaces",
      "category": "Broad & Trending" or "Niche Specific" or "Community & Lifestyle",
      "metric": "e.g., 2.5M posts or High Relevance"
    }
  ],
  "suggestedCaption": "A ready-to-publish post caption incorporating the theme."
}
Return ONLY raw, un-wrapped JSON. Do not wrap inside code block tags.`;

    const payload = {
      contents: [{ parts: [{ text: `Topic: ${topic}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hashtags: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  tag: { type: "STRING" },
                  category: { type: "STRING" },
                  metric: { type: "STRING" }
                },
                required: ["tag", "category", "metric"]
              }
            },
            suggestedCaption: { type: "STRING" }
          },
          required: ["hashtags", "suggestedCaption"]
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
        const msg = errorData.error?.message || `HTTP Error Status: ${response.status}`;
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
        if (parsed && Array.isArray(parsed.hashtags)) {
          setGenerationData(parsed);
        } else {
          throw new Error("Returned structure does not match required JSON arrays.");
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

  const handleCopyAll = () => {
    if (!generationData || generationData.hashtags.length === 0) return;
    const allTags = generationData.hashtags.map(item => item.tag).join(" ");
    
    const tempElement = document.createElement('textarea');
    tempElement.value = allTags;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      setError("Unable to copy all tags automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleCopyCaption = () => {
    if (!generationData || !generationData.suggestedCaption) return;
    
    const tempElement = document.createElement('textarea');
    tempElement.value = generationData.suggestedCaption;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (err) {
      setError("Unable to copy caption automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadReport = () => {
    if (!generationData) return;
    const allTagsLine = generationData.hashtags.map(item => item.tag).join(" ");
    const plainText = `SUMM.HASHTAGS REPORT\n====================\nOrigin Topic: "${topic}"\nPlatform: ${platform}\nStyle/Tone: ${tone}\n\n[ALL HASHTAGS]\n${allTagsLine}\n\n[DETAILED BUCKETS]\n${generationData.hashtags.map((h, i) => `${i + 1}. ${h.tag} (${h.category}) - ${h.metric}`).join('\n')}\n\n[SUGGESTED CAPTION]\n${generationData.suggestedCaption}\n\nGenerated secure and offline via SUMM.HASHTAGS`;
    
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AI_Hashtags_${platform}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#7209b7] text-white p-2 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">MagicPrompt<span className="text-[#7209b7] font-bold">.HASHTAGS</span></span>
              {/* <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider">Linguistic Tag Architecture</span> */}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadDemoTopic("Organic home roasted dark coffee business launching locally", "Instagram", "Aesthetic & Organic")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-[#7209b7] hover:text-white cursor-pointer text-black rounded-lg transition-colors"
            >
              Autofill Coffee Demo
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
              Generate Optimized <span className="text-[#7209b7] px-1 rounded-sm">AI Hashtags</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Design viral, categorized, and platform-specific metadata tags instantly. Our customized copywriting model crafts high-relevance hashtags with customized yellow highlighting to elevate your visibility.
            </p>
          </div>
          <button
            onClick={() => loadDemoTopic("Next-gen AI code completion and developer workspace app", "LinkedIn", "Professional & Informative")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-[#7209b7] hover:bg-purple-500 cursor-pointer text-white rounded-xl transition-colors shadow"
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
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Generation Settings</span>
                </div>
                {topic.trim().length > 0 && (
                  <button 
                    onClick={handleClear}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Form Areas */}
              <div className="p-6 space-y-5 flex-grow">
                
                {/* Topic Specification */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Post Context or Core Topic</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. 'A recipe showing how to bake gluten-free organic sourdough bread at home...'"
                    className="w-full text-sm text-black placeholder-neutral-400 bg-neutral-50/50 focus:bg-white border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl p-4 min-h-[120px] resize-none focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Target Platform Select */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Social Network</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Instagram', icon: InstagramIcon },
                      { name: 'TikTok', icon: TikTokIcon },
                      { name: 'Twitter/X', icon: TwitterIcon },
                      { name: 'LinkedIn', icon: LinkedinIcon }
                    ].map((p) => {
                      const Icon = p.icon;
                      const isSelected = platform === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setPlatform(p.name)}
                          className={`flex items-center space-x-2 p-3 text-xs font-semibold rounded-xl border cursor-pointer transition-all ${
                            isSelected 
                              ? "bg-[#7209b7] text-white border-purple" 
                              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand Style Variations */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Editorial Vibe / Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="Viral & Engaging">🔥 Viral, Trendy & High Reach</option>
                    <option value="Aesthetic & Organic">🌿 Aesthetic, Calm & Minimal</option>
                    <option value="Professional & Informative">💼 Professional & Corporate Authority</option>
                    <option value="Playful & Bold">⚡ Punchy, Humorous & Vibrant</option>
                    <option value="Community Focused">👥 Niche-specific & Community-centric</option>
                  </select>
                </div>

                {/* Hashtags Count (Min 5 Requirement) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <span>Target Tag Count</span>
                    <span className="text-white bg-[#7209b7] px-1.5 py-0.5 rounded font-mono font-extrabold">{tagCount} tags</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={tagCount}
                    onChange={(e) => setTagCount(parseInt(e.target.value))}
                    className="w-full accent-[#7209b7] h-1 bg-neutral-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
                    <span>MIN: 5</span>
                    <span>MAX: 25</span>
                  </div>
                </div>

              </div>

              {/* Submit Control Card */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateHashtags}
                  disabled={isLoading || !topic.trim()}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || !topic.trim()
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-[#7209b7] hover:bg-purple-500 text-white cursor-pointer hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Distilling Metadata...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Synthesize Hashtags</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Display Results */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[480px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Target Analytics Output</span>
                {generationData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyAll}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copiedAll ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>Copy All Tags</span>
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Callouts */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">Authentication Alert (HTTP {errorCode || 'Error'})</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-neutral-600 text-[11px]">
                    <strong>Action Required:</strong> Open the code file `App.jsx` in the code editor, and change <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">const GEMINI_API_KEY = "YOUR_API_KEY_HERE"</code> near the top of the file to your verified Google AI Studio API Key.
                  </div>
                </div>
              )}

              {/* Content viewport */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                
                {/* 1. Empty State */}
                {!isLoading && !generationData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300">
                      <Hash className="h-7 w-7" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Hashtag Workspace Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Formulate your content properties in the controller card, hit generate, and our linguistic engine will assemble structured hashtags grouped by priority metrics.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Extracting Niche Core Metadata...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Refining post parameters, sorting tag reach metrics, and generating organic hashtags.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {generationData && !isLoading && (
                  <div className="space-y-6 flex-grow">

                    {/* Quick copy cloud */}
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Metadata Batch</span>
                        <span className="text-[10px] text-neutral-400 font-mono font-bold">Total: {generationData.hashtags.length} items</span>
                      </div>
                      <div className="text-xs font-mono select-all bg-white p-3 rounded-xl border border-neutral-150 leading-relaxed text-neutral-700 break-all">
                        {generationData.hashtags.map(item => item.tag).join(" ")}
                      </div>
                    </div>

                    {/* Detailed Tag Buckets */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block">Structural Categorization</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                        {generationData.hashtags.map((item, index) => (
                          <div 
                            key={index}
                            className="p-3 bg-white hover:bg-neutral-50 rounded-xl border border-neutral-150 flex items-center justify-between gap-3 transition-all hover:shadow-sm"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="text-xs font-bold text-black bg-yellow-200 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                                {item.tag}
                              </span>
                              <div className="flex items-center space-x-1.5 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                                <span>{item.category}</span>
                                <span>•</span>
                                <span className="text-neutral-500">{item.metric}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCopySingle(item.tag, index)}
                              className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors shrink-0 flex items-center justify-center"
                              title="Copy Hashtag"
                            >
                              {copiedIndex === index ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulated Post Card Previews */}
                    <div className="space-y-2.5 border-t border-neutral-100 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Mock Social Post Draft</span>
                        <button
                          onClick={handleCopyCaption}
                          className="text-[10px] text-black hover:underline flex items-center space-x-1 font-semibold"
                        >
                          {copiedCaption ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>Copy Caption</span>
                        </button>
                      </div>

                      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-150 relative">
                        <div className="flex items-center space-x-2.5 mb-2.5">
                          <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-extrabold">
                            S
                          </div>
                          <div className="text-[10px] text-neutral-800 font-bold">
                            @yourhandle <span className="text-neutral-400 font-normal">• Draft Preview</span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                          {generationData.suggestedCaption}
                        </p>
                      </div>
                    </div>

                  </div>
                )}

                {/* Contextual statistics */}
                {generationData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Platform Core: {platform}</span>
                    <span>Style Preset: {tone}</span>
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
            © 2026 SUMM.HASHTAGS. Premium Metadata Solutions.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Secure Sandbox</span>
            <span>•</span>
            <span>Local Copy Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}