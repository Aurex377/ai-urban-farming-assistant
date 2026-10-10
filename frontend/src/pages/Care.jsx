import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getCareProtocols,
  getPlants,
  getPersonalizedCare,
  generatePersonalizedCare,
} from '../services/api';
import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Brain,
  CheckSquare,
  Droplets,
  Heart,
  ShieldCheck,
  Clock,
  Calendar,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
  Leaf,
} from 'lucide-react';

export default function Care() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // Phase 4: Plant-specific Personalized Care Assistant
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [personalizedCare, setPersonalizedCare] = useState(null);
  const [personalizingLoading, setPersonalizingLoading] = useState(false);
  const [personalizingError, setPersonalizingError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [protocolsData, plantsData] = await Promise.allSettled([
          getCareProtocols(),
          getPlants(),
        ]);

        if (protocolsData.status === 'fulfilled') {
          setProtocols(Array.isArray(protocolsData.value) ? protocolsData.value : []);
        }

        if (plantsData.status === 'fulfilled') {
          const plantList = Array.isArray(plantsData.value) ? plantsData.value : [];
          setPlants(plantList);
          if (plantList.length > 0) {
            setSelectedPlantId(plantList[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching care protocols:', err);
        setError(err.message || 'Unable to load clinical care protocols.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch or synthesize personalized care whenever selectedPlantId changes
  useEffect(() => {
    if (!selectedPlantId) return;

    let isCurrent = true;
    setPersonalizedCare(null); // Clear previous plant's personalized care immediately to prevent showing previous plant's guidance
    setPersonalizingLoading(true);
    setPersonalizingError(null);

    async function loadPlantCare() {
      try {
        const data = await getPersonalizedCare(selectedPlantId, true);
        if (isCurrent) {
          setPersonalizedCare(data);
        }
      } catch (err) {
        if (isCurrent) {
          console.error('Error loading plant personalized care:', err);
          setPersonalizingError(err.message || 'Unable to load personalized guidance.');
        }
      } finally {
        if (isCurrent) {
          setPersonalizingLoading(false);
        }
      }
    }

    loadPlantCare();

    return () => {
      isCurrent = false;
    };
  }, [selectedPlantId]);

  const handleRegenerateCare = async () => {
    if (!selectedPlantId) return;
    setPersonalizingLoading(true);
    setPersonalizingError(null);
    try {
      const data = await generatePersonalizedCare(selectedPlantId);
      setPersonalizedCare(data);
    } catch (err) {
      console.error('Error regenerating care:', err);
      setPersonalizingError(err.message || 'Failed to re-synthesize personalized care.');
    } finally {
      setPersonalizingLoading(false);
    }
  };

  // Filter categories
  const categories = ['All', ...new Set(protocols.map((p) => p.category).filter(Boolean))];

  const filteredProtocols = activeCategory === 'All'
    ? protocols
    : protocols.filter((p) => p.category === activeCategory);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Botanical Care & Personalization</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            NVIDIA Nemotron Phase 4
          </span>
        </div>
        <p className="text-gray-600">
          Scientifically verified organic interventions, biological treatments, and NVIDIA Nemotron AI context-aware guidance.
        </p>
      </div>

      {/* PHASE 4: NVIDIA Nemotron Context-Aware Personalization Workspace */}
      <section className="bg-white p-6 md:p-8 rounded-3xl border border-indigo-100 shadow-sm mb-12 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                NVIDIA Nemotron Plant-Specific Care Synthesizer
              </h2>
              <p className="text-xs text-gray-500">
                Combines 10 agronomic dimensions (age, microclimate, watering metrics, pathology) into custom care plans.
              </p>
            </div>
          </div>

          {/* Plant Selector */}
          {plants.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    🌿 {p.name || p.plant_name} ({p.species || p.plant_type || 'Plant'})
                  </option>
                ))}
              </select>

              <button
                onClick={handleRegenerateCare}
                disabled={personalizingLoading}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title="Re-synthesize guidance with NVIDIA Nemotron"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${personalizingLoading ? 'animate-spin' : ''}`} />
                <span>Re-Synthesize</span>
              </button>
            </div>
          )}
        </div>

        {personalizingError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{personalizingError}</span>
          </div>
        )}

        {personalizingLoading ? (
          <div className="py-12 text-center text-gray-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-xs font-semibold text-gray-700">Synthesizing personalized care plan with NVIDIA Nemotron...</p>
          </div>
        ) : personalizedCare ? (
          <div className="space-y-5">
            {/* Clinical Explanation Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    {personalizedCare.plant_name} — Clinical Agronomic Assessment
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white border border-gray-200 text-gray-700">
                    {personalizedCare.priority} Priority
                  </span>
                </div>
                <p className="text-gray-800 text-xs md:text-sm leading-relaxed font-medium">
                  {personalizedCare.personalized_explanation}
                </p>
              </div>

              <Link
                to={`/plants/${personalizedCare.plant_id}`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 bg-white px-3 py-2 rounded-xl border border-indigo-100 shadow-2xs"
              >
                <span>View Plant Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3 Column Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Immediate Steps */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <h4 className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Immediate Next Steps
                </h4>
                <ul className="space-y-1.5">
                  {personalizedCare.immediate_next_steps?.slice(0, 3).map((step, idx) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Calibrated Watering */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-950 mb-2 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  Watering Explanation
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {personalizedCare.watering_explanation}
                </p>
              </div>

              {/* Plant Coach Insight */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                <h4 className="text-xs font-bold text-purple-950 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  Plant Coach Guidance
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {personalizedCare.plant_coach_educational_guidance}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-xs">
            Select a plant above to view tailored NVIDIA Nemotron guidance.
          </div>
        )}
      </section>

      {/* Protocol Knowledge Base Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Approved Botanical Protocols</h2>
        <p className="text-xs text-gray-500">
          Curated organic treatments, cultural practices, and preventative standards verified by botanical research.
        </p>
      </div>

      {/* Filter Categories */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm">Retrieving botanical protocols...</p>
        </div>
      ) : filteredProtocols.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center">
          <p className="text-gray-500 font-medium">No protocols found matching this filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProtocols.map((protocol, idx) => (
            <ProtocolCard key={idx} protocol={protocol} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProtocolCard({ protocol }) {
  const urgencyColor = {
    immediate: 'bg-rose-100 text-rose-800 border-rose-200',
    high: 'bg-amber-100 text-amber-800 border-amber-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    routine: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[protocol.urgency] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {protocol.category || 'Agronomic Protocol'}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${urgencyColor}`}>
            {protocol.urgency || 'standard'}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-4">{protocol.condition_name}</h3>

        {/* Immediate Actions */}
        {protocol.immediate_actions && protocol.immediate_actions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              Immediate Actions
            </h4>
            <ul className="space-y-1.5">
              {protocol.immediate_actions.map((act, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approved Treatments */}
        {protocol.approved_treatments && protocol.approved_treatments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Approved Treatments
            </h4>
            <ul className="space-y-1.5">
              {protocol.approved_treatments.map((tr, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{tr}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cultural Preventions */}
        {protocol.cultural_preventions && protocol.cultural_preventions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Cultural Preventions
            </h4>
            <ul className="space-y-1.5">
              {protocol.cultural_preventions.map((cp, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{cp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prohibited Actions */}
        {protocol.prohibited_actions && protocol.prohibited_actions.length > 0 && (
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 mb-4">
            <h4 className="text-[11px] font-bold text-rose-800 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              Prohibited Practices
            </h4>
            <ul className="space-y-1">
              {protocol.prohibited_actions.map((pa, i) => (
                <li key={i} className="text-[11px] text-rose-700">
                  - {pa}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {protocol.environmental_adjustments && (
        <div className="mt-2 pt-3 border-t border-gray-100 text-[11px] text-gray-500 italic">
          Environment: {protocol.environmental_adjustments}
        </div>
      )}
    </div>
  );
}
