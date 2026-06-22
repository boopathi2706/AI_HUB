import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  Trash2, 
  Heart, 
  Image as ImageIcon, 
  Globe, 
  Volume2, 
  Feather, 
  Compass, 
  Smile,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY =import.meta.env.VITE_GEMINI_API_KEY ;
const ACTIVE_TEXT_MODEL = "gemini-2.5-flash";
const ACTIVE_IMAGE_MODEL = "imagen-4.0-generate-001";

export default function AI_Story_Generator() {
  const [titleInput, setTitleInput] = useState("");
  const [genre, setGenre] = useState("Fantasy"); // Fantasy, Sci-Fi, Mystery, Folklore, Adventure
  const [tone, setTone] = useState("Whimsical"); // Whimsical, Dramatic, Suspenseful, Educational, Humorous
  const [language, setLanguage] = useState("English"); // English, Tamil, Hindi, Kannada, Malayalam, Telugu
  const [targetAudience, setTargetAudience] = useState("Kids"); // Kids, Young Adult, Adults
  
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [imageGenerationStates, setImageGenerationStates] = useState({}); // mapping page index to loading state
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  
  const [story, setStory] = useState(null);
  const [currentPage, setCurrentPage] = useState(0); // 0 = Cover, 1 to N = Pages
  const [illustrations, setIllustrations] = useState({}); // mapping page index to base64 image URL
  const [favorites, setFavorites] = useState([]);

  const loadDemoSetup = (demoTitle, demoGenre, demoTone, demoLang, demoAudience) => {
    setTitleInput(demoTitle);
    setGenre(demoGenre);
    setTone(demoTone);
    setLanguage(demoLang);
    setTargetAudience(demoAudience);
    setStory(null);
    setIllustrations({});
    setCurrentPage(0);
    setError("");
    setErrorCode(null);
  };

  const generatePageIllustration = async (pageIndex, promptText) => {
    if (!promptText) return;
    
    setImageGenerationStates(prev => ({ ...prev, [pageIndex]: true }));
    setError("");

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("API Key is missing. Please edit the code to add your Gemini API Key.");
      setImageGenerationStates(prev => ({ ...prev, [pageIndex]: false }));
      return;
    }

    // CORRECTED: Ensure the endpoint uses the specific Imagen model URL format
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_IMAGE_MODEL}:predict?key=${GEMINI_API_KEY}`;
    
    const enhancedPrompt = `${promptText}, beautiful modern digital storybook illustration style, highly artistic, clean lines, white background focus, soft elegant lighting, minimalist, high contrast, masterpiece`;

    const payload = {
      instances: [{ prompt: enhancedPrompt }],
      parameters: { sampleCount: 1 }
    };

    let attempt = 0;
    const maxAttempts = 3;
    let delay = 1500;

    const executeImageFetch = async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Imagen Server Error Status: ${response.status} - ${errorData?.error?.message || ''}`);
      }
      return await response.json();
    };

    while (attempt < maxAttempts) {
      try {
        const result = await executeImageFetch();
        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
          const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
          setIllustrations(prev => ({ ...prev, [pageIndex]: imageUrl }));
        } else {
          throw new Error("Invalid payload mapping from image prediction endpoint.");
        }
        setImageGenerationStates(prev => ({ ...prev, [pageIndex]: false }));
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          console.error("Image generation failed after maximum retries:", err);
          setError(`Image Generation Failed: ${err.message}`);
          setImageGenerationStates(prev => ({ ...prev, [pageIndex]: false }));
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  useEffect(() => {
    if (!story) return;
    
    if (currentPage === 0 && !illustrations[0] && !imageGenerationStates[0]) {
      generatePageIllustration(0, `A beautiful artistic cover illustration showing ${story.title}, minimalist concept art, white background`);
    }
    
    if (currentPage > 0) {
      const pageIndex = currentPage - 1;
      const activePageData = story.pages?.[pageIndex];
      if (activePageData && !illustrations[currentPage] && !imageGenerationStates[currentPage]) {
        generatePageIllustration(currentPage, activePageData.imagePrompt);
      }
    }
  }, [currentPage, story]);

  const handleGenerateStory = async () => {
    const finalTitle = titleInput.trim() || "The Great Secret Journey";
    
    setIsLoadingStory(true);
    setError("");
    setErrorCode(null);
    setStory(null);
    setIllustrations({});
    setCurrentPage(0);

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your workspace editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoadingStory(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite fantasy author, creative screenwriter, and child educator.
Generate an immersive multi-chapter/multi-page illustrated story titled "${finalTitle}".
Genre: ${genre}
Tone: ${tone}
Target Demographic: ${targetAudience}
Language Output: "${language}"

CRITICAL INSTRUCTIONS:
1. Write exactly 4 sequential scenes/pages representing the story arc (Introduction, Rising Action, Climax, Resolution).
2. The entire story text, title, and summaries MUST be translated into the requested language: "${language}".
3. For each of the 4 pages, define an exquisite, highly descriptive English "imagePrompt" that will be used by our text-to-image generator (Imagen) to create a visual illustration. Make it descriptive and fit a cohesive fairytale book look.
4. For each page, identify 1 to 4 key words or dramatic phrases inside the translated text block to highlight in yellow. Note: The highlighted phrases must match EXACTLY (character-by-character) with the translated words/phrases inside your page text.

Return a strictly formatted JSON object matching this exact schema:
{
  "title": "Story Title translated in ${language}",
  "genre": "${genre}",
  "moral": "A beautiful 1-sentence moral lesson of the story in ${language}",
  "pages": [
    {
      "pageNumber": 1,
      "text": "A beautiful story page content containing 3 to 5 sentences translated in ${language}.",
      "imagePrompt": "A highly descriptive illustration prompt in English, specifying characters, fantasy scene details, fairy tale style, and plain white background.",
      "highlights": ["exact word or phrase to highlight from text"]
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate a 4-page illustrated story in ${language} language.` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            genre: { type: "STRING" },
            moral: { type: "STRING" },
            pages: {
              type: "ARRAY",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "OBJECT",
                properties: {
                  pageNumber: { type: "INTEGER" },
                  text: { type: "STRING" },
                  imagePrompt: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["pageNumber", "text", "imagePrompt", "highlights"]
              }
            }
          },
          required: ["title", "genre", "moral", "pages"]
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
        if (parsed && Array.isArray(parsed.pages)) {
          setStory(parsed);
          setCurrentPage(0);
        } else {
          throw new Error("Returned structure does not match required JSON storybook format.");
        }
        setIsLoadingStory(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to establish connection with the Gemini server.");
          setIsLoadingStory(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const renderHighlightedStoryText = (text, highlights) => {
    if (!text) return null;
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600 font-serif leading-relaxed text-lg">{text}</span>;
    }

    const validHighlights = highlights
      .filter(h => h && typeof h === 'string' && h.trim() !== '')
      .sort((a, b) => b.length - a.length);

    if (validHighlights.length === 0) {
      return <span className="text-neutral-600 font-serif leading-relaxed text-lg">{text}</span>;
    }

    const escaped = validHighlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regexPattern);

    return parts.map((part, idx) => {
      const isMatch = validHighlights.some(
        h => h.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <span 
            key={idx}
            className="bg-yellow-200 text-black px-1.5 py-0.5 rounded font-bold inline-block mx-0.5"
          >
            {part}
          </span>
        );
      }
      return <span key={idx} className="text-neutral-600 font-serif leading-relaxed text-lg">{part}</span>;
    });
  };

  const handleDownloadStory = () => {
    if (!story) return;
    const plainPages = story.pages.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n");
    const formatted = `LUCID.STORIES ILLUSTRATED STORYBOOK\n===================================\nTitle: ${story.title}\nGenre: ${story.genre}\nLanguage: ${language}\nTarget Group: ${targetAudience}\n\n[Narrative Moral]\n${story.moral}\n\n${plainPages}\n\nGenerated via LUCID.STORIES Smart Sandbox`;
    
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LucidStory_${story.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleFavoriteStory = () => {
    if (!story) return;
    if (favorites.some(f => f.title === story.title)) {
      setFavorites(favorites.filter(f => f.title !== story.title));
    } else {
      setFavorites([...favorites, { ...story, language, genre }]);
    }
  };

  const handleReadAloud = () => {
    if (!story) return;
    const utteranceText = currentPage === 0 ? story.title : story.pages[currentPage - 1]?.text;
    if (!utteranceText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    
    if (language === "Tamil") utterance.lang = "ta-IN";
    else if (language === "Hindi") utterance.lang = "hi-IN";
    else if (language === "Malayalam") utterance.lang = "ml-IN";
    else if (language === "Kannada") utterance.lang = "kn-IN";
    else if (language === "Telugu") utterance.lang = "te-IN";
    else utterance.lang = "en-US";

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.STORIES</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Illustrated Storybook Engine</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup("The Golden Feather of Hampi", "Folklore", "Whimsical", "Tamil", "Kids")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Hampi (Tamil)
            </button>
            <button
              onClick={() => loadDemoSetup("The Lonely Robot of Titan", "Sci-Fi", "Dramatic", "Hindi", "Young Adult")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: Titan (Hindi)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              AI Storybook & <span className="bg-yellow-200 px-1.5 rounded-sm">Illustrator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Synthesize marvelous narrative adventures in classic regional languages. Choose your style configurations, and witness high-fidelity Google Imagen illustrations paint page-by-page as you flip!
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup("A Magical Tea Cup in Kochi", "Fantasy", "Humorous", "Malayalam", "Kids")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md flex items-center space-x-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>Autofill Kochi Fantasy (ML)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Feather className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Story Blueprint</span>
                </div>
                {(titleInput || genre !== "Fantasy" || tone !== "Whimsical" || language !== "English") && (
                  <button 
                    onClick={() => { setTitleInput(""); setGenre("Fantasy"); setTone("Whimsical"); setLanguage("English"); setTargetAudience("Kids"); setStory(null); setIllustrations({}); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Canvas</span>
                  </button>
                )}
              </div>

              <div className="p-6 space-y-5 flex-grow flex flex-col">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Story Idea or Title Prompt</label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. A young girl discovers a doorway inside a Peepal Tree..."
                    className="w-full text-xs text-neutral-800 placeholder-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Language (மொழி / भाषा)</label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 pl-10 font-semibold text-neutral-700 focus:outline-none focus:border-black appearance-none cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Malayalam">Malayalam (മലയാളം)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                    </select>
                    <div className="absolute left-3 top-3.5 text-neutral-400 pointer-events-none">
                      <Globe className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Genre Arc</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Fantasy", "Sci-Fi", "Folklore", "Adventure"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenre(g)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                          genre === g
                            ? "bg-black text-white border-black"
                            : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Narrative Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black cursor-pointer"
                  >
                    <option value="Whimsical">Whimsical & Magical</option>
                    <option value="Dramatic">Dramatic & Heroic</option>
                    <option value="Suspenseful">Suspenseful & Mystical</option>
                    <option value="Educational">Educational & Thoughtful</option>
                    <option value="Humorous">Humorous & Lighthearted</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Demographic</label>
                  <div className="flex gap-2">
                    {["Kids", "Young Adult", "Adults"].map((aud) => (
                      <button
                        key={aud}
                        type="button"
                        onClick={() => setTargetAudience(aud)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          targetAudience === aud
                            ? "bg-black text-white border-black"
                            : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        {aud}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateStory}
                  disabled={isLoadingStory}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoadingStory
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoadingStory ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Writing & Scaffolding Book...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate Illustrated Story</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[550px] justify-between">
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Storybook Theater</span>
                {story && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleReadAloud}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                      title="Speak Page Aloud"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Read Aloud</span>
                    </button>
                    <button
                      onClick={toggleFavoriteStory}
                      className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Heart className={`h-3.5 w-3.5 ${favorites.some(f => f.title === story.title) ? 'fill-current text-red-500' : ''}`} />
                      <span className="hidden sm:inline">Favorite</span>
                    </button>
                    <button
                      onClick={handleDownloadStory}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export Text</span>
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <span className="font-extrabold text-sm text-black block">Authentication Alert</span>
                      <span className="opacity-90 leading-relaxed block mt-1 font-mono text-[10px] bg-red-100/50 p-2 rounded">{error}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-red-100 text-neutral-600 text-[11px] leading-relaxed">
                    <strong>Action Required:</strong> Open the workspace file editor on the right and update the <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-red-600">const GEMINI_API_KEY = "YOUR_API_KEY_HERE"</code> variable at the top of `App.jsx` with your verified Google AI Studio API key.
                  </div>
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col justify-center">
                {!isLoadingStory && !story && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <BookOpen className="h-7 w-7 text-neutral-400 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider font-sans">Story Bookstand Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Input your story plot prompt on the left configurator dashboard. Select a native dialect like Tamil or Kannada, and the system will draft chapters, highlighting key semantic words, while automatically illustrating custom canvases!
                      </p>
                    </div>
                  </div>
                )}

                {isLoadingStory && (
                  <div className="flex-grow flex flex-col justify-center space-y-6 py-12 my-auto">
                    <div className="space-y-4 max-w-md mx-auto w-full">
                      <div className="relative h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute h-full w-1/3 bg-yellow-400 rounded-full animate-infinite-loading" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Dreaming Up Your Story Universe...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Drafting 4 unique sequential storyboards, localizing scripts to {language}, plotting visual painter prompts, and preparing semantic highlight structures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {story && !isLoadingStory && (
                  <div className="flex-grow flex flex-col justify-between space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="relative aspect-square w-full bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
                        {imageGenerationStates[currentPage] ? (
                          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center space-y-2.5 p-4 text-center">
                            <RefreshCw className="h-7 w-7 text-yellow-500 animate-spin" />
                            <span className="text-[10px] font-bold text-black uppercase tracking-wider">Painting Illustration...</span>
                            <span className="text-[9px] text-neutral-400 max-w-xs leading-relaxed italic">Generating canvas custom scene representation using Google Imagen-4</span>
                          </div>
                        ) : null}

                        {illustrations[currentPage] ? (
                          <img 
                            src={illustrations[currentPage]} 
                            alt={`Illustration page ${currentPage}`} 
                            className="w-full h-full object-cover animate-fadeIn"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-300">
                            <ImageIcon className="h-10 w-10 text-neutral-400 animate-bounce" />
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Illustration Canvas</span>
                            <button
                              onClick={() => {
                                if (currentPage === 0) {
                                  generatePageIllustration(0, `A beautiful artistic cover illustration showing ${story.title}, minimalist concept art, white background`);
                                } else {
                                  generatePageIllustration(currentPage, story.pages[currentPage - 1]?.imagePrompt);
                                }
                              }}
                              className="text-[9px] bg-neutral-100 hover:bg-neutral-200 text-black px-2.5 py-1 rounded-md font-semibold transition-all mt-2"
                            >
                              Repaint Scene
                            </button>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-neutral-200 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold text-black uppercase tracking-wider z-20">
                          {currentPage === 0 ? "Book Cover" : `Page ${currentPage} / 4`}
                        </div>
                      </div>

                      <div className="space-y-4 py-2">
                        {currentPage === 0 ? (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1.5">
                              <span className="text-[9px] bg-yellow-100 text-yellow-800 border border-yellow-200 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                                {story.genre} • {tone} Tone
                              </span>
                              <h2 className="text-2xl font-extrabold text-black tracking-tight leading-tight">{story.title}</h2>
                            </div>
                            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">Theme & Target</span>
                              <p className="text-xs text-neutral-500 leading-relaxed">
                                This magical illustrated storybook is optimized for <strong className="text-black">{targetAudience}</strong> using fluent <strong className="text-black">{language}</strong> parameters. Click 'Next Page' to start your adventure.
                              </p>
                            </div>
                            <div className="space-y-1 bg-yellow-50/50 p-3.5 rounded-xl border border-yellow-100">
                              <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider block">Life Moral / Learning</span>
                              <p className="text-xs text-neutral-600 font-medium leading-relaxed italic">"{story.moral}"</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-1 border-b border-neutral-100 pb-2">
                              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest font-mono">Chapter Progress</span>
                              <h3 className="text-lg font-bold text-black">
                                {currentPage === 1 ? "I. The Discovery" : currentPage === 2 ? "II. The Challenge" : currentPage === 3 ? "III. The Climax" : "IV. The Conclusion"}
                              </h3>
                            </div>
                            <div className="min-h-[140px]">
                              {story.pages[currentPage - 1] && (
                                <p className="text-sm leading-relaxed">
                                  {renderHighlightedStoryText(story.pages[currentPage - 1].text, story.pages[currentPage - 1].highlights)}
                                </p>
                              )}
                            </div>
                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                              <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">Illustration prompt</span>
                              <p className="text-[10px] text-neutral-500 leading-relaxed font-mono truncate" title={story.pages[currentPage - 1]?.imagePrompt}>
                                {story.pages[currentPage - 1]?.imagePrompt}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all border ${
                          currentPage === 0 
                            ? "bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed" 
                            : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200 shadow-sm"
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>

                      <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                        {currentPage === 0 ? "Cover Page" : `Page ${currentPage} of 4`}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(4, prev + 1))}
                        disabled={currentPage === 4}
                        className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all border ${
                          currentPage === 4 
                            ? "bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed" 
                            : "bg-black text-white hover:bg-neutral-800 border-black shadow-sm"
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {favorites.length > 0 && (
                <div className="bg-neutral-50 border-t border-neutral-200 p-4 space-y-3">
                  <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Saved Shortlist Library</span>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map((fav, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setStory(fav);
                          setIllustrations({});
                          setCurrentPage(0);
                        }}
                        className="text-xs bg-white hover:bg-neutral-100 border border-neutral-200 text-black font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-2 shadow-sm transition-all text-left"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>{fav.title} ({fav.language})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes infiniteLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-infinite-loading {
          animation: infiniteLoading 1.6s infinite linear;
        }
      `}</style>

      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 font-semibold font-mono">
            © 2026 LUCID.STORIES. Intelligent Illustrated Naming & Storybook Sandbox.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400 font-sans">
            <span>Google Imagen integration</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}