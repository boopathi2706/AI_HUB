import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Database,
  Trash2,
  Download,
  Info,
  Lightbulb,
  Table,
  Terminal,
  HelpCircle
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_SQL_Query_Generator() {
  const [prompt, setPrompt] = useState("");
  const [dbType, setDbType] = useState("PostgreSQL"); // PostgreSQL, MySQL, SQLite, MS SQL, Oracle
  const [schemaInput, setSchemaInput] = useState(""); // Optional schema details
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [copiedExplanation, setCopiedExplanation] = useState(false);
  const [sqlData, setSqlData] = useState(null);

  const loadDemoQuery = (samplePrompt, sampleSchema, sampleDb) => {
    setPrompt(samplePrompt);
    setSchemaInput(sampleSchema);
    setDbType(sampleDb);
    setSqlData(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateQuery = async () => {
    if (!prompt.trim()) {
      setError("Please describe the SQL query you want to generate in plain English.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setSqlData(null);

    // Prompt user to customize key if not updated
    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are an elite, world-class Database Administrator (DBA) and SQL developer.
Translate the plain English request into a syntactically perfect, optimized SQL query for "${dbType}".
Take the optional table schemas or columns provided by the user into account: "${schemaInput}".

Provide a raw, highly optimized SQL query and a thorough explanation.
You must identify 4 to 8 high-value keywords, SQL functions, or schema tables/columns within your text explanation to highlight in yellow in the UI.

Return a strictly formatted JSON object matching this exact schema:
{
  "sql": "The complete optimized, well-formatted SQL query code",
  "explanation": "A highly readable 2-4 sentence explanation of how the SQL query works, Joins applied, filters, or aggregations used.",
  "highlights": ["list of exact keywords, table names, columns, or SQL functions used in your explanation string to highlight in yellow"],
  "performanceTips": [
    {
      "index": "Name of the target table and columns to index (e.g., CREATE INDEX on users(email))",
      "rationale": "Brief rationale on how this index optimizes the query's joins, sorting, or filters."
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate SQL for: ${prompt}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sql: { type: "STRING" },
            explanation: { type: "STRING" },
            highlights: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            performanceTips: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  index: { type: "STRING" },
                  rationale: { type: "STRING" }
                },
                required: ["index", "rationale"]
              }
            }
          },
          required: ["sql", "explanation", "highlights", "performanceTips"]
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
        setSqlData(parsed);
        setIsLoading(false);
        return;
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(err.message || "Failed to establish a connection with the Gemini server.");
          setIsLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleCopySql = () => {
    if (!sqlData) return;
    const tempElement = document.createElement('textarea');
    tempElement.value = sqlData.sql;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 2000);
    } catch (err) {
      setError("Unable to copy query to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleCopyAll = () => {
    if (!sqlData) return;
    const formattedText = `DATABASE TYPE: ${dbType}\n\n[SQL QUERY]\n${sqlData.sql}\n\n[Explanation]\n${sqlData.explanation}\n\n[Indexing suggestions]\n${sqlData.performanceTips.map(t => `- ${t.index}: ${t.rationale}`).join('\n')}`;
    const tempElement = document.createElement('textarea');
    tempElement.value = formattedText;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedExplanation(true);
      setTimeout(() => setCopiedExplanation(false), 2000);
    } catch (err) {
      setError("Unable to copy information to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadQuery = () => {
    if (!sqlData) return;
    const blob = new Blob([sqlData.sql], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `query_${dbType.toLowerCase()}_${Date.now()}.sql`;
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
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.SQL</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Semantic Database Query Architect</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoQuery(
                "Find the top 5 highest-paying departments where the average salary is greater than $80,000", 
                "departments (id, name, location)\nemployees (id, department_id, salary, name, active_status)",
                "PostgreSQL"
              )}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: HR Join GroupBy
            </button>
            <button
              onClick={() => loadDemoQuery(
                "Find the active users who haven't ordered anything in the last 30 days but registered over a year ago", 
                "users (id, name, registration_date, status)\norders (id, user_id, order_date, total_price)",
                "MySQL"
              )}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: E-commerce NOT EXISTS
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
              AI SQL Query <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed">
              Synthesize structured SQL code, construct indexes, and optimize query plans instantly. Write your request in plain English, choose your flavor of SQL, and watch high-value operations get highlighted cleanly in yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoQuery(
              "Calculate the cumulative rolling sales sum for each product over months in the current year", 
              "sales (id, product_id, sale_amount, sale_date)\nproducts (id, product_name)",
              "PostgreSQL"
            )}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Rolling Sum Demo
          </button>
        </div>

        {/* Dual splits layout structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Schemas */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Query Configurator</span>
                </div>
                {(prompt || schemaInput) && (
                  <button 
                    onClick={() => { setPrompt(""); setSchemaInput(""); setSqlData(null); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Settings</span>
                  </button>
                )}
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* Plain English Request */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">What should the SQL query achieve?</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your intent, e.g. 'Get all users who signed up last week and spent more than $50 total'"
                    className="w-full text-xs text-neutral-800 placeholder-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-sans focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none min-h-[120px]"
                  />
                </div>

                {/* Optional Database Schema Context */}
                <div className="space-y-1.5 flex-grow flex flex-col">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Paste Table Schema Context (Optional)</label>
                    <span className="text-[9px] text-neutral-400 font-mono">Improves columns accuracy</span>
                  </div>
                  <textarea
                    value={schemaInput}
                    onChange={(e) => setSchemaInput(e.target.value)}
                    placeholder="e.g.&#10;users (id, email, created_at, status)&#10;orders (id, user_id, amount, status)"
                    className="w-full flex-grow text-xs text-neutral-800 placeholder-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-mono focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none min-h-[100px]"
                  />
                </div>

                {/* SQL Flavor / DB Dialect */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">SQL Database Engine</label>
                  <select
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL</option>
                    <option value="SQLite">SQLite</option>
                    <option value="MS SQL Server">Microsoft SQL Server</option>
                    <option value="Oracle DB">Oracle Database</option>
                  </select>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateQuery}
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
                      <span>Synthesizing SQL Plan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate SQL Query</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Code & Plan Analysis Board */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Execution Plan & Output</span>
                {sqlData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyAll}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copiedExplanation ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>Copy All Details</span>
                    </button>
                    <button
                      onClick={handleDownloadQuery}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download SQL</span>
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
                {!isLoading && !sqlData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <Table className="h-7 w-7 text-neutral-400" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Query Console Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Input your database schema and English description on the left config panel. The engine will instantly render clean code, explain indexing choices, and highlight structural syntax.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Compiling Semantic Query...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Optimizing joins, mapping table columns, planning index paths, and wrapping essential commands in high-visibility nodes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {sqlData && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Rendered SQL Code Block */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">SQL Standard Code ({dbType})</span>
                        <button
                          onClick={handleCopySql}
                          className="text-xs text-neutral-400 hover:text-black flex items-center space-x-1 font-mono hover:bg-neutral-50 px-2 py-1 rounded border border-neutral-250 transition-all"
                        >
                          {copiedQuery ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedQuery ? 'Copied' : 'Copy Query'}</span>
                        </button>
                      </div>
                      <div className="p-4 bg-neutral-950 text-yellow-300 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                        {sqlData.sql}
                      </div>
                    </div>

                    {/* Step breakdowns with custom segment highlights */}
                    <div className="space-y-2 border-t border-neutral-100 pt-5">
                      <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Semantic Translation Analysis</span>
                      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                        {renderHighlightedExplanation(sqlData.explanation, sqlData.highlights)}
                      </p>
                    </div>

                    {/* Performance Optimizations & Indexing Suggestions */}
                    {sqlData.performanceTips && sqlData.performanceTips.length > 0 && (
                      <div className="space-y-3 border-t border-neutral-100 pt-5">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono">DBA Performance Index Recommendations</span>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {sqlData.performanceTips.map((tip, idx) => (
                            <div key={idx} className="flex items-start space-x-3 p-3 bg-yellow-50/30 rounded-xl border border-yellow-150">
                              <Lightbulb className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs text-neutral-900 block font-bold">{tip.index}</span>
                                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">{tip.rationale}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* Footer specs */}
                {sqlData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Platform Engine: {ACTIVE_MODEL}</span>
                    <span>Dialect target: {dbType}</span>
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
            © 2026 LUCID.SQL. Secure Semantic Database Planning.
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