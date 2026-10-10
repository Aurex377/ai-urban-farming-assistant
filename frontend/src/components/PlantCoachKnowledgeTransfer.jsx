import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  MessageSquare,
  BookOpen,
  Send,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Layers,
  Sun,
  Sprout,
  ShieldAlert,
  Users,
  Award,
  Zap,
} from 'lucide-react';
import { askPlantCoach, getPlantKnowledgeTransfer } from '../services/api';

const QUICK_PROMPTS = [
  { label: '💧 Irrigation & Topsoil Check', query: 'How much should I water today and how do I check soil moisture?' },
  { label: '✂️ Safe Pruning Technique', query: 'What is the safest way to prune or pinch this plant right now?' },
  { label: '🧪 Organic Pest & Disease Spray', query: 'What organic home remedy or spray is safe for my plant?' },
  { label: '🌤️ Heat & Humidity Advice', query: 'How does current weather impact leaf transpiration and sunlight needs?' },
  { label: '🌿 Companion Planting Guide', query: 'What companion plants should I grow nearby to deter urban pests?' },
];

const MODULE_ICONS = {
  Layers: Layers,
  Sun: Sun,
  Sprout: Sprout,
  ShieldAlert: ShieldAlert,
  Users: Users,
};

export default function PlantCoachKnowledgeTransfer({ plantId, plantName, species, diseaseName }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'knowledge'
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatScrollRef = useRef(null);

  // Knowledge Transfer state
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState(null);
  const [expandedModuleId, setExpandedModuleId] = useState(null);

  // Initialize coach welcoming message on plant change
  useEffect(() => {
    if (!plantId) return;

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Greetings! I am your **👑 Plant Coach**. I'm actively monitoring your **${plantName || 'Plant'}** (${species || 'urban specimen'}) with status **${diseaseName || 'Healthy'}**. Ask me anything about irrigation calibrations, organic treatments, pruning, or urban container biology!`,
        takeaway: 'Daily foliar observation and balanced root-zone hydrology prevent 90% of urban plant disorders.',
        action: 'Inspect topsoil moisture and check under leaf margins for early insect activity.',
        suggestedFollowUps: [
          'How much should I water today?',
          'What organic remedy prevents leaf diseases?',
          'How does container size affect my roots?'
        ],
        engine: 'NVIDIA Nemotron AI',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);

    // Load Knowledge Transfer Modules
    async function loadModules() {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      try {
        const data = await getPlantKnowledgeTransfer(plantId);
        setKnowledgeData(data);
        if (data?.modules?.length > 0) {
          setExpandedModuleId(data.modules[0].id);
        }
      } catch (err) {
        console.error('Error loading knowledge transfer:', err);
        setKnowledgeError('Unable to load botanical knowledge modules.');
      } finally {
        setKnowledgeLoading(false);
      }
    }

    loadModules();
  }, [plantId, plantName, species, diseaseName]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending || !plantId) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);
    setChatError(null);

    // Build history for context
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await askPlantCoach(plantId, query, historyPayload);
      const assistantMsg = {
        id: `coach-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        takeaway: res.knowledge_takeaway,
        action: res.actionable_step,
        suggestedFollowUps: res.suggested_follow_ups,
        engine: res.engine_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Plant Coach error:', err);
      setChatError(err.message || 'Plant Coach is momentarily unavailable.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden mb-10 transition-all">
      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-900 via-indigo-950 to-purple-950 text-white relative">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-amber-950 font-black text-sm shadow-sm flex items-center gap-1.5">
                👑 Master Plant Coach
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 border border-emerald-400/30 backdrop-blur-xs">
                NVIDIA Nemotron Botanical Intelligence
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              👑 Plant Coach + Knowledge Transfer
            </h2>
            <p className="text-xs md:text-sm text-indigo-200/90 max-w-2xl mt-1">
              Conversational urban agronomy, real-time diagnostic mentoring, and research-backed botanical masterclass modules for <strong>{plantName || 'your plant'}</strong>.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white/10 border border-white/15 rounded-2xl backdrop-blur-md self-start md:self-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Ask AI Coach</span>
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Knowledge Transfer (5)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8">
        {activeTab === 'chat' ? (
          <div>
            {/* Quick Prompt Chips */}
            <div className="mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Quick Botanical Inquiries:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    disabled={isSending}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 border border-indigo-200/60 transition-all cursor-pointer disabled:opacity-50 text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Thread Container */}
            <div
              ref={chatScrollRef}
              className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 md:p-6 h-[460px] overflow-y-auto space-y-4 mb-4 scroll-smooth"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl p-4 text-xs md:text-sm shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs'
                        : 'bg-white border border-indigo-100/80 text-gray-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Assistant Tag */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                            👑
                          </span>
                          <span>Plant Coach</span>
                          <span className="text-[10px] font-normal text-gray-400">({msg.engine || 'AI'})</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-line leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Core Knowledge Takeaway Box */}
                    {msg.takeaway && (
                      <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-900 block font-bold">Knowledge Transfer Takeaway:</strong>
                          <span>{msg.takeaway}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Step Today */}
                    {msg.action && (
                      <div className="mt-2.5 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-900 block font-bold">Action to Execute Today:</strong>
                          <span>{msg.action}</span>
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-ups */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                          Suggested Inquiries:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSendMessage(q)}
                              disabled={isSending}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-indigo-700 hover:text-indigo-900 text-[11px] font-semibold rounded-lg border border-indigo-100 transition-colors cursor-pointer text-left"
                            >
                              → {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <span className="text-[10px] text-gray-400 mt-1 mr-1">{msg.timestamp}</span>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-start gap-2">
                  <div className="bg-white border border-indigo-100 rounded-2xl p-4 text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>👑 Plant Coach is synthesizing 10-dimension agronomic context...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {chatError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}

            {/* Message Input Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Ask Plant Coach about ${plantName || 'your plant'}, watering, pruning, or organic treatments...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isSending}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Ask Coach</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Knowledge Transfer Modules Tab */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Botanical Knowledge Transfer Masterclasses
                </h3>
                <p className="text-xs text-gray-500">
                  5 foundational agronomic pillars synthesized for <strong>{plantName}</strong> ({species}).
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                Peer-Reviewed Science
              </span>
            </div>

            {knowledgeLoading ? (
              <div className="py-16 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                <p className="text-xs font-semibold text-gray-700">Synthesizing plant knowledge modules...</p>
              </div>
            ) : knowledgeError ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
                {knowledgeError}
              </div>
            ) : knowledgeData?.modules ? (
              <div className="space-y-4">
                {knowledgeData.modules.map((mod) => {
                  const IconComponent = MODULE_ICONS[mod.icon] || Sprout;
                  const isExpanded = expandedModuleId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-2xs hover:border-purple-200 transition-all overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                        className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-gray-100 text-gray-700">
                                {mod.category}
                              </span>
                              <h4 className="font-bold text-gray-900 text-sm md:text-base">
                                {mod.title}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {mod.summary}
                            </p>
                          </div>
                        </div>

                        <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-purple-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-gray-100/80 bg-purple-50/20 space-y-4">
                          {/* Key Principles */}
                          <div>
                            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              Key Agronomic Principles
                            </h5>
                            <ul className="space-y-1.5">
                              {mod.key_principles.map((pr, pIdx) => (
                                <li key={pIdx} className="text-xs text-gray-700 flex items-start gap-2 bg-white p-2.5 rounded-xl border border-gray-100">
                                  <span className="text-purple-600 font-bold">•</span>
                                  <span>{pr}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Practical Action Box */}
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-emerald-900 block font-bold mb-0.5">
                                Practical Action Step:
                              </strong>
                              <span>{mod.practical_action}</span>
                            </div>
                          </div>

                          {/* Botanical Science Note */}
                          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                            <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-indigo-900 block font-bold mb-0.5">
                                🔬 Botanical Science Insight:
                              </strong>
                              <span>{mod.botanical_science_note}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
