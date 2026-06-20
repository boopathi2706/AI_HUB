import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  Briefcase,
  Layers,
  Award,
  HelpCircle,
  BookOpen,
  ChevronRight,
  Printer
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function App() {
  const [role, setRole] = useState("Software Engineer / Software Developer");
  const [questionCount, setQuestionCount] = useState(10); // Minimum 10 based on user requirement
  const [difficulty, setDifficulty] = useState("Medium"); // Basic, Medium, Hard
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(0); // Index of expanded question
  const [generatedQuestions, setGeneratedQuestions] = useState(null);

  const roleGroups = [
    {
      category: "Software Development",
      roles: [
        "Software Engineer / Software Developer",
        "Frontend Developer (React, Angular, Vue)",
        "Backend Developer (Java, Spring Boot, Node.js, .NET, Python)",
        "Full Stack Developer",
        "Mobile App Developer (Android, iOS, Flutter, React Native)"
      ]
    },
    {
      category: "Data & AI",
      roles: [
        "Data Analyst",
        "Business Intelligence (BI) Developer",
        "Data Engineer",
        "Data Scientist",
        "Machine Learning Engineer",
        "AI Engineer / Generative AI Engineer"
      ]
    },
    {
      category: "Cloud & DevOps",
      roles: [
        "DevOps Engineer",
        "Site Reliability Engineer (SRE)",
        "Cloud Engineer",
        "Cloud Architect",
        "Platform Engineer"
      ]
    },
    {
      category: "Testing & Quality",
      roles: [
        "QA Engineer",
        "Automation Test Engineer",
        "Performance Test Engineer",
        "Quality Assurance Lead"
      ]
    },
    {
      category: "Cybersecurity",
      roles: [
        "Security Analyst",
        "Security Engineer",
        "SOC Analyst",
        "Penetration Tester",
        "Security Architect"
      ]
    },
    {
      category: "Infrastructure & Support",
      roles: [
        "System Administrator",
        "Network Engineer",
        "Database Administrator (DBA)",
        "Technical Support Engineer",
        "IT Operations Engineer"
      ]
    },
    {
      category: "Management & Leadership",
      roles: [
        "Team Lead",
        "Engineering Manager",
        "Project Manager",
        "Program Manager",
        "Delivery Manager",
        "Product Manager",
        "Technical Architect",
        "Solution Architect"
      ]
    },
    {
      category: "High-Paying Senior Roles",
      roles: [
        "Principal Engineer",
        "Staff Engineer",
        "Enterprise Architect",
        "Chief Technology Officer (CTO)",
        "Head of Engineering",
        "VP Engineering"
      ]
    },
    {
      category: "Current High-Demand Skills in India (2026)",
      roles: [
        "React + TypeScript Specialist",
        "Java + Spring Boot Specialist",
        "Python Specialist",
        "AWS / Azure / GCP Solutions",
        "Docker & Kubernetes",
        "GenAI / LLM Applications Specialist",
        "Data Engineering (Spark, Kafka)",
        "Cybersecurity Specialist"
      ]
    }
  ];

  const loadDemoTopic = (demoRole, demoCount, demoDiff) => {
    setRole(demoRole);
    setQuestionCount(demoCount);
    setDifficulty(demoDiff);
    setGeneratedQuestions(null);
    setError("");
    setErrorCode(null);
    setActiveAccordion(0);
  };

  const handleClear = () => {
    setGeneratedQuestions(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateQuestions = async () => {
    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setGeneratedQuestions(null);

    // Block process if API key is not configured inside the code
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the React code on the right and update the `GEMINI_API_KEY` constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite technical interviewer, hiring manager, and talent assessor.
Your task is to generate exactly ${questionCount} highly relevant technical, behavioral, or architectural interview questions targeted specifically at the role: "${role}" at a "${difficulty}" level of difficulty.

Make sure to provide complete, thorough, comprehensive, and high-impact answers for each question.
You must also identify 3 to 6 critical industry-specific terms, technical key concepts, or frameworks inside each answer that will be highlighted in the UI.

Return a strictly formatted JSON object matching this exact schema:
{
  "role": "${role}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "What is...",
      "answer": "Complete professional answer detailing core concepts...",
      "highlights": ["list of exact keywords or short technical phrases used in the answer text to highlight in yellow (case-sensitive matching)"]
    }
  ]
}
Return only raw JSON. Do not wrap the output inside markdown blocks. Ensure the questions list has exactly ${questionCount} items.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate questions for role: ${role}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            role: { type: "STRING" },
            difficulty: { type: "STRING" },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "INTEGER" },
                  question: { type: "STRING" },
                  answer: { type: "STRING" },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["id", "question", "answer", "highlights"]
              }
            }
          },
          required: ["role", "difficulty", "questions"]
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
        if (parsed && Array.isArray(parsed.questions)) {
          setGeneratedQuestions(parsed);
          setActiveAccordion(0);
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

  const handleCopySingle = (qText, aText, index) => {
    const formattedText = `QUESTION:\n${qText}\n\nANSWER:\n${aText}`;
    const tempElement = document.createElement('textarea');
    tempElement.value = formattedText;
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
    if (!generatedQuestions || generatedQuestions.questions.length === 0) return;
    const plainText = generatedQuestions.questions
      .map((q, idx) => `[Q${idx + 1}] ${q.question}\nAnswer: ${q.answer}\n`)
      .join("\n====================\n\n");
    
    const tempElement = document.createElement('textarea');
    tempElement.value = plainText;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      setError("Unable to copy all items automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadReport = () => {
    if (!generatedQuestions) return;
    const plainText = generatedQuestions.questions
      .map((q, idx) => `QUESTION ${idx + 1}: ${q.question}\nANSWER: ${q.answer}\nHIGHLIGHTS: ${q.highlights.join(", ")}\n`)
      .join("\n--------------------\n\n");
    
    const completeFileContent = `INTERVIEW PREPARATION CHEATSHEET\n================================\nRole: ${generatedQuestions.role}\nLevel: ${generatedQuestions.difficulty}\n\n${plainText}\n\nCompiled via SUMM.INTERVIEW Engine.`;
    const blob = new Blob([completeFileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Interview_Questions_${generatedQuestions.role.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedAnswer = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600">{text}</span>;
    }

    // Sort terms by length descending to prevent partial match overwrites
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
                className="bg-yellow-200 text-black px-1 py-0.5 rounded font-bold shadow-sm inline-block mx-0.5"
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
      
      {}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-250">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black text-yellow-400 p-2 rounded-xl flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">SUMM<span className="text-yellow-500 font-semibold">.INTERVIEW</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider">Linguistic Assessment Builder</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoTopic("Full Stack Developer", 10, "Medium")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Full Stack
            </button>
            <button
              onClick={() => loadDemoTopic("AI Engineer / Generative AI Engineer", 12, "Hard")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: GenAI Track
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col space-y-8">
        
        {/* Intro Block */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-black">
              AI Interview <span className="bg-yellow-200 px-1.5 rounded-sm">Question Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Dynamically formulate technical evaluations, complex architectural problems, and model answers tailored specifically for advanced tech tracks. Core concepts are custom-highlighted in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoTopic("Cloud Architect", 10, "Hard")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Cloud Architect
          </button>
        </div>

        {/* Workspace Dual splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Controls Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Evaluation Config</span>
                </div>
                {generatedQuestions && (
                  <button 
                    onClick={handleClear}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Workspace</span>
                  </button>
                )}
              </div>

              {/* Input Workspace Forms */}
              <div className="p-6 space-y-5 flex-grow">
                
                {/* Job Roles Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Choose Target Job Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-250 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    {roleGroups.map((group, gIdx) => (
                      <optgroup key={gIdx} label={group.category}>
                        {group.roles.map((subRole, rIdx) => (
                          <option key={rIdx} value={subRole}>
                            {subRole}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Difficulty level input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Linguistic Difficulty Grade</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Basic", "Medium", "Hard"].map((lvl) => {
                      const isSelected = difficulty === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setDifficulty(lvl)}
                          className={`p-3 text-xs font-semibold rounded-xl border transition-all ${
                            isSelected 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Count (Minimum 10 questions) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <span>Target Question Volume</span>
                    <span className="text-black bg-yellow-200 px-1.5 py-0.5 rounded font-mono font-extrabold">{questionCount} items</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full accent-black h-1 bg-neutral-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
                    <span>MIN: 10</span>
                    <span>MAX: 20</span>
                  </div>
                </div>

              </div>

              {/* Control Trigger Area */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateQuestions}
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
                      <span>Distilling Evaluation Suite...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Synthesize Evaluation Setup</span>
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
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Evaluation Board</span>
                {generatedQuestions && (
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
                      <span>Copy All</span>
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Credentials Validation Alert */}
              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col space-y-2 text-red-950 text-xs">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-600 animate-bounce" />
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
                {!isLoading && !generatedQuestions && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <HelpCircle className="h-7 w-7 text-neutral-400" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Evaluation Suite Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Customize target parameters in the left config board, hit generate, and the expert system will construct a comprehensive list of structured Q&As with highlight markers.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Mining Assessment Schema...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Generating realistic architectural problems, validating optimal answer approaches, and highlighting important keywords.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {generatedQuestions && !isLoading && (
                  <div className="space-y-6 flex-grow">
                    
                    {/* Header Context Metrics Banner */}
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Selected Role Focus</span>
                        <span className="text-black font-extrabold">{generatedQuestions.role}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Level</span>
                          <span className="text-black font-extrabold uppercase">{generatedQuestions.difficulty}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Assessed Items</span>
                          <span className="text-black font-extrabold font-mono">{generatedQuestions.questions.length} questions</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Q&A list wrapper */}
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {generatedQuestions.questions.map((item, idx) => {
                        const isOpen = activeAccordion === idx;
                        return (
                          <div 
                            key={item.id}
                            className={`rounded-xl border transition-all ${
                              isOpen 
                                ? "border-neutral-900 bg-white shadow-sm" 
                                : "border-neutral-150 bg-neutral-50/50 hover:bg-neutral-50"
                            }`}
                          >
                            {/* Question Header */}
                            <button
                              onClick={() => setActiveAccordion(isOpen ? -1 : idx)}
                              className="w-full text-left p-4 flex items-center justify-between gap-3 focus:outline-none"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className="text-xs font-mono font-bold text-neutral-400 shrink-0">
                                  #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <h3 className="text-sm font-bold text-neutral-900 truncate">
                                  {item.question}
                                </h3>
                              </div>
                              <ChevronRight className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? "rotate-90 text-black" : ""}`} />
                            </button>

                            {/* Answer Body Accordion details */}
                            {isOpen && (
                              <div className="p-4 border-t border-neutral-100 space-y-4 bg-white rounded-b-xl animate-fade-in">
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Model Solution Answer</span>
                                    
                                    <button
                                      onClick={() => handleCopySingle(item.question, item.answer, idx)}
                                      className="text-[10px] text-black hover:underline flex items-center space-x-1 font-semibold"
                                    >
                                      {copiedIndex === idx ? (
                                        <>
                                          <Check className="h-3 w-3 text-emerald-600" />
                                          <span className="text-emerald-600">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" />
                                          <span>Copy Q&A</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <p className="text-xs leading-relaxed text-neutral-600 font-sans whitespace-pre-wrap">
                                    {renderHighlightedAnswer(item.answer, item.highlights)}
                                  </p>
                                </div>

                                {/* Extracted Focus Term Pills */}
                                {item.highlights && item.highlights.length > 0 && (
                                  <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                                    <span className="block text-[8px] font-extrabold text-neutral-400 uppercase tracking-widest">Primary Focal Parameters</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.highlights.map((term, tIdx) => (
                                        <span 
                                          key={tIdx}
                                          className="text-[9px] bg-yellow-100 text-black border border-yellow-250 font-bold px-2 py-0.5 rounded-full"
                                        >
                                          💡 {term}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* Footer Context Info */}
                {generatedQuestions && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Platform: {ACTIVE_MODEL}</span>
                    <span>Role Track: {role}</span>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>

      </main>

      {}
      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes infiniteLoading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-infinite-loading {
          animation: infiniteLoading 1.6s infinite linear;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>

      {/* Global Page Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 font-semibold">
            © 2026 SUMM.INTERVIEW. Premium Engineering Assessments.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400">
            <span>Client Evaluation Sandbox</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}