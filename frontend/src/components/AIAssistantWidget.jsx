import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, Globe, RefreshCw, AlertCircle, User, ShieldAlert, Heart, Calendar, PlusCircle, Activity } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🌐' },
  { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'es', label: 'Español (Spanish)', flag: '🇪🇸' }
];

const INITIAL_WELCOME = {
  en: "Hello! I am your **RaktSaarthi Smart AI Assistant**. How can I help you today with blood requests, live availability, donor eligibility, or Thalassemia care?",
  hi: "नमस्ते! मैं आपका **रक्तसारथी स्मार्ट AI सहायक** हूँ। मैं आज आपकी रक्त अनुरोधों, लाइव स्टॉक, या रक्तदान में कैसे सहायता कर सकता हूँ?",
  pa: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ **ਰਕਤਸਾਰਥੀ AI ਸਹਾਇਕ** ਹਾਂ। ਮੈਂ ਅੱਜ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
  bn: "হ্যালো! আমি আপনার **রক্তসারথী স্মার্ট AI সহকারী**। রক্তের অনুরোধ, লাইভ স্টক বা যোগ্যতার বিষয়ে কীভাবে সাহায্য করতে পারি?",
  es: "¡Hola! Soy su **Asistente Inteligente de RaktSaarthi**. ¿En qué puedo ayudarle hoy con solicitudes de sangre o disponibilidad?"
};

const AIAssistantWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: INITIAL_WELCOME.en,
      timestamp: new Date()
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update welcome message when language changes if no custom user message sent yet
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (messages.length <= 1) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: INITIAL_WELCOME[newLang] || INITIAL_WELCOME.en,
          timestamp: new Date()
        }
      ]);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    setError('');
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setLoading(true);

    try {
      const res = await API.post('/ai/chat', {
        query,
        language
      });

      if (res.data.success) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.data.reply,
          intent: res.data.intent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setError(res.data.message || 'Failed to fetch AI response.');
      }
    } catch (err) {
      console.error('AI Widget Error:', err);
      setError(err.response?.data?.message || 'RaktSaarthi AI service temporarily unavailable. Please click retry.');
    } finally {
      setLoading(false);
    }
  };

  const formatMessageText = (text) => {
    // Simple markdown formatting for bold **text** and bullet points
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={i > 0 ? 'mt-1' : ''}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blood-600 via-rose-600 to-slate-900 text-white rounded-2xl shadow-2xl hover:shadow-blood-500/30 transition-all hover:scale-105 border border-white/20"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900"></span>
          </div>
          <div className="text-left hidden sm:block">
            <span className="block font-black text-xs tracking-tight">RaktSaarthi AI</span>
            <span className="block text-[9px] text-blood-200 font-semibold uppercase tracking-wider">Multilingual Assistant</span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-300 opacity-90 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Main Collapsible Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-2.5rem)] sm:w-96 h-[34rem] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blood-950 px-4 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blood-600 text-white flex items-center justify-center shadow-md shadow-blood-950">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 leading-tight">
                  RaktSaarthi AI
                  <span className="px-1.5 py-0.5 bg-blood-500/20 text-blood-300 text-[9px] font-mono rounded border border-blood-500/30">
                    2.0 Pro
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Smart Healthcare & Emergency Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Suggestions Bar */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => handleSendMessage("Where can I see my blood request status?")}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blood-400 rounded-lg text-[10px] font-bold text-slate-700 whitespace-nowrap shadow-2xs transition-colors shrink-0"
            >
              📋 Track Request
            </button>
            <button
              onClick={() => handleSendMessage("Check live blood availability")}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blood-400 rounded-lg text-[10px] font-bold text-slate-700 whitespace-nowrap shadow-2xs transition-colors shrink-0"
            >
              🩸 Live Stock
            </button>
            <button
              onClick={() => handleSendMessage("Am I eligible to donate blood?")}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blood-400 rounded-lg text-[10px] font-bold text-slate-700 whitespace-nowrap shadow-2xs transition-colors shrink-0"
            >
              ❤️ Donor Eligibility
            </button>
            <button
              onClick={() => handleSendMessage("Tell me about Thalassemia Care")}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blood-400 rounded-lg text-[10px] font-bold text-slate-700 whitespace-nowrap shadow-2xs transition-colors shrink-0"
            >
              🗓️ Thalassemia
            </button>
          </div>

          {/* Messages Trajectory */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser ? 'bg-slate-900 text-white' : 'bg-blood-600 text-white shadow-sm'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                    isUser 
                      ? 'bg-slate-900 text-white rounded-tr-xs' 
                      : m.intent === 'MEDICAL_SAFETY'
                        ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                  }`}>
                    {formatMessageText(m.text)}
                    <span className={`block text-[9px] mt-1 text-right font-mono ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <RefreshCw className="w-4 h-4 animate-spin text-blood-600" />
                <span className="font-semibold">RaktSaarthi AI is thinking...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input & Action Bar */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask RaktSaarthi AI in any language..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blood-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="w-10 h-10 bg-blood-600 hover:bg-blood-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0 shadow-md shadow-blood-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-center text-slate-400 mt-1.5 font-medium">
              Medical Safety Active • Coordinates Platform & Stock Requests
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
