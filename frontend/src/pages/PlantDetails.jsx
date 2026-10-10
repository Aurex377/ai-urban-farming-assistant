import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Leaf,
  Calendar,
  Clock,
  Tag,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Droplets,
  Heart,
  Info,
  Upload,
  CheckCircle2,
  X,
  Trash2,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldCheck,
  CheckSquare,
  GraduationCap,
  AlertTriangle,
  Send,
} from 'lucide-react';
import {
  getPlantDetail,
  uploadPlantImage,
  getPlantImages,
  deletePlantImage,
  deletePlant,
  createPendingDiagnosis,
  getPlantDiagnoses,
  triggerDiagnosisAnalysis,
  getPlantRecommendationContext,
  createWateringLog,
  getPersonalizedCare,
  generatePersonalizedCare,
} from '../services/api';
import PlantHealthTimeline from '../components/PlantHealthTimeline';

export default function PlantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  // Plant state
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(location.state?.successMessage || null);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);

  // Images state
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState('');

  // Image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Diagnoses state
  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [diagnosingImageId, setDiagnosingImageId] = useState(null);
  const [diagnosisFeedback, setDiagnosisFeedback] = useState(null);

  // Phase 3: Recommendation Context & Decision Support
  const [contextData, setContextData] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);
  const [isLoggingWater, setIsLoggingWater] = useState(false);
  const [waterLoggedMsg, setWaterLoggedMsg] = useState(null);
  const [showPromptContext, setShowPromptContext] = useState(false);

  // Phase 4: NVIDIA Nemotron Context-Aware Personalization
  const [personalizedCare, setPersonalizedCare] = useState(null);
  const [personalizedLoading, setPersonalizedLoading] = useState(false);
  const [personalizedError, setPersonalizedError] = useState(null);
  const [isRegeneratingCare, setIsRegeneratingCare] = useState(false);

  const fetchPlant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPlantDetail(id);
      setPlant(data);
    } catch (err) {
      console.error('Error fetching plant detail:', err);
      setError(err.message || 'Unable to load plant details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchImages = useCallback(async () => {
    if (!id) return;
    setImagesLoading(true);
    setImagesError('');
    try {
      const data = await getPlantImages(id);
      setImages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching plant images:', err);
      setImagesError('Unable to load images');
    } finally {
      setImagesLoading(false);
    }
  }, [id]);

  const fetchDiagnoses = useCallback(async () => {
    if (!id) return;
    setDiagnosesLoading(true);
    try {
      const data = await getPlantDiagnoses(id);
      setDiagnoses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching plant diagnoses:', err);
    } finally {
      setDiagnosesLoading(false);
    }
  }, [id]);

  const fetchRecommendationContext = useCallback(async () => {
    if (!id) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const data = await getPlantRecommendationContext(id);
      setContextData(data);
    } catch (err) {
      console.error('Error loading plant recommendation context:', err);
      setContextError(err.message || 'Unable to load recommendation context.');
    } finally {
      setContextLoading(false);
    }
  }, [id]);

  const fetchPersonalizedCare = useCallback(async () => {
    if (!id) return;
    setPersonalizedLoading(true);
    setPersonalizedError(null);
    try {
      const data = await getPersonalizedCare(id, true);
      setPersonalizedCare(data);
    } catch (err) {
      console.error('Error loading personalized care:', err);
      setPersonalizedError(err.message || 'Unable to load personalized care guidance.');
    } finally {
      setPersonalizedLoading(false);
    }
  }, [id]);

  const handleRegeneratePersonalizedCare = async () => {
    if (!id) return;
    setIsRegeneratingCare(true);
    setPersonalizedError(null);
    try {
      const data = await generatePersonalizedCare(id);
      setPersonalizedCare(data);
      await fetchPlant();
      await fetchRecommendationContext();
    } catch (err) {
      console.error('Error generating personalized guidance:', err);
      setPersonalizedError(err.message || 'Failed to generate personalized guidance.');
    } finally {
      setIsRegeneratingCare(false);
    }
  };

  useEffect(() => {
    fetchPlant();
    fetchImages();
    fetchDiagnoses();
    fetchRecommendationContext();
    fetchPersonalizedCare();
  }, [fetchPlant, fetchImages, fetchDiagnoses, fetchRecommendationContext, fetchPersonalizedCare]);

  // Clear toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    const isValidMime = allowedMimeTypes.includes(file.type.toLowerCase());
    const isValidExt = allowedExtensions.includes(ext);

    if (!isValidMime && !isValidExt) {
      setUploadError('Please select a valid image file (JPEG, PNG, or WEBP).');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10 MB limit.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleClearSelected = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile || !id) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await uploadPlantImage(id, selectedFile);
      setUploadSuccess('Image uploaded successfully to Supabase Storage');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchImages();
    } catch (err) {
      console.error('Error uploading plant image:', err);
      setUploadError(err.message || 'Unable to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    try {
      await deletePlantImage(id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      alert(`Failed to delete image: ${err.message}`);
    }
  };

  const handleDeletePlant = async () => {
    if (!window.confirm(`Are you sure you want to delete plant "${plant?.name || plant?.plant_name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeletingPlant(true);
    try {
      await deletePlant(id);
      navigate('/plants', {
        state: { successMessage: 'Plant deleted successfully.' },
      });
    } catch (err) {
      alert(`Failed to delete plant: ${err.message}`);
      setIsDeletingPlant(false);
    }
  };

  const handleRequestDiagnosis = async (imageId) => {
    setDiagnosingImageId(imageId);
    setDiagnosisFeedback(null);
    try {
      const created = await createPendingDiagnosis(id, imageId);
      setDiagnosisFeedback({
        type: 'success',
        text: 'Leaf image submitted. Running NVIDIA Nemotron vision diagnosis...',
      });
      await fetchDiagnoses();

      // Trigger/await inference
      if (created?.id) {
        try {
          await triggerDiagnosisAnalysis(created.id, false);
          await fetchDiagnoses();
          await fetchPlant();
          setDiagnosisFeedback({
            type: 'success',
            text: 'NVIDIA Nemotron diagnosis complete. Results updated below.',
          });
        } catch {
          // If model is offline, background worker already recorded model_unavailable
          await fetchDiagnoses();
        }
      }
    } catch (err) {
      setDiagnosisFeedback({
        type: 'error',
        text: err.message || 'Unable to prepare diagnosis record.',
      });
    } finally {
      setDiagnosingImageId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in">
        <Link
          to="/plants"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Plants
        </Link>
        <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Loading plant...</h3>
          <p className="text-sm text-gray-500">Fetching live record from FastAPI backend...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !plant) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in">
        <Link
          to="/plants"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Plants
        </Link>
        <div className="p-8 my-6 bg-rose-50 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto shadow-sm">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Plant Not Found</h3>
          <p className="text-sm text-gray-600 mb-6">{error || 'The requested plant record does not exist.'}</p>
          <Link
            to="/plants"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition-colors text-sm"
          >
            Return to Plant Collection
          </Link>
        </div>
      </div>
    );
  }

  const plantDisplayName = plant.name || plant.plant_name || 'Plant';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm shadow-xs fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation breadcrumb / Back button */}
      <Link
        to="/plants"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Plants
      </Link>

      {/* Hero Plant Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-primary to-emerald-950 rounded-3xl p-6 md:p-10 text-white shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
          <Leaf className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Record #{plant.id}
              </span>
              {plant.plant_type && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-xs">
                  {plant.plant_type}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600/50 text-white border border-white/20 capitalize">
                Health: {(plant.health_status || 'healthy').replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
              {plantDisplayName}
            </h1>
            <p className="text-emerald-100/90 text-lg md:text-xl italic">
              {plant.species || 'Species not specified'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDeletePlant}
              disabled={isDeletingPlant}
              className="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors border border-rose-400/30 flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeletingPlant ? 'Deleting...' : 'Delete Plant'}
            </button>
            <Link
              to="/plants"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors border border-white/20 backdrop-blur-xs shadow-xs"
            >
              Back to My Plants
            </Link>
          </div>
        </div>
      </div>

      {/* Real Plant Information Cards */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Plant Information
          </h2>
          <span className="text-xs text-gray-500 font-medium">Source: FastAPI Database</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DetailCard icon={Leaf} label="Plant Name" value={plantDisplayName} />
          <DetailCard icon={Tag} label="Species" value={plant.species || 'Not specified'} />
          <DetailCard icon={Info} label="Plant Type" value={plant.plant_type || 'Not specified'} />
          <DetailCard icon={Calendar} label="Planted Date" value={formatDate(plant.planted_date)} />
          <DetailCard icon={Clock} label="Created At" value={formatDateTime(plant.created_at)} />
        </div>

        {(plant.variety || plant.location || plant.notes) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plant.variety && <DetailCard icon={Tag} label="Variety" value={plant.variety} />}
            {plant.location && <DetailCard icon={MapPin} label="Location" value={plant.location} />}
            {plant.notes && <DetailCard icon={FileText} label="Notes" value={plant.notes} />}
          </div>
        )}
      </div>

      {/* Upload Images & Gallery Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-teal-600" />
            Plant Photos & Disease Diagnosis
          </h2>
          <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-semibold border border-teal-200">
            Supabase Storage
          </span>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="plant-image-file-input"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {/* Upload Selection Area */}
        {selectedFile ? (
          <div className="mb-4">
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedFile.size / (1024 * 1024) >= 1
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelected}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg cursor-pointer shrink-0 transition-colors"
                title="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="plant-image-file-input"
            className="border-2 border-dashed border-gray-200 hover:border-teal-500/50 hover:bg-teal-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all mb-4 text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 group-hover:scale-105 group-hover:bg-teal-100 flex items-center justify-center mb-2.5 transition-all">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-gray-800 mb-0.5">Select image to upload</span>
            <span className="text-xs text-gray-400">JPEG, PNG, WEBP up to 10 MB</span>
          </label>
        )}

        {/* Upload Button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full bg-primary text-white py-2.5 px-4 rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
        >
          {uploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Uploading image to Supabase Storage...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </>
          )}
        </button>

        {/* Feedback Notifications */}
        {uploadSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{uploadSuccess}</span>
          </div>
        )}
        {uploadError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-sm fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{uploadError}</span>
          </div>
        )}
        {diagnosisFeedback && (
          <div
            className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm fade-in ${
              diagnosisFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-medium">{diagnosisFeedback.text}</span>
          </div>
        )}

        {/* Uploaded Images Gallery */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          {imagesLoading && images.length === 0 && (
            <div className="py-8 flex flex-col items-center justify-center text-center text-gray-500">
              <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mb-2" />
              <p className="text-sm font-medium">Loading photos...</p>
            </div>
          )}

          {!imagesLoading && imagesError && images.length === 0 && (
            <div className="py-6 text-center text-rose-600 text-sm font-medium">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              <p>{imagesError}</p>
            </div>
          )}

          {!imagesLoading && !imagesError && images.length === 0 && (
            <div className="py-6 text-center text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-2 text-gray-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">No images uploaded yet</p>
              <p className="text-xs text-gray-400">Upload a leaf photo above to track growth and request AI health diagnosis.</p>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Uploaded Photos ({images.length})
                </h3>
              </div>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="h-48 w-full bg-gray-100 relative overflow-hidden flex items-center justify-center">
                      {img.signed_url ? (
                        <img
                          src={img.signed_url}
                          alt="Uploaded plant"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-gray-400 text-xs">Preview unavailable</div>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 truncate">
                        {formatDateTime(img.uploaded_at || img.created_at)}
                      </span>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action to Request Diagnosis */}
                    <div className="p-3 pt-0 bg-gray-50/70">
                      <button
                        onClick={() => handleRequestDiagnosis(img.id)}
                        disabled={diagnosingImageId === img.id}
                        className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {diagnosingImageId === img.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Queueing Diagnosis...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Request AI Health Check</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Diagnoses History & Status Section */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            AI Diagnosis Pipeline
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Phase 2: NVIDIA Nemotron Active
          </span>
        </div>

        {diagnosesLoading && diagnoses.length === 0 && (
          <div className="py-6 text-center text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-xs">Loading diagnosis records...</p>
          </div>
        )}

        {!diagnosesLoading && diagnoses.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center my-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <p className="font-bold text-gray-800 text-lg mb-1">No diagnosis records yet</p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Upload a clear leaf photo above and click &quot;Request AI Health Check&quot; to run NVIDIA Nemotron vision diagnosis.
            </p>
          </div>
        )}

        {diagnoses.length > 0 && (
          <div className="space-y-4">
            {diagnoses.map((d) => {
              const isCompleted = d.status === 'completed';
              const isOffline = d.status === 'model_unavailable';
              const isFailed = ['failed', 'inconclusive'].includes(d.status);

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : isOffline
                      ? 'border-amber-200 bg-amber-50/40'
                      : isFailed
                      ? 'border-rose-200 bg-rose-50/40'
                      : 'border-blue-200 bg-blue-50/40'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-200 text-emerald-900'
                            : isOffline
                            ? 'bg-amber-200 text-amber-900'
                            : isFailed
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-blue-200 text-blue-900'
                        }`}
                      >
                        {d.status || 'Pending'}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base">{d.disease_name}</h3>
                      {isCompleted && typeof d.confidence === 'number' && d.confidence > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                          {(d.confidence * 100).toFixed(1)}% Confidence
                        </span>
                      )}
                      {isCompleted && d.severity && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-white border border-gray-200 uppercase">
                          Severity: {d.severity}
                        </span>
                      )}
                    </div>

                    {d.symptoms && (
                      <p className="text-xs text-gray-700">
                        <strong className="text-gray-900">Symptoms:</strong> {d.symptoms}
                      </p>
                    )}

                    <p className="text-xs text-gray-600">
                      {d.diagnosis_details || 'Record archived.'}
                    </p>

                    <p className="text-[11px] text-gray-400">
                      Engine: <span className="font-semibold">{d.model_name || 'NVIDIA Nemotron'}</span> • {formatDateTime(d.created_at || d.diagnosed_at)}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {(isOffline || isFailed || d.status === 'pending') && (
                      <button
                        onClick={async () => {
                          try {
                            await triggerDiagnosisAnalysis(d.id, false);
                            await fetchDiagnoses();
                            await fetchPlant();
                          } catch {
                            await fetchDiagnoses();
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl border border-gray-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Retry inference with NVIDIA Nemotron"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Analysis
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Phase 3: Deterministic Watering Engine & Approved Care Guidance */}
      {contextError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{contextError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Watering Engine Section */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Watering Engine Schedule
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                Phase 3 Active
              </span>
            </div>

            {contextLoading && !contextData ? (
              <div className="py-8 text-center text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-xs">Computing deterministic irrigation metrics...</p>
              </div>
            ) : contextData?.watering_engine_recommendation ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Target Intake</span>
                    <div className="text-2xl font-bold text-gray-900 mt-0.5">
                      {contextData.watering_engine_recommendation.recommended_amount_ml} ml
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Schedule</span>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {contextData.watering_engine_recommendation.recommended_date}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-700 space-y-1">
                  <p>
                    <strong className="text-gray-900">Rationale:</strong> {contextData.watering_engine_recommendation.reason}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Calculated using species baseline, growth stage, ambient humidity, and active pathogen constraints.
                  </p>
                </div>

                {waterLoggedMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{waterLoggedMsg}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center my-2">
                <Droplets className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="font-bold text-gray-800 text-sm mb-1">Standard Hydration Routine</p>
                <p className="text-xs text-gray-500">Water when top inch of soil is dry. Engine will calibrate with weather telemetry.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {plant?.last_watered_at ? `Last watered: ${formatDateTime(plant.last_watered_at)}` : 'No logs recorded yet'}
            </span>
            <button
              onClick={async () => {
                setIsLoggingWater(true);
                try {
                  const amount = contextData?.watering_engine_recommendation?.recommended_amount_ml || 250;
                  await createWateringLog(plant.id, {
                    amount_ml: amount,
                    notes: `Logged via plant profile (${amount} ml)`
                  });
                  setWaterLoggedMsg(`Recorded ${amount} ml intake!`);
                  await fetchPlant();
                  await fetchRecommendationContext();
                  setTimeout(() => setWaterLoggedMsg(null), 4000);
                } catch (err) {
                  alert(`Failed to log water: ${err.message || 'Server error'}`);
                } finally {
                  setIsLoggingWater(false);
                }
              }}
              disabled={isLoggingWater}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {isLoggingWater ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Log Water Intake</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Care Guidance Section */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Approved Care Guidance
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Botanical Protocol
              </span>
            </div>

            {contextLoading && !contextData ? (
              <div className="py-8 text-center text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                <p className="text-xs">Loading approved clinical guidance...</p>
              </div>
            ) : contextData?.dimensions?.approved_care_guidance ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    {contextData.dimensions.approved_care_guidance.condition_name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-gray-100 text-gray-800">
                    {contextData.dimensions.approved_care_guidance.urgency || 'routine'}
                  </span>
                </div>

                {contextData.dimensions.approved_care_guidance.immediate_actions?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-700 mb-1">Immediate Actions:</h4>
                    <ul className="space-y-1">
                      {contextData.dimensions.approved_care_guidance.immediate_actions.slice(0, 2).map((act, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-rose-500">•</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {contextData.dimensions.approved_care_guidance.approved_treatments?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-700 mb-1">Approved Treatments:</h4>
                    <ul className="space-y-1">
                      {contextData.dimensions.approved_care_guidance.approved_treatments.slice(0, 2).map((tr, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-emerald-500">•</span>
                          <span>{tr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center my-2">
                <Heart className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="font-bold text-gray-800 text-sm mb-1">Standard Vitality Regimen</p>
                <p className="text-xs text-gray-500">Adequate aeration, balanced organic nutrients, and clean leaf surface maintenance.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/care"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-end gap-1"
            >
              <span>View Full Protocol Library →</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Phase 4: NVIDIA Nemotron Context-Aware Personalization & AI Plant Coach */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-indigo-100/80 mb-8 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/60 via-purple-50/40 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none"></div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                NVIDIA Nemotron AI Personalized Guidance
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phase 4 Active
              </span>
            </div>
            <p className="text-xs text-gray-500 max-w-2xl">
              Synthesizes plant age, microclimate, deterministic watering telemetry, and approved botanical pathology into tailored agronomic care.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {personalizedCare?.priority && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  personalizedCare.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : personalizedCare.priority === 'high'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : personalizedCare.priority === 'medium'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {personalizedCare.priority} Priority
              </span>
            )}
            <button
              onClick={handleRegeneratePersonalizedCare}
              disabled={isRegeneratingCare || personalizedLoading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCare ? 'animate-spin' : ''}`} />
              <span>{isRegeneratingCare ? 'Synthesizing...' : personalizedCare ? 'Re-Synthesize' : 'Generate Care Plan'}</span>
            </button>
          </div>
        </div>

        {/* Error notice */}
        {personalizedError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{personalizedError}</span>
          </div>
        )}

        {/* Loading state */}
        {personalizedLoading && !personalizedCare ? (
          <div className="py-12 text-center text-gray-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-600" />
            <p className="text-sm font-semibold text-gray-700">Connecting to NVIDIA Nemotron AI...</p>
            <p className="text-xs text-gray-400 mt-1">Aggregating 10 agronomic dimensions into personalized care plan</p>
          </div>
        ) : !personalizedCare ? (
          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-dashed border-indigo-200 rounded-3xl p-8 text-center my-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">Personalized Botanical Plan Ready</h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">
              Click below to generate a tailored plant-care explanation, immediate action plan, watering guidance, and Plant Coach advice using NVIDIA Nemotron.
            </p>
            <button
              onClick={handleRegeneratePersonalizedCare}
              disabled={isRegeneratingCare}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate NVIDIA Nemotron Guidance</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {/* Summary & Pathology Explanation */}
            <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white border border-indigo-100">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Botanical Status & Clinical Explanation
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200">
                  {personalizedCare.active_diagnosis}
                </span>
                {personalizedCare.species && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200 italic">
                    {personalizedCare.species}
                  </span>
                )}
              </div>
              <p className="text-gray-800 text-sm leading-relaxed mb-3 font-medium">
                {personalizedCare.personalized_explanation}
              </p>
              {personalizedCare.summary && (
                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/60 text-xs text-indigo-950 font-medium">
                  <strong>Plan Overview:</strong> {personalizedCare.summary}
                </div>
              )}
            </div>

            {/* Grid of 4 Key Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pillar 1: Immediate Next Steps */}
              <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    Immediate Next Steps (Execute Today)
                  </h3>
                  <ul className="space-y-2">
                    {personalizedCare.immediate_next_steps?.map((step, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/70">
                        <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pillar 2: Personalized Treatment Explanation */}
              <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Personalized Botanical Treatment
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed mb-3">
                    {personalizedCare.personalized_treatment_explanation}
                  </p>
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-[11px] text-rose-900">
                    <strong>Organic Protocol:</strong> Follow dosage recommendations; spray in morning or twilight to avoid phototoxicity.
                  </div>
                </div>
              </div>

              {/* Pillar 3: Precision Watering Explanation */}
              <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-600" />
                      Calibrated Irrigation Explanation
                    </h3>
                    {personalizedCare.deterministic_watering?.recommended_amount_ml && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {personalizedCare.deterministic_watering.recommended_amount_ml} ml Target
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {personalizedCare.watering_explanation}
                  </p>
                </div>
              </div>

              {/* Pillar 4: Cultural Prevention Guidance */}
              <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Cultural Prevention & Microclimate
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {personalizedCare.prevention_guidance}
                  </p>
                </div>
              </div>
            </div>

            {/* Monitoring & Next Scan Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                  Monitoring Instructions (Next 48–72h)
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {personalizedCare.monitoring_instructions}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Next Scan Recommendation
                </h4>
                <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                  {personalizedCare.next_scan_recommendation}
                </p>
              </div>
            </div>

            {/* Educational Coach Guidance */}
            <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-bold text-emerald-950">
                  Plant Coach Educational Insights
                </h4>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                {personalizedCare.plant_coach_educational_guidance}
              </p>
            </div>

            {/* Expert Help Warning Conditions */}
            {personalizedCare.expert_help_conditions && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900 mb-0.5">When to Seek Extension / Expert Help:</h5>
                  <p className="text-amber-800 leading-relaxed">{personalizedCare.expert_help_conditions}</p>
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
              <span>
                Engine: <strong className="text-gray-700">{personalizedCare.model_name || 'NVIDIA Nemotron'}</strong> ({personalizedCare.engine || 'NVIDIA NIM Orchestrator'})
              </span>
              <span>
                Generated: {formatDateTime(personalizedCare.generated_at)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Synthesized 10-Dimension Decision Context Inspector (Phase 4 Ready) */}
      {contextData && (
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <button
            onClick={() => setShowPromptContext(!showPromptContext)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Synthesized Recommendation Context (10 Dimensions Ready for Nemotron)
                </h3>
                <p className="text-xs text-gray-500">
                  Deterministic profile, weather, age, soil, and clinical guidance synthesized for Phase 4.
                </p>
              </div>
            </div>
            {showPromptContext ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showPromptContext && (
            <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
              <div className="bg-gray-900 text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
                {contextData.nemotron_ready_prompt_context || JSON.stringify(contextData.dimensions, null, 2)}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Phase 5: Plant Health Timeline & Trajectory */}
      {plant && (
        <PlantHealthTimeline plantId={plant.id} plantName={plant.name || plant.plant_name} />
      )}
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2 text-gray-500">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-gray-900 text-base break-words">{value}</p>
    </div>
  );
}
