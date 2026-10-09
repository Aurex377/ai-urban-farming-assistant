import { useState, useEffect } from 'react';
import { Camera, Loader2, Sparkles, AlertCircle, Clock, CheckCircle2, Leaf, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlants, uploadPlantImage, createPendingDiagnosis } from '../services/api';

export default function Diagnosis() {
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPlants() {
      try {
        const data = await getPlants();
        const list = Array.isArray(data) ? data : [];
        setPlants(list);
        if (list.length > 0) {
          setSelectedPlantId(list[0].id);
        }
      } catch (err) {
        console.error('Error fetching plants for diagnosis:', err);
      }
    }
    loadPlants();
  }, []);

  const handleImageChange = (e) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('Image size exceeds 10 MB limit.');
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setResult(null);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a leaf photo first.');
      return;
    }
    if (!selectedPlantId) {
      setError('Please select or add a plant to attach this diagnosis to.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Upload photo to real FastAPI & Supabase Storage
      const uploadRes = await uploadPlantImage(selectedPlantId, file);
      const imageId = uploadRes.id || uploadRes.image_id;

      // 2. Prepare real diagnosis in pending state
      const diagRes = await createPendingDiagnosis(selectedPlantId, imageId);

      setResult({
        disease: diagRes.disease_name || 'Pending AI Analysis',
        confidence: '0.0%',
        status: diagRes.status || 'Pending',
        model: diagRes.model_name || 'Local LLaVA Plant Disease 7B',
        description:
          diagRes.diagnosis_details ||
          'Image uploaded and queued in pending state. Local LLaVA disease detection model scheduled for Phase 2.',
        plantId: selectedPlantId,
      });
    } catch (err) {
      console.error('Diagnosis creation failed:', err);
      setError(err.message || 'Unable to queue diagnosis. Please ensure backend is active.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto fade-in pb-24">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">AI Plant Health Check</h1>
        <p className="text-gray-600 text-base max-w-2xl mx-auto">
          Upload a clear photo of a plant leaf to register and prepare an AI disease diagnosis record.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100">
        {/* Plant Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Plant in Your Garden
          </label>
          {plants.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-800 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>No plants found in your garden. Please add a plant first.</span>
              </div>
              <Link to="/plants/add" className="font-bold underline text-amber-900">
                Add Plant
              </Link>
            </div>
          ) : (
            <select
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.plant_name} ({p.species || p.plant_type || 'Plant'})
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {!imagePreview ? (
          <div className="mt-2 flex justify-center px-6 pt-12 pb-16 border-2 border-gray-300 border-dashed rounded-2xl hover:bg-gray-50 transition-colors group">
            <div className="space-y-4 text-center">
              <div className="bg-primary-light/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Camera className="mx-auto h-10 w-10 text-primary" />
              </div>
              <div className="flex text-lg text-gray-600 justify-center font-medium">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md text-primary hover:text-primary-dark focus-within:outline-none"
                >
                  <span>Choose Image</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="pl-2">or drag & drop here</p>
              </div>
              <p className="text-sm text-gray-500">Supported formats: JPG, JPEG, PNG, WEBP (max 10MB)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative rounded-2xl overflow-hidden max-h-[480px] flex justify-center bg-gray-900">
              <img src={imagePreview} alt="Preview" className="max-w-full max-h-[480px] object-contain" />

              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-400" />
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    Registering image in Supabase & queueing diagnosis...
                  </h3>
                  <p className="text-white/80 text-sm max-w-md">
                    Uploading image to Supabase Storage and recording a pending analysis record.
                  </p>
                </div>
              )}
            </div>

            {!isAnalyzing && !result && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={reset}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-50 text-sm"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedPlantId}
                  className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-primary-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" />
                  Queue AI Diagnosis
                </button>
              </div>
            )}

            {result && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 md:p-8 border border-amber-200 fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Diagnosis Pipeline Status</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wider">
                      Status: {result.status}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <ResultCard label="Disease Status" value={result.disease} />
                  <ResultCard label="Confidence Score" value={result.confidence} />
                  <ResultCard label="Model Assigned" value={result.model} color="text-emerald-700" />
                </div>

                <div className="mb-6 p-4 bg-white/80 rounded-xl border border-amber-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Architecture & Analysis Notice</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{result.description}</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-sm mb-6">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Image Stored Successfully
                  </p>
                  <p className="text-xs text-emerald-800">
                    Your photo is stored in Supabase Storage with audit records in PostgreSQL. Once Local LLaVA weights are connected in Phase 2, automated inference will immediately process queued plant records.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-amber-200/60">
                  <button
                    onClick={reset}
                    className="text-gray-700 font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm w-full sm:w-auto"
                  >
                    Analyze another image
                  </button>
                  {result.plantId && (
                    <Link
                      to={`/plants/${result.plantId}`}
                      className="bg-primary text-white font-medium px-6 py-2.5 rounded-xl shadow-xs hover:bg-primary-dark text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <Leaf className="w-4 h-4" /> View Plant Details <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
