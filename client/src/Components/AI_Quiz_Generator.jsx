import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Trash2,
  RefreshCw,
  Award,
  HelpCircle,
  BookOpen,
  Film,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

// Cascading Subcategory map for dynamic dropdowns
const SUBCATEGORY_MAP = {
  study: [
    "Data Science & AI",
    "Full Stack Web Development",
    "Cybersecurity & Networks",
    "Cloud Computing & DevOps",
    "Machine Learning & Deep Learning"
  ],
  movies: [
    "Bollywood / Indian Cinema",
    "Hollywood / Global Cinema",
    "Tollywood & South Indian Cinema",
    "Tamil Cinema",
    "Sci-Fi & Fantasy Movies",
    "Classic & Retro Cinema"
  ],
  general: [
    "World History & Civilizations",
    "Geography & Earth Science",
    "Pop Culture & Music Trivia",
    "Space & Astronomy",
    "General Science & Nature"
  ]
};

export default function AI_Quiz_Generator() {
  const [category, setCategory] = useState("study"); // study, movies, general
  const [subCategory, setSubCategory] = useState("Data Science & AI");
  const [customSubCategory, setCustomSubCategory] = useState("");
  const [questionCount, setQuestionCount] = useState(10); // Default 10, range 10-30

  // Quiz Play State Management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState(null);
  
  // Gameplay Engine States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionIdx: selectedOption }
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Auto-sync subcategory list when primary category changes
  useEffect(() => {
    if (SUBCATEGORY_MAP[category]) {
      setSubCategory(SUBCATEGORY_MAP[category][0]);
    } else {
      setSubCategory("Custom Topic");
    }
    setCustomSubCategory("");
  }, [category]);

  const loadDemoSetup = (demoCat, demoSub, count) => {
    setCategory(demoCat);
    setSubCategory(demoSub);
    setQuestionCount(count);
    setQuizQuestions(null);
    setQuizCompleted(false);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setError("");
    setErrorCode(null);
  };

  const handleGenerateQuiz = async () => {
    const finalSubCategory = subCategory === "Custom" ? customSubCategory : subCategory;
    
    if (!finalSubCategory.trim()) {
      setError("Please specify a sub-category or custom topic.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setQuizQuestions(null);
    setQuizCompleted(false);
    setCurrentQuestionIdx(0);
    setUserAnswers({});

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are a world-class professional educator, quizmaster, and psychometrician.
Generate exactly ${questionCount} multiple-choice quiz questions based on:
Category: ${category.toUpperCase()}
Sub-Topic: ${finalSubCategory}

Each question must be challenging, highly accurate, and engaging.
For each question, provide exactly 4 distinct options, designate the single correct answer option, and write a beautiful 2-sentence explanation of why it is correct.
Identify 1 to 3 core terms, keywords, formulas, or historical names in each explanation that should be highlighted in yellow in the user interface.

Return a strictly formatted JSON object matching this exact schema:
{
  "questions": [
    {
      "id": 1,
      "question": "The clear question text goes here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "A complete, beautifully detailed 2-sentence explanation of the answer.",
      "highlights": ["word1", "word2"]
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate ${questionCount} questions for ${finalSubCategory}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "INTEGER" },
                  question: { type: "STRING" },
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  correctAnswer: { type: "STRING" },
                  explanation: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation", "highlights"]
              }
            }
          },
          required: ["questions"]
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
        if (parsed && Array.isArray(parsed.questions)) {
          setQuizQuestions(parsed.questions);
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

  const handleSelectOption = (option) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIdx]: option
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setQuizCompleted(true);
  };

  const calculateScore = () => {
    if (!quizQuestions) return 0;
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });
    return correctCount;
  };

  // REDESIGNED: Employs a flat regex tokenizer to avoid nesting and ensure valid React rendering.
  const renderHighlightedExplanation = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600 font-sans">{text}</span>;
    }

    // Escape regex characters and create a clean search pattern
    const validHighlights = highlights
      .filter(h => h && h.trim().length > 0)
      .map(h => h.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    if (validHighlights.length === 0) {
      return <span className="text-neutral-600 font-sans">{text}</span>;
    }

    const regexPattern = new RegExp(`(${validHighlights.join('|')})`, 'gi');
    const parts = text.split(regexPattern);

    return parts.map((part, idx) => {
      const isMatch = validHighlights.some(h => new RegExp(`^${h}$`, 'i').test(part));
      if (isMatch) {
        return (
          <span 
            key={idx}
            className="bg-yellow-200 text-black px-1 py-0.5 rounded font-bold mx-0.5 inline-block"
          >
            {part}
          </span>
        );
      }
      return <span key={idx} className="text-neutral-600 font-sans">{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-500 flex flex-col font-sans antialiased selection:bg-yellow-200">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.QUIZ</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Cognitive Learning Simulator</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup("study", "Data Science & AI", 10)}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Data Science (10Q)
            </button>
            <button
              onClick={() => loadDemoSetup("movies", "Bollywood / Indian Cinema", 15)}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: Bollywood Film (15Q)
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
              AI Quiz <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed font-sans">
              Generate fully customized academic, cinema, or pop culture trivia games instantly. Specify the targeted core subject, define range margins from 10 to 30, and enjoy interactive playmodes with highlight guides.
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup("general", "Space & Astronomy", 12)}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Space Trivia Preset
          </button>
        </div>

        {/* Dual split workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Parameter Selectors */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Quiz Parameters</span>
                </div>
                {/* FIX: Removed undefined "startingLetter" reference from this conditional reset statement */}
                {(category !== "study" || subCategory !== SUBCATEGORY_MAP["study"][0] || questionCount !== 10) && (
                  <button 
                    onClick={() => { setCategory("study"); setSubCategory(SUBCATEGORY_MAP["study"][0]); setQuestionCount(10); setQuizQuestions(null); setQuizCompleted(false); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Settings</span>
                  </button>
                )}
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* 1. First Option: Primary Category */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Primary Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "study", label: "Study & Tech", icon: BookOpen },
                      { id: "movies", label: "Movies & Film", icon: Film },
                      { id: "general", label: "General Knowledge", icon: Globe }
                    ].map((catObj) => {
                      const Icon = catObj.icon;
                      return (
                        <button
                          key={catObj.id}
                          type="button"
                          onClick={() => setCategory(catObj.id)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center space-y-1 ${
                            category === catObj.id 
                              ? "bg-black text-white border-black shadow-sm" 
                              : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate w-full text-center">{catObj.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Second Option: Sub-Category Dropdown (Cascaded Options) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sub-Category Selection</label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    {SUBCATEGORY_MAP[category]?.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="Custom">Custom Dialect / Topic...</option>
                  </select>
                </div>

                {/* Custom Subcategory input fallback (Conditional) */}
                {subCategory === "Custom" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Specify Custom Topic</label>
                    <input
                      type="text"
                      value={customSubCategory}
                      onChange={(e) => setCustomSubCategory(e.target.value)}
                      placeholder="e.g. Ancient Greek Mythology, Marvel MCU Phase 4, Cyber Security Standards"
                      className="w-full text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                )}

                {/* 3. Range of Questions (10 to 30) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Range of Questions</label>
                    <span className="text-xs font-bold text-black">{questionCount} Questions</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 font-mono font-bold uppercase">
                    <span>Min: 10 Qs</span>
                    <span>Max: 30 Qs</span>
                  </div>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateQuiz}
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
                      <span>Distilling Quiz Matrix...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Compile Quiz Engine</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Interactive Game Console & Final Audit Report */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Play Console</span>
                {quizQuestions && (
                  <div className="text-xs font-bold text-black font-mono">
                    {quizCompleted ? "Quiz Final Report" : `Question ${currentQuestionIdx + 1} of ${quizQuestions.length}`}
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
                {!isLoading && !quizQuestions && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <Sparkles className="h-7 w-7 text-neutral-400 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider font-sans">Playground Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Configure your categories and range limits on the left workspace. The cognitive engine will compile an entire playable test complete with live scoring and golden explanation highlights.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Synthesizing Cognitive Question Matrix...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Constructing alternative option hooks, mapping academic rationale parameters, and indexing yellow highlights.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Interactive Gameplay View */}
                {quizQuestions && !quizCompleted && !isLoading && (
                  <div className="flex-grow flex flex-col justify-between space-y-6">
                    
                    {/* Question Card Title */}
                    <div className="space-y-3">
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-black h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                        />
                      </div>
                      <h3 className="text-base font-extrabold text-black font-sans tracking-tight leading-relaxed">
                        {quizQuestions[currentQuestionIdx].question}
                      </h3>
                    </div>

                    {/* Multiple Choice Options Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      {quizQuestions[currentQuestionIdx].options.map((option, idx) => {
                        const isSelected = userAnswers[currentQuestionIdx] === option;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(option)}
                            className={`w-full text-left p-4 rounded-xl text-xs transition-all border flex items-center justify-between ${
                              isSelected 
                                ? "bg-black text-white border-black shadow-md font-bold" 
                                : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                            }`}
                          >
                            <span className="flex items-center space-x-3">
                              <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center border transition-all ${
                                isSelected 
                                  ? "bg-yellow-400 border-yellow-400 text-black" 
                                  : "bg-neutral-50 border-neutral-200 text-neutral-400"
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span>{option}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Progress Control Navigation */}
                    <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
                      <button
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIdx === 0}
                        className={`text-xs font-bold py-2 px-4 rounded-lg border transition-all flex items-center space-x-1 ${
                          currentQuestionIdx === 0 
                            ? "border-neutral-100 text-neutral-300 cursor-not-allowed" 
                            : "border-neutral-200 hover:bg-neutral-50 text-black"
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>

                      {currentQuestionIdx < quizQuestions.length - 1 ? (
                        <button
                          onClick={handleNextQuestion}
                          disabled={!userAnswers[currentQuestionIdx]}
                          className={`text-xs font-bold py-2 px-4 rounded-lg transition-all flex items-center space-x-1 ${
                            !userAnswers[currentQuestionIdx]
                              ? "bg-neutral-50 text-neutral-300 border border-neutral-200 cursor-not-allowed"
                              : "bg-black text-white hover:bg-neutral-800"
                          }`}
                        >
                          <span>Next Question</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(userAnswers).length < quizQuestions.length}
                          className={`text-xs font-bold py-2 px-5 rounded-lg transition-all flex items-center space-x-1 ${
                            Object.keys(userAnswers).length < quizQuestions.length
                              ? "bg-neutral-50 text-neutral-300 border border-neutral-200 cursor-not-allowed"
                              : "bg-yellow-400 text-black hover:bg-yellow-500 font-extrabold shadow"
                          }`}
                        >
                          <span>Finish & Submit</span>
                          <Award className="h-4 w-4 ml-1" />
                        </button>
                      )}
                    </div>

                    {/* Missing answers alert nudge */}
                    {Object.keys(userAnswers).length < quizQuestions.length && (
                      <div className="text-[10px] text-neutral-400 font-semibold text-center italic">
                        Answer all questions to unlock final evaluation report ({Object.keys(userAnswers).length} of {quizQuestions.length} completed).
                      </div>
                    )}

                  </div>
                )}

                {/* 4. Complete Performance Review Screen */}
                {quizCompleted && quizQuestions && !isLoading && (
                  <div className="space-y-6 flex-grow overflow-y-auto pr-1 max-h-[600px]">
                    
                    {/* Final score banner container */}
                    <div className="p-6 bg-neutral-950 text-white rounded-2xl border border-neutral-900 text-center space-y-4">
                      <div className="inline-flex h-16 w-16 bg-yellow-400 text-black rounded-2xl items-center justify-center font-extrabold text-2xl shadow-md rotate-3">
                        {calculateScore()} / {quizQuestions.length}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-extrabold tracking-tight">Evaluation Report Generated</h3>
                        <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
                          You scored a <span className="text-yellow-400 font-bold">{Math.round((calculateScore() / quizQuestions.length) * 100)}%</span> in the active {subCategory} curriculum assessment modules.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateQuiz}
                        className="text-xs bg-white text-black hover:bg-neutral-100 font-extrabold px-4 py-2 rounded-xl transition-all inline-flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Regenerate New Batch</span>
                      </button>
                    </div>

                    {/* Step-by-Step Question Audit with highlighted rationale explanations */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Question Breakdown & Explanations</h4>
                      
                      {quizQuestions.map((question, idx) => {
                        const isCorrect = userAnswers[idx] === question.correctAnswer;
                        return (
                          <div 
                            key={idx} 
                            className="p-5 bg-white border border-neutral-200 rounded-2xl space-y-4 transition-all hover:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-extrabold text-neutral-400 font-mono">Q{idx + 1}</span>
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                  }`}>
                                    {isCorrect ? "Correct" : "Incorrect"}
                                  </span>
                                </div>
                                <h5 className="text-xs font-extrabold text-black font-sans leading-relaxed">
                                  {question.question}
                                </h5>
                              </div>
                            </div>

                            {/* Options review */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {question.options.map((opt, optIdx) => {
                                const wasSelected = userAnswers[idx] === opt;
                                const isCorrectOpt = question.correctAnswer === opt;
                                return (
                                  <div 
                                    key={optIdx} 
                                    className={`p-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between ${
                                      isCorrectOpt 
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                                        : wasSelected 
                                        ? "bg-red-50 border-red-300 text-red-800" 
                                        : "bg-neutral-50/50 border-neutral-150 text-neutral-500"
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isCorrectOpt && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
                                    {wasSelected && !isCorrectOpt && <XCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Cognitive AI Explanation with Yellow Highlights */}
                            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 text-[11px] leading-relaxed">
                              <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono mb-1">AI Explanation</span>
                              <div className="text-neutral-600">
                                {renderHighlightedExplanation(question.explanation, question.highlights)}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* Footer specs */}
                {quizQuestions && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Audit Model: {ACTIVE_MODEL}</span>
                    <span>Curriculum Focus: {subCategory}</span>
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
          <p className="text-xs text-neutral-400 font-semibold font-mono">
            © 2026 LUCID.QUIZ. Cognitive Assessment & Training Labs.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400 font-sans">
            <span>Secure Simulator</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}