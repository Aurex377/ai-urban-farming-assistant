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
} from 'lucide-react';
import {
  getPlantDetail,
  uploadPlantImage,
  getPlantImages,
  deletePlantImage,
  deletePlant,
  createPendingDiagnosis,
  getPlantDiagnoses,
} from '../services/api';

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

  useEffect(() => {
    fetchPlant();
    fetchImages();
    fetchDiagnoses();
  }, [fetchPlant, fetchImages, fetchDiagnoses]);

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
      await createPendingDiagnosis(id, imageId);
      setDiagnosisFeedback({
        type: 'success',
        text: 'Diagnosis record queued in pending state. Local LLaVA disease detection scheduled for Phase 2.',
      });
      await fetchDiagnoses();
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
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Phase 1 Foundation
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
              Upload a clear leaf photo above and click &quot;Request AI Health Check&quot; to queue an analysis record.
            </p>
          </div>
        )}

        {diagnoses.length > 0 && (
          <div className="space-y-4">
            {diagnoses.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                      {d.status || 'Pending'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{d.disease_name}</h3>
                  </div>
                  <p className="text-xs text-gray-600">
                    {d.diagnosis_details || 'Record queued in pending state.'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Engine: <span className="font-semibold">{d.model_name || 'Local LLaVA Plant Disease 7B'}</span> • Queued at: {formatDateTime(d.created_at || d.diagnosed_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                    Model: Scheduled for Phase 2
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature Placeholders (Watering & Care) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Watering Schedule
              </h2>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled for Phase 2</span>
            </div>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center my-2">
              <Droplets className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-bold text-gray-800 text-sm mb-1">Deterministic Watering Engine</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Soil hydration calculations, weather telemetry, and automated intake logs will be activated in Phase 2.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Care Guidance
              </h2>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled for Phase 2</span>
            </div>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center my-2">
              <Heart className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="font-bold text-gray-800 text-sm mb-1">Approved Treatment Guidance</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Verified treatment protocols, sunlight adjustment, and NVIDIA Nemotron validated responses will be connected in Phase 2.
              </p>
            </div>
          </div>
        </section>
      </div>
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
