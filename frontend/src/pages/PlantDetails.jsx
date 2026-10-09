import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { getPlantDetail, uploadPlantImage, getPlantImages } from '../services/api';

export default function PlantDetails() {
  const { id } = useParams();
  const fileInputRef = useRef(null);

  // Plant state
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Images state
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState('');

  // Image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fetchPlant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPlantDetail(id);
      setPlant(data);
    } catch (err) {
      console.error('Error fetching plant detail:', err);
      setError('Unable to load plant details.');
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

  useEffect(() => {
    fetchPlant();
    fetchImages();
  }, [fetchPlant, fetchImages]);

  // Clear success notification after 5 seconds
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

    // Accept only image/jpeg, image/png, image/webp
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
      setUploadSuccess('Image uploaded successfully');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Immediately fetch the updated image list so new photo appears without browser refresh
      const updatedImages = await getPlantImages(id);
      setImages(Array.isArray(updatedImages) ? updatedImages : []);
    } catch (err) {
      console.error('Error uploading plant image:', err);
      setUploadError(err.message || 'Unable to upload image.');
    } finally {
      setUploading(false);
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to load plant details.</h3>
          <p className="text-sm text-gray-600 mb-6">
            {error || 'Unable to load plant details.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={fetchPlant}
              className="bg-primary text-white px-5 py-2.5 rounded-full font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to="/plants"
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
            >
              Back to Plants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
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
        {/* Decorative background watermark */}
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
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
              {plant.plant_name}
            </h1>
            <p className="text-emerald-100/90 text-lg md:text-xl italic">
              {plant.species || 'Species not specified'}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
          <DetailCard
            icon={Leaf}
            label="Plant Name"
            value={plant.plant_name || '—'}
          />
          <DetailCard
            icon={Tag}
            label="Species"
            value={plant.species || 'Not specified'}
          />
          <DetailCard
            icon={Info}
            label="Plant Type"
            value={plant.plant_type || 'Not specified'}
          />
          <DetailCard
            icon={Calendar}
            label="Planted Date"
            value={formatDate(plant.planted_date)}
          />
          <DetailCard
            icon={Clock}
            label="Created At"
            value={formatDateTime(plant.created_at)}
          />
        </div>
      </div>

      {/* Feature Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Diagnosis Placeholder */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                AI Diagnosis
              </h2>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</span>
            </div>

            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center my-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="font-bold text-gray-800 text-lg mb-1">No diagnosis yet</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Scan leaf photos using AI to detect disease patterns and get instant health evaluation.
              </p>
            </div>
          </div>
        </section>

        {/* Images Upload & Gallery Section */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                Images
              </h2>
              {images.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                  {images.length} {images.length === 1 ? 'photo' : 'photos'}
                </span>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              id="plant-image-file-input"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            {/* Upload Area / Selected File Display */}
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
                        {(selectedFile.size / (1024 * 1024) >= 1)
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
                <span className="text-sm font-semibold text-gray-800 mb-0.5">
                  Select image to upload
                </span>
                <span className="text-xs text-gray-400">
                  JPEG, PNG, WEBP up to 10 MB
                </span>
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
                  <span>Uploading image...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                </>
              )}
            </button>

            {/* Success Notification */}
            {uploadSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{uploadSuccess}</span>
              </div>
            )}

            {/* Error Notification */}
            {uploadError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-sm fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{uploadError}</span>
              </div>
            )}

            {/* Uploaded Images Gallery Area */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              {/* Loading State */}
              {imagesLoading && images.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mb-2" />
                  <p className="text-sm font-medium">Loading images...</p>
                </div>
              )}

              {/* Error State */}
              {!imagesLoading && imagesError && images.length === 0 && (
                <div className="py-6 text-center">
                  <div className="inline-flex items-center gap-2 text-rose-600 text-sm font-medium mb-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{imagesError}</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={fetchImages}
                      className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!imagesLoading && !imagesError && images.length === 0 && (
                <div className="py-6 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-2 text-gray-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-0.5">No images uploaded yet</p>
                  <p className="text-xs text-gray-400">Upload your first photo above to track plant growth.</p>
                </div>
              )}

              {/* Render Actual Images in Responsive Grid */}
              {images.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Uploaded Photos ({images.length})
                    </h3>
                    {imagesLoading && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-teal-600" />
                        Updating...
                      </span>
                    )}
                  </div>

                  <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {images.map((img) => (
                      <ImageCard
                        key={img.id}
                        image={img}
                        formatDateTime={formatDateTime}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Watering Placeholder */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Watering
              </h2>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</span>
            </div>

            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center my-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-100/60 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Droplets className="w-7 h-7" />
              </div>
              <p className="font-bold text-gray-800 text-lg mb-1">No watering data yet</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Soil hydration sensors, watering frequency reminders, and intake logs will appear here.
              </p>
            </div>
          </div>
        </section>

        {/* Care Recommendations Placeholder */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Care Recommendations
              </h2>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming</span>
            </div>

            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center my-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-100/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7" />
              </div>
              <p className="font-bold text-gray-800 text-lg mb-1">No recommendations yet</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Custom sunlight, climate, fertilizer, and pruning recommendations will appear here.
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

function ImageCard({ image, formatDateTime }) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow group flex flex-col">
      <div className="h-44 sm:h-48 w-full bg-gray-100 relative overflow-hidden flex items-center justify-center">
        {loadFailed || !image.signed_url ? (
          <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <ImageIcon className="w-8 h-8 mb-1.5 opacity-40" />
            <span className="text-xs font-medium">Image preview unavailable</span>
          </div>
        ) : (
          <img
            src={image.signed_url}
            alt="Uploaded plant"
            onError={() => setLoadFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            loading="lazy"
          />
        )}
      </div>

      <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="min-w-0 pr-2">
          <span className="font-medium text-gray-700 block truncate">
            {formatDateTime(image.uploaded_at)}
          </span>
        </div>
        {image.image_type && (
          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 uppercase">
            {image.image_type.replace('image/', '')}
          </span>
        )}
      </div>
    </div>
  );
}
