import { useState, useEffect } from 'react';
import {
  Camera,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Leaf,
  ArrowRight,
  Server,
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPlants,
  uploadPlantImage,
  createPendingDiagnosis,
  triggerDiagnosisAnalysis,
  getLLaVAModelStatus,
  pollDiagnosisResult,
} from '../services/api';

export default function Diagnosis() {
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [plantsData, statusData] = await Promise.allSettled([
          getPlants(),
          getLLaVAModelStatus(),
        ]);

        if (plantsData.status === 'fulfilled') {
          const list = Array.isArray(plantsData.value) ? plantsData.value : [];
          setPlants(list);
          if (list.length > 0) {
            setSelectedPlantId(list[0].id);
          }
        }

        if (statusData.status === 'fulfilled' && statusData.value) {
          setModelStatus(statusData.value);
        }
      } catch (err) {
        console.error('Error loading initial diagnosis data:', err);
      }
    }
    loadInitialData();
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
    setResult(null);

    try {
      // 1. Upload photo to real FastAPI & Supabase Storage
      setAnalyzingStep('Uploading leaf photo to Supabase Storage...');
      const uploadRes = await uploadPlantImage(selectedPlantId, file);
      const imageId = uploadRes.id || uploadRes.image_id;

      // 2. Prepare diagnosis record in database
      setAnalyzingStep('Registering diagnosis record and invoking NVIDIA Nemotron Vision Model...');
      const diagRes = await createPendingDiagnosis(selectedPlantId, imageId);
      const diagnosisId = diagRes.id;

      // 3. Trigger or poll diagnosis inference
      setAnalyzingStep('Running on-device neural pathology analysis...');
      let finalData = await triggerDiagnosisAnalysis(diagnosisId, false);

      // If still processing, poll up to 15 seconds
      if (finalData && ['pending', 'processing'].includes(finalData.status)) {
        setAnalyzingStep('Awaiting vision model response...');
        finalData = await pollDiagnosisResult(diagnosisId, 8, 2000);
      }

      setResult(finalData || diagRes);
    } catch (err) {
      console.error('Diagnosis creation or inference failed:', err);
      setError(err.message || 'Unable to execute diagnosis. Please ensure backend is active.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  const handleRetryInference = async (diagnosisId) => {
    if (!diagnosisId) return;
    setRetryingId(diagnosisId);
    setError(null);
    try {
      const updated = await triggerDiagnosisAnalysis(diagnosisId, false);
      setResult(updated);
    } catch (err) {
      console.error('Retry inference failed:', err);
      setError(err.message || 'Retry failed. Please verify local model server is running.');
    } finally {
      setRetryingId(null);
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
      {/* Header with Local Model Status Pill */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            NVIDIA Nemotron AI Vision
          </span>
          {modelStatus && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                modelStatus.available
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={modelStatus.message}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  modelStatus.available ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <Server className="w-3 h-3 opacity-70" />
              {modelStatus.available ? 'Nemotron Online' : 'Nemotron Ready'}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">AI Plant Health Check</h1>
        <p className="text-gray-600 text-base max-w-2xl mx-auto">
          Upload a clear photo of a plant leaf for real-time pathology analysis powered by NVIDIA Nemotron.
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
                    Analyzing leaf image with NVIDIA Nemotron...
                  </h3>
                  <p className="text-white/80 text-sm max-w-md">
                    {analyzingStep || 'Executing on-device pathology inspection...'}
                  </p>
                </div>
              )}
            </div>

            {!isAnalyzing && !result && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={reset}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-50 text-sm cursor-pointer"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedPlantId}
                  className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-primary-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  Run AI Diagnosis
                </button>
              </div>
            )}

            {/* Structured Diagnosis Results Rendering */}
            {result && (
              <div className="fade-in">
                {/* STATE 1: Completed Successful Diagnosis */}
                {result.status === 'completed' && (
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 rounded-2xl p-6 md:p-8 border border-emerald-200">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Diagnosis Completed</h2>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 uppercase tracking-wider">
                            Status: Completed
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                        {result.model_name || 'NVIDIA Nemotron'}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <ResultCard
                        label="Diagnosed Condition"
                        value={result.disease_name}
                        color="text-emerald-900"
                      />
                      <ResultCard
                        label="Confidence Score"
                        value={
                          typeof result.confidence === 'number'
                            ? `${(result.confidence * 100).toFixed(1)}%`
                            : 'Evaluated'
                        }
                        color="text-emerald-700"
                      />
                      <ResultCard
                        label="Severity Level"
                        value={(result.severity || 'none').toUpperCase()}
                        color={
                          result.severity === 'high'
                            ? 'text-rose-600'
                            : result.severity === 'medium'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }
                      />
                    </div>

                    {result.symptoms && (
                      <div className="mb-4 p-4 bg-white/80 rounded-xl border border-emerald-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                          <Leaf className="w-4 h-4 text-emerald-600" />
                          Observed Visual Symptoms
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{result.symptoms}</p>
                      </div>
                    )}

                    <div className="mb-6 p-4 bg-white/80 rounded-xl border border-emerald-100">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">Clinical Findings & Details</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {result.diagnosis_details}
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-100/70 rounded-xl border border-emerald-200 text-emerald-950 text-xs mb-6 flex items-center gap-2">
                      <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Analysis was computed with NVIDIA Nemotron. Leaf photo and diagnosis records are safely archived in Supabase.
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-emerald-200/60">
                      <button
                        onClick={reset}
                        className="text-gray-700 font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm w-full sm:w-auto cursor-pointer"
                      >
                        Analyze another image
                      </button>
                      <Link
                        to={`/plants/${selectedPlantId}`}
                        className="bg-primary text-white font-medium px-6 py-2.5 rounded-xl shadow-xs hover:bg-primary-dark text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                      >
                        <Leaf className="w-4 h-4" /> View Plant Details <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* STATE 2: Model Unavailable / Offline */}
                {result.status === 'model_unavailable' && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 md:p-8 border border-amber-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Local Model Server Offline</h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wider">
                          Status: Model Unavailable
                        </span>
                      </div>
                    </div>

                    <div className="mb-6 p-4 bg-white/90 rounded-xl border border-amber-200">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">Diagnostic Notice</h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">
                        {result.diagnosis_details ||
                          'The NVIDIA Nemotron vision model server is not running or unreachable at the configured URL.'}
                      </p>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800">
                        # NVIDIA Nemotron AI Model is active:
                        <br />
                        <span className="text-primary font-bold">Configure NVIDIA_API_KEY in backend/.env for cloud NIM</span>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-100/70 rounded-xl border border-amber-200 text-amber-950 text-xs mb-6">
                      <p className="font-semibold mb-0.5">Your data is safe:</p>
                      The leaf image has been securely uploaded to Supabase Storage and stored in your garden history. You can click &quot;Retry Analysis&quot; below.
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-amber-200/60">
                      <button
                        onClick={() => handleRetryInference(result.id)}
                        disabled={retryingId === result.id}
                        className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-xs hover:bg-primary-dark text-sm flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${retryingId === result.id ? 'animate-spin' : ''}`} />
                        {retryingId === result.id ? 'Retrying Inference...' : 'Retry Analysis'}
                      </button>
                      <button
                        onClick={reset}
                        className="text-gray-700 font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm w-full sm:w-auto cursor-pointer"
                      >
                        Choose another image
                      </button>
                      <Link
                        to={`/plants/${selectedPlantId}`}
                        className="text-gray-700 font-medium bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
                      >
                        View Plant <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* STATE 3: Inconclusive / Failed */}
                {['inconclusive', 'failed'].includes(result.status) && (
                  <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-6 md:p-8 border border-rose-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-rose-100 p-2.5 rounded-xl text-rose-700">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Analysis Inconclusive</h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 uppercase tracking-wider capitalize">
                          Status: {result.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6 p-4 bg-white/90 rounded-xl border border-rose-100">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">Details</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {result.diagnosis_details ||
                          'The vision model could not extract conclusive disease markers. Try taking a closer photo with natural lighting.'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-rose-200/60">
                      <button
                        onClick={() => handleRetryInference(result.id)}
                        disabled={retryingId === result.id}
                        className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-xs hover:bg-primary-dark text-sm flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${retryingId === result.id ? 'animate-spin' : ''}`} />
                        Retry Analysis
                      </button>
                      <button
                        onClick={reset}
                        className="text-gray-700 font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm w-full sm:w-auto cursor-pointer"
                      >
                        Upload Clearer Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* STATE 4: Pending / Processing */}
                {['pending', 'processing'].includes(result.status) && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 md:p-8 border border-blue-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700">
                        <Clock className="w-7 h-7 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Analysis In Progress</h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-200 text-blue-900 uppercase tracking-wider">
                          Status: {result.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6 p-4 bg-white/90 rounded-xl border border-blue-100">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {result.diagnosis_details || 'Leaf image is queued in the NVIDIA Nemotron processing pipeline.'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-blue-200/60">
                      <button
                        onClick={() => handleRetryInference(result.id)}
                        disabled={retryingId === result.id}
                        className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-xs hover:bg-primary-dark text-sm flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${retryingId === result.id ? 'animate-spin' : ''}`} />
                        Check Status Now
                      </button>
                      <button
                        onClick={reset}
                        className="text-gray-700 font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-xs border border-gray-200 text-sm w-full sm:w-auto cursor-pointer"
                      >
                        Analyze another image
                      </button>
                    </div>
                  </div>
                )}
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
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
