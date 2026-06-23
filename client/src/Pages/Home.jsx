import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Zap, Brain, Code2, FileText, Mail, Hash,
  MessageSquare, ChefHat, BookOpen, Database, Key, User,
  HelpCircle, Laugh, ArrowRight, Star, Shield, Globe,
  Search, Sliders, Play, Copy, Check, RefreshCw, 
  Terminal, Share2, Info, CheckCircle2, ChevronRight, X, Layers, Activity
} from 'lucide-react';

// Brand Colors matched precisely from the logo.png:
// - Left 'M' leg & highlights: Magenta (#b5179e)
// - Mid-bend & primary accents: Deep Purple / Violet (#7209b7)
// - Right leg: Royal Blue (#4895ef) / Cyan (#4cc9f0)
const BRAND_PURPLE = "#7209b7";
const BRAND_MAGENTA = "#b5179e";
const BRAND_GRADIENT = "from-[#b5179e] via-[#7209b7] to-[#4895ef]";
const LIGHT_PURPLE_BG = "rgba(114, 9, 183, 0.05)";


const FEATURES_DATA = [
  { 
    id: 'text-summarizer', 
    icon: FileText, 
    label: 'Text Summarizer', 
    desc: 'Distill lengthy corporate reports or research articles into elegant, actionable key insights.', 
    category: 'Writing', 
    color: 'from-[#b5179e] to-[#7209b7]', 
    shadowColor: 'rgba(114, 9, 183, 0.15)',
    placeholder: 'Paste your long text, project updates, or research abstract here...',
    preset: 'Artificial Intelligence (AI) has advanced significantly over the past decade. Deep learning models, particularly large language models based on the transformer architecture, are now capable of generating human-like text, writing production code, and solving complex reasoning problems. However, this raises important ethical questions regarding copyright, misinformation, and workforce transformation.',
    generator: (input, tone, length) => {
      const bulletStyle = tone === 'Professional' ? '•' : '🔮';
      const detailMsg = length === 'Detailed' ? 'Includes comprehensive contextual implications and downstream structural shifts.' : 'High-level synthesis.';
      return `### 📝 Executive Summary\n${tone === 'Professional' ? 'An analytical overview' : 'A crisp breakdown'} of the provided literature regarding cutting-edge AI shifts. ${detailMsg}\n\n### 🔑 Key Takeaways\n${bulletStyle} **Core Advancement:** Deep learning and transformers are catalyzing human-tier language and logic processing capability.\n${bulletStyle} **Downstream Impact:** Broad disruption ranging from enterprise system automation to creative workflows.\n${bulletStyle} **Ethical Safeguards:** Urgent need for robust frameworks targeting copyright validation and output attribution.\n\n### 💡 Actionable Advice\nEvaluate modern API adapters for workflow enhancement rather than fighting structural change. Keep human-in-the-loop validation active.`;
    },
    navigation_link:'/text-summarizer'
  },
  { 
    id: 'grammar-checker', 
    icon: Brain, 
    label: 'Grammar Checker', 
    desc: 'Polish prose with contextual fixes, refined stylistic cadence, and active voice adjustments.', 
    category: 'Writing', 
    color: 'from-[#7209b7] to-[#4895ef]', 
    shadowColor: 'rgba(72, 149, 239, 0.15)',
    placeholder: 'Enter text containing mistakes or awkward phrasing...',
    preset: 'Their is a lot of people which goes to the office everyday but they dont realize that remote working are much more better.',
    generator: (input, tone, length) => {
      return `### 🔍 Grammar Analysis & Correction\n\n**Original:**\n> *"${input}"*\n\n**✨ Enhanced Version (${tone} Style):**\n> "There are many people who commute to the office daily, yet they may not realize that remote work offers substantial advantages."\n\n### 🛠️ Key Improvements Made\n1. **Subject-Verb Agreement:** Adjusted "remote working are" to "remote work offers".\n2. **Homophone Corrected:** Changed "Their" to "There" to correctly denote existence.\n3. **Pronoun Choice:** Changed "people which" to "people who" for grammatically correct reference to human subjects.\n4. **Stylistic Polish:** Upgraded "much more better" to "substantial advantages" for enhanced clarity and cadence.`;
    },
     navigation_link:'/grammar-checker'
  },
  { 
    id: 'email-writer', 
    icon: Mail, 
    label: 'Email Writer', 
    desc: 'Draft tailored outreach, follow-ups, or announcements in seconds.', 
    category: 'Writing', 
    color: 'from-[#4895ef] to-[#4cc9f0]', 
    shadowColor: 'rgba(76, 201, 240, 0.15)',
    placeholder: 'Briefly state the goal of the email (e.g., asking for a project deadline extension)...',
    preset: 'Ask Sarah for a 2-day extension on the Q2 marketing slides because of unexpected server migration delays.',
    generator: (input, tone, length) => {
      const greeting = tone === 'Professional' ? 'Dear Sarah,' : 'Hi Sarah!';
      const signoff = tone === 'Professional' ? 'Sincerely,\n[Your Name]' : 'Best,\n[Your Name]';
      return `### ✉️ Drafted Email Proposal\n\n**Subject:** ${tone === 'Professional' ? 'Proposed Schedule Update: Q2 Marketing Slides' : 'Quick heads up: Q2 Marketing Deck timing'}\n\n${greeting}\n\nI hope you are having a productive week. I am reaching out to request a brief two-day extension on the upcoming Q2 marketing presentation slides.\n\nDue to unexpected server migration operations that required my active engineering support, I need a bit more buffer to compile the market performance statistics to our usual standard of accuracy. \n\nI plan to deliver the finalized deck by Thursday morning instead of Tuesday. Thank you for your flexibility and support.\n\n${signoff}`;
    },
    navigation_link:'/email-writer'
  },
  { 
    id: 'blog-title-generator', 
    icon: BookOpen, 
    label: 'Blog Title Generator', 
    desc: 'Generate high-converting, click-worthy, and SEO-optimized headlines.', 
    category: 'Writing', 
    color: 'from-[#b5179e] to-[#4895ef]', 
    shadowColor: 'rgba(181, 23, 158, 0.15)',
    placeholder: 'Enter your core topic or primary keyword...',
    preset: 'Learning CSS Grid in 2026',
    generator: (input, tone, length) => {
      return `### 💡 High-Converting Blog Titles for: *"${input}"*\n\nHere are highly optimized headlines designed to maximize CTR (Click-Through-Rates):\n\n#### ⚡ Analytical / Guide Titles\n- **The Ultimate Guide to ${input}: From Novice to Advanced Architect**\n- **Why You\\'re Still Struggling with ${input} (And How to Fix It in 5 Minutes)**\n\n#### 📈 SEO / Click-Driven Titles\n- **10 ${input} Best Practices Every Developer Must Master This Year**\n- **How I Used ${input} to Boost My Workflow Efficiency by 140%**\n\n#### 🔥 Casual / Bold Hooks\n- **Stop Avoiding ${input}: Here Is the Modern Roadmap You Actually Need**`;
    },
    navigation_link:'/blog-title-generator'
  },
  { 
    id: 'hashtag-generator', 
    icon: Hash, 
    label: 'Hashtag Generator', 
    desc: 'Find trending tags for social channels to boost organic reach and views.', 
    category: 'Social', 
    color: 'from-[#7209b7] to-[#4cc9f0]', 
    shadowColor: 'rgba(114, 9, 183, 0.15)',
    placeholder: 'Describe your post, video, or campaign topic...',
    preset: 'Launching a new React SaaS boiler-plate template with modular state styling',
    generator: (input, tone, length) => {
      return `### 🏷️ Optimized Hashtag Suite\n\nBased on your prompt: *"${input}"*, we have generated high-performing tags segmented by reach volume:\n\n### 🚀 High-Volume Tags (Broad Reach)\n\`#SaaS\` \`#WebDevelopment\` \`#ReactJS\` \`#TechStartup\` \`#Coding\`\n\n### 🎯 Niche / High-Intent Tags\n\`#Solopreneur\` \`#IndieHackers\` \`#React19\` \`#JavascriptDeveloper\` \`#TailwindCSS\`\n\n### 💡 Strategy Suggestion\nUse 2 broad tags, 5 highly focused niche tags, and 1 branded tag in your first comment for maximum algorithm delivery.`;
    },
    navigation_link:'/hashtag-generator'
  },
  { 
    id: 'interview-prep', 
    icon: MessageSquare, 
    label: 'Interview Questions', 
    desc: 'Receive tailored interview questions with ideal bulleted guidelines.', 
    category: 'Career', 
    color: 'from-[#b5179e] to-[#4cc9f0]', 
    shadowColor: 'rgba(76, 201, 240, 0.15)',
    placeholder: 'Enter job title or specific company role...',
    preset: 'Staff Frontend Engineer at Google',
    generator: (input, tone, length) => {
      return `### 👔 Interview Simulation: *${input}*\n\nHere is a target-focused interview question tailored to this role, along with structural answering advice:\n\n#### ❓ The Question\n> *"Explain how you would architect a resilient, highly responsive real-time client feed that handles massive websocket packet bursts without degrading paint performance or locking the main UI thread."*\n\n#### 🎯 Key Talking Points to Hit\n- **Render Throttling:** Utilizing \`requestAnimationFrame\` or virtualized windows to decouple DOM updates from socket stream ticks.\n- **Web Workers:** Moving heavy computation, JSON parsing, or sorting off the UI thread.\n- **Batching:** Accumulating feed packets in memory and releasing them in consistent render ticks.\n- **State Isolation:** Minimizing parent component re-renders.`;
    },
    navigation_link:'/interview-question-generator'
  },
  { 
    id: 'cover-letter-generator', 
    icon: FileText, 
    label: 'Cover Letter Maker', 
    desc: 'Create personalized, compelling letters matching modern job descriptions.', 
    category: 'Career', 
    color: 'from-[#7209b7] to-[#4895ef]', 
    shadowColor: 'rgba(114, 9, 183, 0.15)',
    placeholder: 'Enter target job title and your top 2 skills...',
    preset: 'Fullstack Developer at Stripe, specializing in React and Node.js microservices',
    generator: (input, tone, length) => {
      return `### 📄 Tailored Cover Letter\n\n**To the Hiring Committee at Stripe,**\n\nI am writing to express my enthusiastic interest in the Fullstack Developer role. With a proven track record of constructing hyper-scalable web architectures and designing robust payment interfaces, I have long admired Stripe\\'s commitment to developer-centric engineering.\n\nThroughout my career, I have specialized in shipping clean, optimized React interfaces backed by robust Node.js microservices. In my previous role, I led a migration that improved platform load speed by 35% and scaled transactional throughput securely.\n\nI look forward to the possibility of discussing how my technical skills can help power the global financial infrastructure. Thank you for your time and consideration.\n\nSincerely,  \n[Your Name]`;
    },
    navigation_link:'/cover-letter-generator'
  },
  { 
    id: 'code-explainer', 
    icon: Code2, 
    label: 'Code Explainer', 
    desc: 'Translate convoluted, cryptic code scripts into clear plain English.', 
    category: 'Developer', 
    color: 'from-[#b5179e] to-[#7209b7]', 
    shadowColor: 'rgba(181, 23, 158, 0.15)',
    placeholder: 'Paste your code block here...',
    preset: 'const memoize = (fn) => {\n  const cache = {};\n  return (...args) => {\n    const key = JSON.stringify(args);\n    return key in cache ? cache[key] : (cache[key] = fn(...args));\n  };\n};',
    generator: (input, tone, length) => {
      return `### 💻 Code Explanation\n\nThis snippet implements a classic **memoization wrapper function** (a design pattern for caching computation outputs).\n\n### ⚙️ How it Works Step-by-Step\n1. **Caching Store (\`cache\`):** Declares a private, persistent dictionary closure object to store previously computed values.\n2. **Spread Operator (\`...args\`):** Captures any arguments passed to the returned memoized function dynamically.\n3. **String Serialization Key (\`JSON.stringify\`):** Converts input arguments into a string key so it can be indexed cleanly.\n4. **Cache Lookup:** Checks if the key exists inside the object. If yes, it bypasses computation and returns the cached result immediately.\n5. **Lazy Execution:** If the key is missing, it evaluates the base function, caches the result, and returns it.`;
    },
    navigation_link:'/code-explainer'
  },
  { 
    id: 'sql-query-generator', 
    icon: Database, 
    label: 'SQL Generator', 
    desc: 'Transform plain-English database requests into optimized SQL queries.', 
    category: 'Developer', 
    color: 'from-[#4895ef] to-[#4cc9f0]', 
    shadowColor: 'rgba(72, 149, 239, 0.15)',
    placeholder: 'Describe your query (e.g., users registered this month with over 10 orders)...',
    preset: 'Find all customers who bought a subscription product in 2026, ordering descending by total spent.',
    generator: (input, tone, length) => {
      return `### 🗄️ Generated SQL Query\n\nHere is your query matching your criteria, complete with indexes suggestions for large scales:\n\n\`\`\`sql\nSELECT \n    c.customer_id,\n    c.first_name,\n    c.email,\n    SUM(o.total_amount) AS total_spent\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nJOIN subscriptions s ON o.order_id = s.order_id\nWHERE s.activated_at BETWEEN '2026-01-01 00:00:00' AND '2026-12-31 23:59:59'\nGROUP BY c.customer_id, c.first_name, c.email\nORDER BY total_spent DESC;\n\`\`\`\n\n### ⚡ Performance Optimization Tip\nEnsure you have a composite index on \`subscriptions(activated_at, order_id)\` to guarantee logarithmic query evaluation times on heavy databases.`;
    },
    navigation_link:'/sql-query-generator'
  },
  { 
    id: 'jwt-token-generator', 
    icon: Key, 
    label: 'JWT Generator', 
    desc: 'Simulate, build, or decode JSON Web Tokens for fast secure API testing.', 
    category: 'Developer', 
    color: 'from-[#7209b7] to-[#4cc9f0]', 
    shadowColor: 'rgba(76, 201, 240, 0.15)',
    placeholder: 'Specify key payload parameters (e.g., username, role, scope)...',
    preset: 'userId: usr_99, role: admin, scope: [write:users, delete:orders]',
    generator: (input, tone, length) => {
      return `### 🔑 Simulated JWT Token Payload\n\nThis simulates a secure JSON Web Token generation used to secure modern microservice APIs:\n\n### 🛡️ Header (Algorithm & Token Type)\n\`\`\`json\n{\n  "alg": "HS256",\n  "typ": "JWT"\n}\n\`\`\`\n\n### 📦 Payload Data\n\`\`\`json\n{\n  "sub": "usr_99",\n  "name": "Administrator",\n  "role": "admin",\n  "scope": "write:users delete:orders",\n  "iat": 1782206400,\n  "exp": 1782292800\n}\n\`\`\`\n\n### 🔒 Simulated Encoded Token String\n\`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOTkiLCJuYW1lIjoiQWRtaW5pc3RyYXRvciIsInR5cCI6IkpXVCJ9.SFlfX-1f_SignaturePlaceholderForTestPurpose\``;
    },
    navigation_link:'/jwt-token-generator'
  },
  { 
    id: 'name-generator', 
    icon: User, 
    label: 'Brand Name Generator', 
    desc: 'Brainstorm memorable, brandable names for startups, services, or products.', 
    category: 'Utility', 
    color: 'from-[#b5179e] to-[#4cc9f0]', 
    shadowColor: 'rgba(181, 23, 158, 0.15)',
    placeholder: 'Enter keywords, industry, or vibes of your business...',
    preset: 'Eco-friendly smart home energy monitoring device',
    generator: (input, tone, length) => {
      return `### 💡 Brand Name Suggestions\n\nHere are targeted brand name brainstorms crafted around sustainability and technological integration:\n\n- **🍃 Voltura:** Blends Voltage and Nature. Sounds premium and established.\n- **⚡ GreenSync:** Functional, action-oriented. Great for an app interface.\n- **🪵 HabitatIQ:** Modern IoT vibe focusing on intelligent residential ecosystems.\n- **🌿 EverGrid:** Implies reliable, infinite renewable power storage solutions.\n- **🌿 GreenPeak:** Highlights high metrics, optimized parameters, and ecosystem limits.`;
    },
    navigation_link:'/name-generator'
  },
  { 
    id: 'quiz-generator', 
    icon: HelpCircle, 
    label: 'Quiz Generator', 
    desc: 'Instantly build custom quizzes with structural answer keys on any subject.', 
    category: 'Utility', 
    color: 'from-[#7209b7] to-[#4895ef]', 
    shadowColor: 'rgba(114, 9, 183, 0.15)',
    placeholder: 'What subject or topic should the quiz test? (e.g. basics of astrophysics)...',
    preset: 'JavaScript ES6 asynchronous mechanisms',
    generator: (input, tone, length) => {
      return `### 🧠 Custom Knowledge Quiz: *${input}*\n\n#### Q1: Which statement correctly describes the status lifecycle of a Javascript Promise?\n- **A)** It starts as pending, then transitions either to resolved or rejected, and can loop back.\n- **B)** It starts as pending, then permanently settles as fulfilled or rejected.\n- **C)** It starts as active and transitions to complete.\n- **D)** It can only transition when bound to a web worker.\n\n**✅ Correct Answer:** **B**\n*Explanation:* Promises are state-machines that settle permanently once resolved or rejected. They cannot change state afterwards.`;
    },
    navigation_link:'/quiz-generator'
  },
  { 
    id: 'joke-generator', 
    icon: Laugh, 
    label: 'Joke Generator', 
    desc: 'Lighten the workspace atmosphere with clean, context-specific witty jokes.', 
    category: 'Fun', 
    color: 'from-[#b5179e] to-[#4895ef]', 
    shadowColor: 'rgba(181, 23, 158, 0.15)',
    placeholder: 'Give a theme or target audience (e.g., programmers, cooks, coffee lovers)...',
    preset: 'Frustrated Web Developers',
    generator: (input, tone, length) => {
      return `### 🎭 Handcrafted Developer Humour\n\n**The Setup:**\nWhy did the senior CSS developer refuse to sit at the shared lunch table?\n\n**The Delivery:**\nBecause they couldn\\'t find a parent container that had absolute positioning, and they were terrified of overlapping with another element\\'s box model!\n\n*(Ba-dum-tss! 🥁)*\n\n**Bonus Quickie:**\nThere are 10 kinds of people in the world. Those who understand binary, and those who get dates.`;
    },
    navigation_link:'/joke-generator'
  },
  { 
    id: 'recipe-generator', 
    icon: ChefHat, 
    label: 'Recipe Generator', 
    desc: 'Convert standard fridge ingredients into quick culinary masterworks.', 
    category: 'Fun', 
    color: 'from-[#4895ef] to-[#4cc9f0]', 
    shadowColor: 'rgba(76, 201, 240, 0.15)',
    placeholder: 'List items available in your kitchen (e.g. eggs, avocados, bread)...',
    preset: 'Salmon, spinach, garlic cloves, cream, pasta',
    generator: (input, tone, length) => {
      return `### 🧑‍🍳 Gourmet Creation: *Garlic-Cream Salmon Pasta*\n\nAn elegant, high-protein skillet meal ready in under 20 minutes!\n\n### 🛒 Ingredients Needed\n- Pan-seared Salmon fillets (flaked)\n- Al dente pasta (Fettuccine or Penne)\n- 3 Garlic cloves (minced)\n- 1 cup Heavy Cream\n- 2 cups Fresh Spinach\n\n### 🍳 Step-by-Step Directions\n1. **Sauté the Aromatics:** Heat olive oil in a skillet, gently toast the minced garlic for 1 minute until fragrant.\n2. **Build the Sauce:** Pour in the heavy cream. Bring to a gentle simmer, then fold in the spinach until wilted.\n3. **Combine:** Toss in the cooked pasta and flaked salmon, stirring gently to coat without breaking the salmon too much.\n4. **Serve:** Garnish with fresh cracked black pepper and parmesan cheese.`;
    },
    navigation_link:'/recipe-generator'
  },
  { 
    id: 'story-generator', 
    icon: BookOpen, 
    label: 'Story Generator', 
    desc: 'Weave mesmerizing fictional prose based on creative character details.', 
    category: 'Fun', 
    color: 'from-[#b5179e] to-[#7209b7]', 
    shadowColor: 'rgba(181, 23, 158, 0.15)',
    placeholder: 'Describe a protagonist, setting, and core conflict...',
    preset: 'A clockmaker in 18th century London who discovers a tiny ticking battery from the future.',
    generator: (input, tone, length) => {
      return `### 📖 The Ticking Hourglass\n\nThe candle sputtered in the cold damp drafts of London, 1784. Alistair adjusted his brass eyepiece, his fingers steady as he pried open the gears of an intricate French pocket watch. \n\nAmong the standard hand-cut brass gears, something was wrong. Trapped within the escapement sat a tiny, seamless silver cylinder. It bore no maker's mark, yet it hummed with a microscopic current that pulsed at exactly one beat per microsecond. \n\n"It is not clockwork," Alistair whispered to the empty room. He touched the metal with his tweezers. A spark of brilliant blue light jumped to the brass clock plate, and suddenly, the watch began to spin backward, rewriting time one second at a time.`;
    },
    navigation_link:'/story-generator'
  }
];

const STATS_DATA = [
  { value: '15+', label: 'AI Power Modules', icon: Zap },
  { value: 'Gemini 2.5', label: 'Linguistic Engine', icon: Brain },
  { value: '0.00$', label: '100% Free Workspace', icon: Star },
  { value: '< 1.1s', label: 'Average Latency', icon: Sparkles }
];

function AnimatedCounter({ target, duration = 1200 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const isNum = !isNaN(parseFloat(target));
        if (!isNum) {
          setCount(target);
          return;
        }
        const end = parseFloat(target);
        let startTime = null;
        const step = (ts) => {
          if (!startTime) startTime = ts;
          const progress = Math.min((ts - startTime) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const suffix = target.replace(/[0-9.]/g, '');
  return (
    <span ref={ref} className="font-extrabold tracking-tight">
      {isNaN(parseFloat(target)) ? target : `${count}${suffix}`}
    </span>
  );
}




export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTool, setSelectedTool] = useState(FEATURES_DATA[0]);
  const [promptInput, setPromptInput] = useState(FEATURES_DATA[0].preset);
  const [simulatedOutput, setSimulatedOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generationTime, setGenerationTime] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Dashboard generation hyperparameters
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Detailed');
  const [temperature, setTemperature] = useState(0.7);


  // Soft mouse-glow vector tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

 const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 25,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 25,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const selectTool = (tool) => {
    setSelectedTool(tool);
    setPromptInput(tool.preset);
    setSimulatedOutput('');
    setHasGenerated(false);
  };

const navigation=(navigation_link)=>{
    navigate(navigation_link)
}
  const filteredTools = useMemo(() => {
    return FEATURES_DATA.filter((tool) => {
      const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
      const matchesQuery = tool.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           tool.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tool.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

  const runSimulation = () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    setSimulatedOutput('');
    setHasGenerated(false);
    
    const start = performance.now();
    const finalResponse = selectedTool.generator(promptInput, tone, length);
    
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
      const end = performance.now();
      setGenerationTime(((end - start) / 10 + 310).toFixed(0));

      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < finalResponse.length) {
          setSimulatedOutput(prev => prev + finalResponse.charAt(currentIdx));
          currentIdx += 2;
        } else {
          clearInterval(interval);
        }
      }, 3);
    }, 1000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(simulatedOutput);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="min-h-screen w-screen bg-white text-slate-800 selection:bg-[#7209b7]/10 selection:text-[#7209b7] font-sans antialiased overflow-x-hidden">
      
      {/* ─── AMBIENT BRAND LIGHT GLOWS (No dark backgrounds, purely light, elegant) ─── */}
      <div className="absolute top-0 left-0 right-0 h-[680px] overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-[0.06] transition-transform duration-500"
          style={{ 
            transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)`,
            background: `radial-gradient(circle, ${BRAND_PURPLE} 0%, ${BRAND_MAGENTA} 70%)`
          }}
        />
        <div 
          className="absolute top-20 right-0 w-[450px] h-[450px] rounded-full filter blur-[110px] opacity-[0.05] transition-transform duration-700"
          style={{ 
            transform: `translate(${-mousePos.x * 0.2}px, ${-mousePos.y * 0.2}px)`,
            background: 'radial-gradient(circle, #4895ef 0%, #4cc9f0 70%)'
          }}
        />
        {/* Crisp grid lines for high-tech premium feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f050_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f050_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
      </div>

      {/* ─── STICKY HEADER WITH VERBATIM LOGO ON LEFT SIDE ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand on Left Side */}
          <div className="flex items-center gap-3.5">
            <div className="relative p-1 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs hover:scale-102 transition-transform duration-200">
              <img 
                src="logo.png" 
                alt="MagicPrompt Logo" 
                className="w-10 h-10 object-contain" 
                onError={(e) => {
                  // Fallback in case of asset fetch anomalies in standard test rigs
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-[#b5179e] via-[#7209b7] to-[#4895ef]">
                MagicPrompt
              </span>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 mt-1 uppercase">
                Enterprise Dashboard
              </span>
            </div>
          </div>

          {/* Core System Live Metrics */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System: <strong className="text-[#7209b7]">Active</strong></span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#b5179e]" />
              <span>Model: <strong className="text-slate-700">Gemini-2.5-Flash</strong></span>
            </div>
          </div>

          {/* Quick Right Side Links */}
          <div className="flex items-center gap-4">
           
            <a 
              href="#tools-grid"
              className="inline-flex items-center gap-2 text-xs font-extrabold bg-[#7209b7] hover:bg-[#b5179e] text-white px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-all duration-200"
            >
              <Terminal className="w-3.5 h-3.5" />
              Visit tools
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION (PRISTINE WHITE BACKDROP, PURPLE ACCENTS) ─── */}
      <section ref={heroRef} className="relative z-10 max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Pitch Text */}
          <div className="lg:col-span-7 text-left pl-[40px]">
            
            {/* Soft Purple Badge */}
            <div className="inline-flex items-center gap-2 bg-[#7209b7]/5 border border-[#7209b7]/10 text-[#7209b7] text-xs font-bold px-3.5 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#b5179e]" />
              <span>Corporate Redesign & Branding Suite</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0]" />
              <span>Color-Matched Dashboard v2.5</span>
            </div>

            {/* Main Title - Words Highlighted in Purple/Magenta */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-slate-900 mb-6">
              One Corporate Prompt,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#b5179e] via-[#7209b7] to-[#4895ef]">
                Infinite AI Possibilities
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed">
              MagicPrompt is an all-in-one AI platform. Streamline workflows across <strong className="text-[#7209b7]">15 powerful features</strong> with optimized parameters, speed metrics, and responsive tone controls.
            </p>

            {/* Quick Action Triggers */}
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full max-w-md">
              <a 
                href="/text-summarizer" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#7209b7] hover:bg-[#b5179e] text-white px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 transition-all duration-200 text-sm font-bold"
              >
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                Enter Text summarizer 
              </a>
              <a 
                href="#tools-grid" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-[#7209b7] hover:text-[#7209b7] bg-white text-slate-700 px-7 py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200 text-sm font-bold"
              >
                <span>Explore 15 Tools</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Tech Badges with Purple Highlights */}
            <div className="flex items-center gap-3 mt-8 flex-wrap">
              <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Built with</span>
              {['React 19', 'Tailwind', 'Google Gemini AI', 'Lucide Framework'].map((tech) => (
                <span 
                  key={tech} 
                  className="bg-slate-50 border border-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium hover:border-[#7209b7]/30 transition-all"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Hero Branding Frame - Incorporating logo.png beautifully on the Right */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[#7209b7]/5 rounded-3xl opacity-50 filter blur-2xl pointer-events-none" />
            
            <div className="relative p-6 rounded-3xl border border-slate-100 bg-white shadow-xl max-w-sm w-full transition-all duration-300 hover:shadow-2xl">
              
              {/* Minimal Card Header with Purple Logo accents */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="text-[10px] font-bold text-[#7209b7] uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#b5179e]" />
                  Active Workspace
                </div>
              </div>

              {/* Central Logo Spotlight */}
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-purple-100 rounded-2xl bg-slate-50/50 mb-4">
                <div className="relative w-28 h-28 flex items-center justify-center mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
                  <img 
                    src="logo.png" 
                    alt="MagicPrompt Showcase" 
                    className="w-20 h-20 object-contain relative z-10"
                  />
                  <div className="absolute inset-0 rounded-2xl border border-[#7209b7]/25 animate-pulse" />
                </div>
                
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  Brand Color Palette
                </h3>
                
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="w-4 h-4 rounded bg-[#b5179e]" title="Magenta leg" />
                  <span className="w-4 h-4 rounded bg-[#7209b7]" title="Main Purple" />
                  <span className="w-4 h-4 rounded bg-[#4895ef]" title="Royal Blue" />
                  <span className="w-4 h-4 rounded bg-[#4cc9f0]" title="Cyan highlight" />
                </div>
              </div>

              {/* Micro specs */}
              <p className="text-[11px] text-slate-400 text-center">
                Fully dynamic color-matched console interface matching the corporate visual guidelines.
              </p>

            </div>
          </div>

        </div>
      </section>

      {/* ─── LIVE TELEMETRY / METRICS GRID (WHITE BOXES WITH SOFT SHADOWS) ─── */}
      <section className="relative z-10 max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-3xl border border-slate-100 bg-white shadow-xs">
          {STATS_DATA.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center lg:items-start p-4 text-center lg:text-left">
              <div className="p-3 rounded-2xl bg-[#7209b7]/5 text-[#7209b7] mb-3 border border-[#7209b7]/5">
                <Icon className="w-5 h-5 text-[#7209b7]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-0.5">
                <AnimatedCounter target={value} />
              </div>
              <div className="text-xs text-slate-400 font-bold tracking-wider uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ALL 15 FEATURES CATALOGUE (WHITE CARD SHADOWS, PURPLE HOVER ACCENTS) ─── */}
      <section id="tools-grid" className="relative z-10 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-slate-100 pb-8">
          <div className="text-center md:text-left">
            <span className="text-[#7209b7] text-xs font-extrabold tracking-widest uppercase mb-2 block">
              Complete Catalogue
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Explore All <span className="text-[#7209b7]">15 AI Features</span>
            </h2>
            <p className="text-slate-500 mt-1 max-w-xl text-sm">
              Each module features dynamic tone modifiers, live state simulation, and instant responses.
            </p>
          </div>

          {/* Search Feature */}
          <div className="relative w-full md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </div>
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7209b7]/40 bg-slate-50 border border-slate-150 text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-8">
          {['All', 'Writing', 'Social', 'Career', 'Developer', 'Utility', 'Fun'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                activeCategory === category
                  ? 'bg-[#7209b7] text-white shadow-md'
                  : 'bg-slate-50 hover:bg-[#7209b7]/5 hover:text-[#7209b7] border border-slate-100 text-slate-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Highlighted Tool Cards */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isCurrentTool = selectedTool.id === tool.id;
              return (
                <div 
                  key={tool.id}
                  onClick={() => {
                    selectTool(tool);
                    document.getElementById('sandbox')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                    isCurrentTool 
                      ? 'border-[#7209b7] bg-[#7209b7]/5 shadow-lg scale-[1.01]' 
                      : 'bg-white border-slate-200 hover:border-[#7209b7] hover:shadow-lg hover:scale-[1.01]'
                  }`}
                >
                  {/* Subtle Background Glow Accent matching tool color */}
                <div   className={`absolute inset-0 rounded-3xl bg-gradient-to-tr ${tool.color} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300 pointer-events-none`} />

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 text-[#7209b7] flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-gradient-to-tr group-hover:from-[#7209b7] group-hover:to-[#b5179e] group-hover:text-white transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-[#7209b7]">
                      {tool.category}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 group-hover:text-[#7209b7] transition-colors duration-200">
                    {tool.label}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mt-2 line-clamp-3">
                    {tool.desc}
                  </p>

                  <div onClick={()=>navigation(tool.navigation_link)} className="flex items-center gap-2 mt-5 text-xs font-extrabold text-[#7209b7] opacity-80 group-hover:opacity-100 transition-all">
                    <span >Launch in Sandbox</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400 mb-4 animate-pulse">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No AI tools found</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Try adjusting your query or resetting filters to show all modules.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="mt-4 text-xs font-bold bg-[#7209b7] hover:bg-[#b5179e] text-white px-4 py-2.5 rounded-xl"
            >
              Reset Search Filter
            </button>
          </div>
        )}
      </section>

      {/* ─── TECHNICAL ARCHITECTURE DEEP DIVE (WHITE WITH PURPLE DETAILS) ─── */}
      <section className="relative z-10 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-8 sm:p-12 rounded-3xl border border-slate-100 bg-slate-50/50 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Visual branding highlighting the logo */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center text-center">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                
                {/* Rotating accent frames */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#7209b7]/20 animate-spin" style={{ animationDuration: '45s' }} />
                <div className="absolute inset-6 rounded-full border border-dashed border-[#b5179e]/20 animate-spin" style={{ animationDuration: '22s', animationDirection: 'reverse' }} />
                
                <div className="relative z-10 w-36 h-36 rounded-3xl bg-white flex items-center justify-center shadow-md p-4 border border-slate-100">
                  <img src="logo.png" alt="MagicPrompt Symbol" className="w-24 h-24 object-contain" />
                </div>
              </div>
            </div>

            {/* Right Column: Key technical specifications */}
            <div className="lg:col-span-7">
              <span className="text-[#7209b7] text-xs font-extrabold tracking-widest uppercase mb-2 block">
                Technical Blueprint
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                Structured for Clean Linguistic Performance
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed">
                We've synchronized our interactive engine with localized state structures to reduce standard server delays and maximize client privacy. Highlighting the power of Google Gemini 2.5 Flash algorithms.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Zero-Storage Privacy</h4>
                    <p className="text-xs text-slate-500 mt-1">Queries are evaluated entirely inside the client session sandbox. No servers retain sensitive credentials.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Prompt Engineering Logic</h4>
                    <p className="text-xs text-slate-500 mt-1">Preset structural constraints transform plain text requests into clean formatted responses.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── PREMIUM BRAND FOOTER ─── */}
      <footer className="relative z-10 border-t border-slate-100 bg-white">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Footer Logo Frame on the left */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 shadow-xs">
              <img src="logo.png" alt="MagicPrompt Emblem" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              MagicPrompt AI
            </span>
          </div>

          {/* Copyright Metadata */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-slate-400">
              © 2026 MagicPrompt. Handcrafted with beautiful purple branding elements.
            </p>
            <div className="flex items-center justify-center sm:justify-end gap-3 mt-1.5 text-[10px] text-slate-400 font-medium">
              <span>Google Gemini Integration</span>
              <span>•</span>
              <span>15 Enterprise Modules</span>
              <span>•</span>
              <span>Pure Client-Side Console</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}