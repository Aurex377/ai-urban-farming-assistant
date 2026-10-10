import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, X, Leaf, Calendar, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { createPlant } from '../services/api';

export default function AddPlant() {
  const navigate = useNavigate();
  const location = useLocation();

  // Form field state (supports pre-fill from Plant Recommendations & Start Growing)
  const [plantName, setPlantName] = useState(location.state?.plantName || '');
  const [species, setSpecies] = useState(location.state?.species || '');
  const [plantType, setPlantType] = useState(location.state?.plantType || 'Vegetable');
  const [plantedDate, setPlantedDate] = useState(
    location.state?.plantedDate || new Date().toISOString().split('T')[0]
  );
  const [imagePreview, setImagePreview] = useState(location.state?.imageUrl || null);

  // UX & Validation state
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');

    // Form validation
    const trimmedName = plantName.trim();
    if (!trimmedName) {
      setValidationError('Plant name is required.');
      return;
    }

    setLoading(true);

    try {
      const plantPayload = {
        plant_name: trimmedName,
        species: species.trim() || null,
        plant_type: plantType || null,
        planted_date: plantedDate || null,
      };

      console.log('Submitting plant payload to FastAPI:', plantPayload);
      const result = await createPlant(plantPayload);
      console.log('FastAPI create plant response:', result);

      // On success: navigate directly to plant details page after creation
      navigate(`/plants/${result.id}`, {
        state: {
          successMessage: '🌱 Plant added successfully!',
        },
      });
    } catch (err) {
      console.error('Error adding plant:', err);
      setApiError(err.message || 'Unable to add plant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Plant</h1>
        <p className="text-gray-600">Enter the details of your new plant below.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100"
      >
        {/* Error Notification */}
        {apiError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">{apiError}</p>
            </div>
          </div>
        )}

        {/* Plant Image Upload Area (Visual UI preserved, upload deferred) */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Plant Image <span className="text-xs text-gray-400 font-normal">(Optional preview)</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-2xl hover:bg-gray-50 transition-colors">
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-64 w-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-white text-gray-600 hover:text-red-500 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-center py-10">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Plant Name (Required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plant Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Leaf className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={plantName}
                onChange={(e) => {
                  setPlantName(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="e.g. Tomato"
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  validationError ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                }`}
              />
            </div>
            {validationError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {validationError}
              </p>
            )}
          </div>

          {/* Species (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Species <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. Solanum lycopersicum"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Plant Type (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plant Type <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            </label>
            <select
              value={plantType}
              onChange={(e) => setPlantType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="Vegetable">Vegetable</option>
              <option value="Herb">Herb</option>
              <option value="Fruit">Fruit</option>
              <option value="Flower">Flower</option>
              <option value="Succulent">Succulent</option>
              <option value="Indoor">Indoor</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Planted Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planted Date <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={plantedDate}
                onChange={(e) => setPlantedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            disabled={loading}
            onClick={() => navigate('/plants')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Adding plant...</span>
              </>
            ) : (
              <span>Add Plant</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
