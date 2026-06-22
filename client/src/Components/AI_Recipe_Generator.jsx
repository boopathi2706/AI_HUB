import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Trash2,
  Download,
  Plus,
  X,
  Clock,
  Flame,
  Users,
  ChefHat,
  ShoppingBag,
  Info,
  ChevronRight,
  Globe
} from 'lucide-react';

// Hardcode your Gemini API Key directly here to authenticate the requests
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ACTIVE_MODEL = "gemini-2.5-flash";

export default function AI_Recipe_Generator() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState(["Tomato", "Paneer", "Garlic", "Onion"]);
  const [dietary, setDietary] = useState("None"); // Vegan, Vegetarian, Keto, Gluten-Free, None
  const [mealType, setMealType] = useState("Dinner"); // Breakfast, Lunch, Dinner, Snack
  const [cookingTime, setCookingTime] = useState("30"); // Max cooking time in minutes
  const [language, setLanguage] = useState("English"); // English, Tamil, Hindi, Kannada, Malayalam, Telugu

  // UI, Loading, and API State Handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [recipeData, setRecipeData] = useState(null);

  const handleAddIngredient = (e) => {
    e.preventDefault();
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setIngredients([...ingredients, trimmed]);
      setIngredientInput("");
    }
  };

  const handleRemoveIngredient = (indexToRemove) => {
    setIngredients(ingredients.filter((_, idx) => idx !== indexToRemove));
  };

  const loadDemoSetup = (demoIngredients, demoDiet, demoMeal, demoTime, demoLang) => {
    setIngredients(demoIngredients);
    setDietary(demoDiet);
    setMealType(demoMeal);
    setCookingTime(demoTime);
    setLanguage(demoLang || "English");
    setRecipeData(null);
    setError("");
    setErrorCode(null);
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least 1 ingredient to search recipes for.");
      return;
    }

    setIsLoading(true);
    setError("");
    setErrorCode(null);
    setRecipeData(null);

    if (!GEMINI_API_KEY || GEMINI_API_KEY !== import.meta.env.VITE_GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please edit the code directly in your editor and update the GEMINI_API_KEY constant at the top of the file.");
      setErrorCode(401);
      setIsLoading(false);
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ACTIVE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `You are a world-class professional culinary chef, recipe developer, and nutritionist.
Based on this available list of ingredients: [${ingredients.join(", ")}], generate exactly 2 highly appealing, clean, and nutritious recipes suited for a ${mealType} course.
Dietary constraints to strictly respect: "${dietary}".
Maximum preparation + cooking time target: ${cookingTime} minutes.

CRITICAL TRANSLATION REQUIREMENT:
You must translate the ENTIRE recipe output (including recipe names, descriptions, ingredient measurements, instructions, and chef secret pro-tip) into the requested language: "${language}".

For each recipe, provide:
1. Title (strictly translated into ${language})
2. Total Prep + Cooking Time
3. Servings
4. Approximate Calories
5. List of ingredients with precise measurements (strictly translated into ${language}).
6. Clear, numbered step-by-step cooking instructions (strictly translated into ${language}).
7. Identify 3 to 6 high-value cooking terms, crucial spices, secret techniques, or caution steps to highlight in yellow. Note: The highlighted phrases must match EXACTLY (letter-by-letter, character-by-character) with the translated words/phrases inside your instructions in ${language}.

Return a strictly formatted JSON object matching this exact schema:
{
  "recipes": [
    {
      "title": "Beautiful Recipe Title",
      "prepTime": "Prep time description (e.g. 10 mins)",
      "cookTime": "Cook time description (e.g. 20 mins)",
      "servings": 2,
      "calories": "350 kcal",
      "difficulty": "Easy" | "Medium" | "Expert",
      "description": "A mouth-watering 1-2 sentence description of the dish.",
      "ingredientsNeeded": ["Ingredient item 1", "Ingredient item 2"],
      "steps": [
        "Step 1 instruction",
        "Step 2 instruction"
      ],
      "highlights": ["exact word or phrase from step 1", "exact word or phrase from step 2"],
      "chefSecretTip": "A professional chef tip in ${language} to elevate this specific dish."
    }
  ]
}
Ensure the output is strictly valid JSON. Return ONLY raw JSON without wrapping in markdown code blocks.`;

    const payload = {
      contents: [{ parts: [{ text: `Generate recipes based on ingredients list in ${language}.` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recipes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  prepTime: { type: "STRING" },
                  cookTime: { type: "STRING" },
                  servings: { type: "INTEGER" },
                  calories: { type: "STRING" },
                  difficulty: { type: "STRING", enum: ["Easy", "Medium", "Expert"] },
                  description: { type: "STRING" },
                  ingredientsNeeded: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  steps: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  highlights: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  chefSecretTip: { type: "STRING" }
                },
                required: ["title", "prepTime", "cookTime", "servings", "calories", "difficulty", "description", "ingredientsNeeded", "steps", "highlights", "chefSecretTip"]
              }
            }
          },
          required: ["recipes"]
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
        if (parsed && Array.isArray(parsed.recipes)) {
          setRecipeData(parsed.recipes);
          setSelectedRecipeIndex(0);
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

  const handleCopyRecipe = (recipe, index) => {
    const formatted = `RECIPE: ${recipe.title}\nDescription: ${recipe.description}\n\n[Prep: ${recipe.prepTime} | Cook: ${recipe.cookTime} | Calories: ${recipe.calories}]\n\n[Ingredients Needed]\n${recipe.ingredientsNeeded.map(i => `- ${i}`).join("\n")}\n\n[Cooking Steps]\n${recipe.steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n\nChef's Secret: ${recipe.chefSecretTip}`;
    
    const tempElement = document.createElement('textarea');
    tempElement.value = formatted;
    document.body.appendChild(tempElement);
    tempElement.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      setError("Unable to copy to clipboard automatically.");
    }
    document.body.removeChild(tempElement);
  };

  const handleDownloadRecipe = (recipe) => {
    const formatted = `LUCID.KITCHEN CHEF RECIPE\n=========================\nRecipe: ${recipe.title}\nCourse: ${mealType}\nDietary standard: ${dietary}\nLanguage: ${language}\n\n[Specifications]\nPrep Time: ${recipe.prepTime}\nCook Time: ${recipe.cookTime}\nServings: ${recipe.servings} Pax\nCalories: ${recipe.calories}\nDifficulty: ${recipe.difficulty}\n\n[Description]\n${recipe.description}\n\n[Ingredients needed]\n${recipe.ingredientsNeeded.map(i => `- ${i}`).join("\n")}\n\n[Instructions]\n${recipe.steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n\n[Chef's Secret Pro-Tip]\n${recipe.chefSecretTip}\n\nGenerated via LUCID.KITCHEN Smart Recipe Sandbox`;
    
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LucidKitchen_${recipe.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHighlightedText = (text, highlights) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-neutral-600 font-sans">{text}</span>;
    }

    // Sort to replace longest substrings first
    const sortedHighlights = [...highlights].filter(Boolean).sort((a, b) => b.length - a.length);
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
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-black block">LUCID<span className="text-yellow-500 font-semibold">.KITCHEN</span></span>
              <span className="text-[10px] text-neutral-400 block -mt-1 font-semibold uppercase tracking-wider font-mono">Multilingual Culinary Sandbox</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadDemoSetup(["Rava", "Mustard Seeds", "Onion", "Chili", "Ghee"], "None", "Breakfast", "15", "Tamil")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all"
            >
              Demo: Upma (Tamil)
            </button>
            <button
              onClick={() => loadDemoSetup(["Basmati Rice", "Cardamom", "Paneer", "Saffron", "Yogurt"], "Vegetarian", "Dinner", "45", "Hindi")}
              className="text-xs font-semibold px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg transition-all hidden sm:inline-block"
            >
              Demo: Veg Biryani (Hindi)
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
              AI Recipe <span className="bg-yellow-200 px-1.5 rounded-sm">Generator</span>
            </h1>
            <p className="text-neutral-500 text-sm max-w-2xl leading-relaxed font-sans">
              Turn your leftover pantry ingredients into gourmet dishes. Select a language to translate recipes into regional tongues, specify dietary choices, and watch techniques highlight in bright yellow.
            </p>
          </div>
          <button
            onClick={() => loadDemoSetup(["Banana", "Milk", "Honey", "Almonds"], "None", "Breakfast", "10", "Malayalam")}
            className="self-start md:self-center text-xs font-bold px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-md"
          >
            Autofill Banana Shake (Malayalam)
          </button>
        </div>

        {/* Dual splits layout structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Inputs & Ingredients Management */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-black uppercase tracking-wider">Pantry & Setup</span>
                </div>
                {(ingredients.length > 0 || dietary !== "None" || mealType !== "Dinner" || language !== "English") && (
                  <button 
                    onClick={() => { setIngredients([]); setDietary("None"); setMealType("Dinner"); setCookingTime("30"); setLanguage("English"); setRecipeData(null); setError(""); setErrorCode(null); }}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Pantry</span>
                  </button>
                )}
              </div>

              {/* Input Forms */}
              <div className="p-6 space-y-5 flex-grow flex flex-col">
                
                {/* Language Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Language (மொழி / भाषा)</label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 pl-10 font-semibold text-neutral-700 focus:outline-none focus:border-black appearance-none"
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

                {/* Ingredients Chip Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pantry Ingredients</label>
                  <form onSubmit={handleAddIngredient} className="flex gap-2">
                    <input
                      type="text"
                      value={ingredientInput}
                      onChange={(e) => setIngredientInput(e.target.value)}
                      placeholder="Add ingredient (e.g. Eggs, Ghee, Spices)..."
                      className="flex-grow text-xs text-neutral-800 placeholder-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl flex items-center justify-center transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>

                  {/* Chips Display */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {ingredients.length > 0 ? (
                      ingredients.map((ing, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-neutral-100 border border-neutral-200 text-black font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1.5 shadow-sm"
                        >
                          <span>{ing}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-neutral-400 hover:text-red-500 focus:outline-none transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400 italic block py-1">Pantry is empty. Type above and click plus!</span>
                    )}
                  </div>
                </div>

                {/* Dietary Restriction Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dietary Preferences</label>
                  <select
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-200 rounded-xl p-3 font-semibold text-neutral-700 focus:outline-none focus:border-black"
                  >
                    <option value="None">None (Standard Diet)</option>
                    <option value="Vegetarian">Vegetarian (No meat/seafood)</option>
                    <option value="Non-Vegetarian">Non-Vegetarian (Add meat/seafood)</option>
                    <option value="Vegan">Vegan (Pure plant-based)</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                    <option value="Keto">Keto (Low carb, high fat)</option>
                  </select>
                </div>

                {/* Meal Type Course Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Meal Course Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["Breakfast", "Lunch", "Dinner", "Snack"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMealType(m)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                          mealType === m
                            ? "bg-black text-white border-black"
                            : "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Maximum Cooking Time Regulating Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Max Cooking Time</label>
                    <span className="text-xs font-bold text-black">{cookingTime} Minutes</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={5}
                    value={cookingTime}
                    onChange={(e) => setCookingTime(e.target.value)}
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 font-mono font-bold uppercase">
                    <span>Quick: 10m</span>
                    <span>Gourmet: 120m</span>
                  </div>
                </div>

              </div>

              {/* Submit CTA */}
              <div className="bg-neutral-50 border-t border-neutral-200 p-6">
                <button
                  onClick={handleGenerateRecipes}
                  disabled={isLoading || ingredients.length === 0}
                  className={`w-full font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    isLoading || ingredients.length === 0
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : "bg-black hover:bg-neutral-800 text-white hover:shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Brewing Creative Recipes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      <span>Generate in {language}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Recipe Display Canvas */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-neutral-50/50 p-4 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Recipe Card Board</span>
                {recipeData && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyRecipe(recipeData[selectedRecipeIndex], selectedRecipeIndex)}
                      className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                    >
                      {copiedIndex === selectedRecipeIndex ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>Copy Recipe</span>
                    </button>
                    <button
                      onClick={() => handleDownloadRecipe(recipeData[selectedRecipeIndex])}
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
                {!isLoading && !recipeData && !error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="h-16 w-16 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 shadow-inner">
                      <ChefHat className="h-7 w-7 text-neutral-400 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider font-sans">Kitchen Hub Standby</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        Add whatever ingredients you have in your pantry on the left side configuration panel. Select your preferred regional language, and the AI Chef will construct instructions, complete with calorie listings and techniques highlighted in yellow.
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
                        <p className="text-xs font-bold text-black uppercase tracking-wider">Simmering Creative Recipes...</p>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                          Evaluating ingredient combinations, mapping localized steps in {language}, and generating key technical annotations in vibrant yellow.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output results */}
                {recipeData && !isLoading && (
                  <div className="space-y-6 flex-grow flex flex-col">
                    
                    {/* Tab Navigation for generated recipes */}
                    <div className="flex border-b border-neutral-200">
                      {recipeData.map((recipe, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedRecipeIndex(idx)}
                          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center space-x-1.5 ${
                            selectedRecipeIndex === idx 
                              ? "border-black text-black" 
                              : "border-transparent text-neutral-400 hover:text-neutral-600"
                          }`}
                        >
                          <span>{recipe.title}</span>
                          <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-500 font-mono font-normal">
                            Option {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Active Recipe Display Area */}
                    <div className="space-y-6 animate-fadeIn flex-grow">
                      
                      {/* Recipe Description & Metadata */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] bg-neutral-100 text-neutral-600 font-extrabold px-2 py-0.5 rounded border border-neutral-200 uppercase tracking-wider">
                            {recipeData[selectedRecipeIndex].difficulty}
                          </span>
                          <span className="text-[9px] bg-yellow-50 text-yellow-800 border border-yellow-150 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                            {recipeData[selectedRecipeIndex].calories}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-black tracking-tight">{recipeData[selectedRecipeIndex].title}</h2>
                        <p className="text-xs text-neutral-500 italic leading-relaxed">{recipeData[selectedRecipeIndex].description}</p>
                      </div>

                      {/* Time and Servings Specs */}
                      <div className="grid grid-cols-3 gap-3 p-3 bg-neutral-50 border border-neutral-150 rounded-xl text-center">
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-extrabold text-neutral-400 uppercase font-mono">Prep Time</span>
                          <span className="text-xs font-bold text-black flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-neutral-400" />
                            {recipeData[selectedRecipeIndex].prepTime}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-extrabold text-neutral-400 uppercase font-mono">Cook Time</span>
                          <span className="text-xs font-bold text-black flex items-center justify-center gap-1">
                            <Flame className="h-3 w-3 text-neutral-400" />
                            {recipeData[selectedRecipeIndex].cookTime}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-extrabold text-neutral-400 uppercase font-mono">Servings</span>
                          <span className="text-xs font-bold text-black flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-neutral-400" />
                            {recipeData[selectedRecipeIndex].servings} Pax
                          </span>
                        </div>
                      </div>

                      {/* Ingredients List */}
                      <div className="space-y-2">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono font-bold">Ingredients Required</span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recipeData[selectedRecipeIndex].ingredientsNeeded.map((ing, i) => (
                            <li key={i} className="text-xs text-neutral-600 flex items-center space-x-2 bg-neutral-50/50 p-2 rounded-lg border border-neutral-100">
                              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                              <span className="font-medium">{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cooking Instructions with yellow highlighted techniques */}
                      <div className="space-y-3.5 border-t border-neutral-100 pt-5">
                        <span className="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest font-mono font-bold">Cooking Steps & Procedure</span>
                        <div className="space-y-3">
                          {recipeData[selectedRecipeIndex].steps.map((step, idx) => (
                            <div key={idx} className="flex items-start space-x-3 text-xs leading-relaxed">
                              <span className="h-5 w-5 rounded-full bg-neutral-900 text-white font-bold font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-neutral-600 font-medium pt-0.5">
                                {renderHighlightedText(step, recipeData[selectedRecipeIndex].highlights)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chef's Secret Pro Tip */}
                      <div className="p-4 bg-yellow-50/40 rounded-xl border border-yellow-150 flex items-start space-x-3 mt-4">
                        <Info className="h-4.5 w-4.5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-neutral-900 block font-sans">Chef's Secret Elevating Pro-Tip</span>
                          <p className="text-[11px] text-neutral-600 leading-relaxed font-sans">{recipeData[selectedRecipeIndex].chefSecretTip}</p>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* Footer specs */}
                {recipeData && (
                  <div className="text-[10px] text-neutral-400 border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                    <span>Audit Model: {ACTIVE_MODEL}</span>
                    <span>Dietary Spec: {dietary}</span>
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
            © 2026 LUCID.KITCHEN. Intelligent Recipe Sandbox.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-400 font-sans">
            <span>Secure Culinary Playground</span>
            <span>•</span>
            <span>Local Buffer Only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}