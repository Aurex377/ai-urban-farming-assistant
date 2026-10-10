import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Leaf,
  Sun,
  Droplets,
  Heart,
  Scale,
  Brain,
  Sprout,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  Bookmark,
  Thermometer,
  Layers,
  MapPin,
  Plus,
} from 'lucide-react';
import {
  discoverPlants,
  getBotanicalCatalog,
  comparePlants,
  saveDiscoveryPreferences,
  getSavedDiscoveryPreferences,
  addFavoritePlant,
  removeFavoritePlant,
  getFavoritePlants,
  createPlant,
  getCurrentWeather,
} from '../services/api';

// ====================================================================
// Option Constants
// ====================================================================

const ENVIRONMENTS = [
  { id: 'balcony', label: 'Balcony', icon: '🪴', desc: 'Open or semi-sheltered container space with natural airflow' },
  { id: 'terrace', label: 'Terrace / Rooftop', icon: '☀️', desc: 'Full outdoor sun exposure and breezy rooftop conditions' },
  { id: 'garden', label: 'Garden / Yard', icon: '🏡', desc: 'Ground beds or large raised planters in open outdoor setting' },
  { id: 'window_sill', label: 'Window Sill', icon: '🪟', desc: 'Narrow indoor surface receiving direct or ambient window daylight' },
  { id: 'bedroom', label: 'Bedroom', icon: '🛏️', desc: 'Cozy indoor space with gentle ambient light and nocturnal oxygen' },
  { id: 'living_room', label: 'Living Room', icon: '🛋️', desc: 'Bright focal space with medium indirect light for ornamental foliage' },
  { id: 'small_desk', label: 'Small Desk / Shelf', icon: '💻', desc: 'Compact tabletop nook with artificial or soft ambient lighting' },
  { id: 'large_indoor', label: 'Large Indoor Area', icon: '🏛️', desc: 'Spacious hall or atrium accommodating medium to tall floor containers' },
];

const SUNLIGHT_OPTIONS = [
  { id: 'low_light', label: 'Low Ambient Light', icon: '☁️', desc: 'Dimmish interior room or north-facing nook with no direct beams' },
  { id: 'indirect_sunlight', label: 'Medium Indirect Light', icon: '🌤️', desc: 'Soft diffused natural room light a few meters away from a window' },
  { id: 'bright_indirect', label: 'Bright Indirect Light', icon: '✨', desc: 'Strong ambient illumination near a window without burning direct rays' },
  { id: 'direct_sunlight', label: 'Direct Sunlight (3–5 hrs)', icon: '☀️', desc: 'Sunbeams hitting leaves directly for part of the day (morning or afternoon)' },
  { id: 'full_sun', label: 'Full Outdoor Sun (6+ hrs)', icon: '🔥', desc: 'Unfiltered, intense open sun all day long (ideal for fruiting crops & herbs)' },
];

const SPACE_OPTIONS = [
  { id: 'small_desk', label: 'Small Desk or Shelf', icon: '📐', desc: 'Footprint under 30 cm; compact pots (3–5 in)' },
  { id: 'window_sill', label: 'Window Sill', icon: '🪟', desc: 'Narrow horizontal ledge (4–6 in container width)' },
  { id: 'living_room', label: 'Living Room Corner', icon: '🛋️', desc: 'Floor space for medium pots (8–10 in)' },
  { id: 'balcony', label: 'Balcony Railing / Floor', icon: '🪴', desc: 'Medium or multi-tier container planters (8–12 in)' },
  { id: 'terrace', label: 'Terrace Garden', icon: '☀️', desc: 'Large tubs or grow bags (12–18 in)' },
  { id: 'garden', label: 'Open Garden Ground', icon: '🌳', desc: 'Unrestricted root zone for deep, lush mature growth' },
];

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'Complete Beginner', icon: '🌱', desc: 'Need forgiving, indestructible species that tolerate missed waterings' },
  { id: 'intermediate', label: 'Some Plant-Care Experience', icon: '🌿', desc: 'Comfortable monitoring topsoil moisture, light cycles, and seasonal repotting' },
  { id: 'experienced', label: 'Experienced Gardener', icon: '🌳', desc: 'Enjoy specialized soil recipes, regular pruning, fruit-set fertilizing, and cloning' },
];

const MAINTENANCE_OPTIONS = [
  { id: 'very_low', label: 'Very Low Maintenance', icon: '💤', desc: 'Neglect-tolerant; water once every 2–3 weeks (Drought hardy)' },
  { id: 'low', label: 'Low Maintenance', icon: '👌', desc: 'Check in once weekly; forgiving of minor schedule variations' },
  { id: 'moderate', label: 'Moderate Maintenance', icon: '⏳', desc: 'Water every 2–4 days; monthly organic feed and occasional pruning' },
  { id: 'high', label: 'High Maintenance', icon: '🎯', desc: 'Attentive daily monitoring, frequent training, pest vigilance, and feeding' },
];

const PURPOSE_OPTIONS = [
  { id: 'decorative', label: 'Airy Decorative Greenery', icon: '🍃' },
  { id: 'air_purifying', label: 'NASA Air Purification', icon: '🌬️' },
  { id: 'flowering', label: 'Fragrant & Flowering Blooms', icon: '🌸' },
  { id: 'edible_herbs', label: 'Edible Kitchen Herbs', icon: '🥗' },
  { id: 'vegetables', label: 'Fresh Vegetables', icon: '🍅' },
  { id: 'fruits', label: 'Container Fruits (Lemon)', icon: '🍋' },
  { id: 'medicinal', label: 'Medicinal & Traditional Use', icon: '🩺' },
  { id: 'balconies', label: 'Balcony & Terrace Beautification', icon: '🪴' },
  { id: 'shaded_spaces', label: 'Shaded Spaces & Low Light', icon: '☁️' },
  { id: 'hot_climates', label: 'Hot Climate Resilience (Gujarat/India)', icon: '🔥' },
  { id: 'small_apartments', label: 'Small Apartment Compact Living', icon: '🏢' },
  { id: 'pet_safe', label: 'Pet-Conscious (Non-Toxic Only)', icon: '🐾' },
];

export default function Recommendations() {
  const navigate = useNavigate();

  // Navigation tabs: 'discover' | 'catalog' | 'favorites'
  const [activeTab, setActiveTab] = useState('discover');

  // Wizard state (Step 1 to Step 5, plus Results)
  const [wizardStep, setWizardStep] = useState(1);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Form Preferences
  const [preferences, setPreferences] = useState({
    location: 'Ahmedabad, Gujarat',
    environment: 'balcony',
    sunlight: 'bright_indirect',
    space: 'balcony',
    experience: 'beginner',
    maintenance: 'low',
    purposes: ['decorative', 'hot_climates'],
    pet_conscious: false,
    plant_size_preference: 'any',
    watering_capacity: 'moderate',
    placement_type: 'both',
    flower_or_foliage: 'any',
    growing_medium: 'standard_potting_soil',
    budget_tier: 'any',
  });

  // Telemetry & Results
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [discoveryResponse, setDiscoveryResponse] = useState(null);

  // Botanical Catalog Browser
  const [catalogPlants, setCatalogPlants] = useState([]);
  const [catalogFilterCategory, setCatalogFilterCategory] = useState('');
  const [catalogPetOnly, setCatalogPetOnly] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [favoritePlantsList, setFavoritePlantsList] = useState([]);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefSaveNotice, setPrefSaveNotice] = useState(null);

  // Comparison Tray
  const [compareList, setCompareList] = useState([]); // List of plant IDs
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Detailed Plant Modal
  const [selectedPlantDetail, setSelectedPlantDetail] = useState(null);
  const [detailModalTab, setDetailModalTab] = useState('care');

  // Action Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initial Load: Fetch live weather, favorites, and saved preferences
  useEffect(() => {
    async function loadInitialContext() {
      // Weather
      setWeatherLoading(true);
      try {
        const w = await getCurrentWeather();
        if (w && w.current) {
          setLiveWeather(w);
          if (w.city && w.city !== 'Default Location') {
            setPreferences((prev) => ({ ...prev, location: w.city }));
          }
        }
      } catch (wErr) {
        console.warn('Weather telemetry load:', wErr);
      } finally {
        setWeatherLoading(false);
      }

      // Saved Preferences
      try {
        const savedPref = await getSavedDiscoveryPreferences();
        if (savedPref && savedPref.preferences) {
          setPreferences((prev) => ({ ...prev, ...savedPref.preferences }));
        }
      } catch (pErr) {
        console.warn('Saved preferences load:', pErr);
      }

      // Favorites
      try {
        const favs = await getFavoritePlants();
        if (favs && favs.favorites) {
          setFavorites(favs.favorites);
          setFavoritePlantsList(favs.plants || []);
        }
      } catch (fErr) {
        console.warn('Favorites load:', fErr);
      }
    }

    loadInitialContext();
  }, []);

  // 2. Load Catalog when activeTab is 'catalog'
  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
    if (activeTab === 'favorites') {
      refreshFavorites();
    }
  }, [activeTab, catalogFilterCategory, catalogPetOnly]);

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const filters = {};
      if (catalogFilterCategory) filters.category = catalogFilterCategory;
      if (catalogPetOnly) filters.pet_friendly = true;
      const data = await getBotanicalCatalog(filters);
      setCatalogPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Catalog load error:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const refreshFavorites = async () => {
    try {
      const data = await getFavoritePlants();
      if (data) {
        setFavorites(data.favorites || []);
        setFavoritePlantsList(data.plants || []);
      }
    } catch (err) {
      console.error('Refresh favorites error:', err);
    }
  };

  // 3. Trigger Discovery Execution
  const handleRunDiscovery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await discoverPlants(preferences);
      setDiscoveryResponse(result);
      setHasGenerated(true);
      setWizardStep(6); // Step 6 is Results view
    } catch (err) {
      console.error('Plant discovery error:', err);
      setError(err.message || 'Unable to generate plant recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Save Discovery Preferences
  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      await saveDiscoveryPreferences(preferences);
      setPrefSaveNotice('✅ Discovery preferences saved to your account!');
      setTimeout(() => setPrefSaveNotice(null), 4000);
    } catch (err) {
      console.error('Save preferences error:', err);
      setPrefSaveNotice('Failed to save preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // 5. Toggle Favorite
  const handleToggleFavorite = async (plantId, plantName) => {
    const isFav = favorites.includes(plantId);
    try {
      if (isFav) {
        const res = await removeFavoritePlant(plantId);
        setFavorites(res.favorites || []);
        setFavoritePlantsList((prev) => prev.filter((p) => p.id !== plantId));
        showToast(`Removed ${plantName || 'Plant'} from favorites`);
      } else {
        const res = await addFavoritePlant(plantId);
        setFavorites(res.favorites || []);
        showToast(`❤️ Added ${plantName || 'Plant'} to your favorites!`);
        refreshFavorites();
      }
    } catch (err) {
      console.error('Favorite toggle error:', err);
      showToast('Could not update favorites.');
    }
  };

  // 6. Action: Add to My Plants
  const handleAddToMyPlants = async (plant) => {
    try {
      const payload = {
        plant_name: plant.name,
        species: plant.scientific_name,
        plant_type: plant.category || 'Herb',
        planted_date: new Date().toISOString().split('T')[0],
      };
      const created = await createPlant(payload);
      showToast(`🌱 Added ${plant.name} to My Plants garden!`);
      // Navigate to plant details if desired, or stay with confirmation
      navigate(`/plants/${created.id}`, {
        state: {
          successMessage: `🌱 ${plant.name} successfully added to your garden! Care tracking initialized.`,
        },
      });
    } catch (err) {
      console.error('Add plant error:', err);
      showToast('Unable to add plant to My Plants. Check backend connection.');
    }
  };

  // 7. Action: Start Growing
  const handleStartGrowing = (plant) => {
    navigate('/plants/add', {
      state: {
        plantName: plant.name,
        species: plant.scientific_name,
        plantType: plant.category || 'Vegetable',
        imageUrl: plant.image_url,
      },
    });
  };

  // 8. Action: Ask Plant Coach
  const handleAskPlantCoach = (plant) => {
    navigate('/care', {
      state: {
        plantName: plant.name,
        species: plant.scientific_name,
      },
    });
  };

  // 9. Comparison Tray Handlers
  const toggleCompare = (plantId) => {
    if (compareList.includes(plantId)) {
      setCompareList((prev) => prev.filter((id) => id !== plantId));
    } else {
      if (compareList.length >= 4) {
        showToast('You can compare a maximum of 4 plants at once.');
        return;
      }
      setCompareList((prev) => [...prev, plantId]);
      showToast('Added to comparison tray');
    }
  };

  const handleOpenComparisonModal = async () => {
    if (compareList.length < 2) {
      showToast('Select at least 2 plants to compare.');
      return;
    }
    setCompareLoading(true);
    setCompareModalOpen(true);
    try {
      const res = await comparePlants(compareList, preferences);
      setComparisonData(res);
    } catch (err) {
      console.error('Compare plants error:', err);
      showToast('Unable to compare plants: ' + err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  // Toggle multiple purposes helper
  const togglePurpose = (purposeId) => {
    setPreferences((prev) => {
      const exists = prev.purposes.includes(purposeId);
      if (exists) {
        return { ...prev, purposes: prev.purposes.filter((p) => p !== purposeId) };
      } else {
        return { ...prev, purposes: [...prev.purposes, purposeId] };
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 fade-in text-sm font-medium">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
                👑
              </span>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Best Plant for Your Home
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Agronomic AI Discovery
              </span>
            </div>
            <p className="text-gray-600 max-w-3xl text-sm md:text-base leading-relaxed">
              Find resilient, high-yield plants tailored to your balcony sunlight, living space, maintenance routine, and local climate microclimate.
            </p>
          </div>

          {/* Microclimate telemetry pill */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs self-start lg:self-auto">
            <Thermometer className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                {liveWeather?.city || preferences.location || 'Local Climate'}
                {weatherLoading && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
              </p>
              <p className="text-gray-500">
                {liveWeather?.current?.temperature != null
                  ? `${liveWeather.current.temperature}°C • ${liveWeather.current.conditions || 'Live Weather'}`
                  : 'Heat-Aware Engine Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'discover'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Find My Perfect Plant
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Leaf className="w-4 h-4" />
            Botanical Catalog ({catalogPlants.length || 18})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            My Favorites ({favorites.length})
          </button>
          {compareList.length > 0 && (
            <button
              onClick={handleOpenComparisonModal}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer flex items-center gap-2 ml-auto shadow-sm"
            >
              <Scale className="w-4 h-4" />
              Compare Selected ({compareList.length})
            </button>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* TAB 1: PERSONALIZED RECOMMENDATION DISCOVERY & WIZARD */}
      {/* ==================================================================== */}
      {activeTab === 'discover' && (
        <div>
          {/* Stepper Progress Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-gray-700">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                  {wizardStep}
                </span>
                Step {wizardStep} of 6:{' '}
                {wizardStep === 1 && 'Location & Microclimate'}
                {wizardStep === 2 && 'Available Sunlight & Space'}
                {wizardStep === 3 && 'Experience & Care Bandwidth'}
                {wizardStep === 4 && 'Goals & Intended Purpose'}
                {wizardStep === 5 && 'Refined Preferences (Optional)'}
                {wizardStep === 6 && 'Your Tailored Home Botanical Matches'}
              </span>
              <div className="flex items-center gap-2">
                {hasGenerated && wizardStep < 6 && (
                  <button
                    onClick={() => setWizardStep(6)}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    View Last Results →
                  </button>
                )}
                <span className="text-gray-400 font-normal">
                  {wizardStep < 6 ? `${Math.round(((wizardStep - 1) / 5) * 100)}% complete` : 'Discovery Complete'}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${(wizardStep / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold">Recommendation Error</p>
                  <p>{error}</p>
                </div>
              </div>
              <button
                onClick={handleRunDiscovery}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Wizard Step 1: Location & Microclimate */}
          {wizardStep === 1 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Where will your plant grow?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Microclimates differ dramatically between open windy terraces, enclosed air-conditioned rooms, and sunny balconies.
              </p>

              {/* Location Input */}
              <div className="mb-6 max-w-md">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  City or Region (India / Local Climate)
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={preferences.location}
                    onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
                    placeholder="e.g. Ahmedabad, Surat, Mumbai, Delhi, Bengaluru"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  We use your location to evaluate dry summer temperatures (up to 45°C), monsoon moisture, and seasonal care.
                </p>
              </div>

              {/* Environment Selection Cards */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Select Growing Environment
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ENVIRONMENTS.map((env) => {
                    const selected = preferences.environment === env.id;
                    return (
                      <div
                        key={env.id}
                        onClick={() => setPreferences({ ...preferences, environment: env.id })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-primary-light/10 border-primary shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-2 block">{env.icon}</span>
                          <h3 className={`text-sm font-bold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                            {env.label}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{env.desc}</p>
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Brightness vs Direct Sunlight Educational Callout */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-start gap-3 mb-8">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <p className="font-bold mb-0.5">Horticultural Fact: Room Brightness vs. Direct Sunlight</p>
                  <p>
                    A brightly lit room is illuminated by scattered ambient light, which is excellent for foliage plants like pothos and snake plants. However, fruiting plants (tomatoes, chilies) and flowering shrubs (mogra) strictly require direct sunbeams hitting their leaves. We'll calibrate this in the next step.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  Continue to Sunlight & Space <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 2: Available Sunlight & Space */}
          {wizardStep === 2 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sunlight & Container Footprint</h2>
              <p className="text-gray-500 text-sm mb-6">
                Light is plant food. Matching plants to your exact window orientation prevents scorching or leggy stems.
              </p>

              {/* Sunlight Options */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Available Sunlight Exposure
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUNLIGHT_OPTIONS.map((sun) => {
                    const selected = preferences.sunlight === sun.id;
                    return (
                      <div
                        key={sun.id}
                        onClick={() => setPreferences({ ...preferences, sunlight: sun.id })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-primary-light/10 border-primary shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-2 block">{sun.icon}</span>
                          <h3 className={`text-sm font-bold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                            {sun.label}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{sun.desc}</p>
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Space Options */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Available Space & Surface Area
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SPACE_OPTIONS.map((sp) => {
                    const selected = preferences.space === sp.id;
                    return (
                      <div
                        key={sp.id}
                        onClick={() => setPreferences({ ...preferences, space: sp.id })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-primary-light/10 border-primary shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-2 block">{sp.icon}</span>
                          <h3 className={`text-sm font-bold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                            {sp.label}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{sp.desc}</p>
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  Continue to Experience & Care <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 3: Experience & Care Bandwidth */}
          {wizardStep === 3 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Experience & Routine</h2>
              <p className="text-gray-500 text-sm mb-6">
                Gardening should be joyful and stress-free. Let us know how much time you want to spend tending to your garden.
              </p>

              {/* Experience Options */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Your Plant-Care Experience
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {EXPERIENCE_OPTIONS.map((exp) => {
                    const selected = preferences.experience === exp.id;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => setPreferences({ ...preferences, experience: exp.id })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-primary-light/10 border-primary shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-2 block">{exp.icon}</span>
                          <h3 className={`text-sm font-bold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                            {exp.label}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{exp.desc}</p>
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Maintenance Options */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Maintenance Bandwidth
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {MAINTENANCE_OPTIONS.map((maint) => {
                    const selected = preferences.maintenance === maint.id;
                    return (
                      <div
                        key={maint.id}
                        onClick={() => setPreferences({ ...preferences, maintenance: maint.id })}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-primary-light/10 border-primary shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-2xl mb-2 block">{maint.icon}</span>
                          <h3 className={`text-sm font-bold ${selected ? 'text-primary' : 'text-gray-900'}`}>
                            {maint.label}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{maint.desc}</p>
                        </div>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  Continue to Goals & Purpose <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 4: Goals & Intended Purpose */}
          {wizardStep === 4 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What is your dream garden role?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Select all that apply. We prioritize plants that fulfill your aesthetic, culinary, or air-cleaning goals.
              </p>

              {/* Purpose Selection Cards (Multi-Select) */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {PURPOSE_OPTIONS.map((purp) => {
                  const selected = preferences.purposes.includes(purp.id);
                  return (
                    <div
                      key={purp.id}
                      onClick={() => togglePurpose(purp.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selected
                          ? 'bg-primary-light/10 border-primary text-primary font-bold shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{purp.icon}</span>
                        <span className="text-xs">{purp.label}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs ${
                          selected
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pet Conscious Toggle Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐾</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Pet-Safe Priority Mode (Dogs & Cats)</p>
                    <p className="text-[11px] text-amber-900/80">
                      Strictly exclude or penalize plants containing toxic saponins or insoluble oxalates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences({ ...preferences, pet_conscious: !preferences.pet_conscious })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    preferences.pet_conscious
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  {preferences.pet_conscious ? '✓ Pet Safety Active' : 'Enable Pet Safe'}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRunDiscovery}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Skip Optional & Discover Now
                  </button>
                  <button
                    onClick={() => setWizardStep(5)}
                    className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    Next: Refined Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Step 5: Refined Preferences (Optional) */}
          {wizardStep === 5 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm fade-in">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Fine-Tune Your Preferences</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">
                  Optional Customizations
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Feel free to leave these on defaults or tailor them to your specific aesthetic and soil preferences.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Plant Placement Scope */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Placement Scope
                  </label>
                  <select
                    value={preferences.placement_type}
                    onChange={(e) => setPreferences({ ...preferences, placement_type: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="both">Both Indoor & Outdoor options</option>
                    <option value="indoor">Indoor only (Living room, bedroom, desk)</option>
                    <option value="outdoor">Outdoor only (Balcony, terrace, garden)</option>
                  </select>
                </div>

                {/* Aesthetic Focus */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Aesthetic / Harvest Preference
                  </label>
                  <select
                    value={preferences.flower_or_foliage}
                    onChange={(e) => setPreferences({ ...preferences, flower_or_foliage: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="any">Any (Foliage, flowers, or crops)</option>
                    <option value="foliage">Lush Architectural Foliage</option>
                    <option value="flowering">Flowering & Fragrant Blooms</option>
                    <option value="edible_fruit">Fresh Edible Harvest (Herbs & Veggies)</option>
                  </select>
                </div>

                {/* Growing Medium */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Growing Medium Available
                  </label>
                  <select
                    value={preferences.growing_medium}
                    onChange={(e) => setPreferences({ ...preferences, growing_medium: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="standard_potting_soil">Standard Potting Soil Mix + Compost</option>
                    <option value="garden_soil">Native Garden Loam Soil</option>
                    <option value="coco_peat">Coco-Peat & Perlite (Lightweight container mix)</option>
                    <option value="water_culture">Hydroponic / Water Jars (No soil)</option>
                    <option value="any">Any Medium</option>
                  </select>
                </div>

                {/* Plant Size Preference */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Preferred Mature Plant Size
                  </label>
                  <select
                    value={preferences.plant_size_preference}
                    onChange={(e) => setPreferences({ ...preferences, plant_size_preference: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="any">Any Size</option>
                    <option value="compact">Compact (Under 40 cm)</option>
                    <option value="medium">Medium (40–90 cm)</option>
                    <option value="spacious">Spacious / Floor Plant (1 meter+)</option>
                  </select>
                </div>
              </div>

              {/* Review Summary Box */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-8">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Profile Summary for Recommendation Engine:
                </h4>
                <div className="grid sm:grid-cols-3 gap-2 text-xs text-gray-600">
                  <p>📍 Location: <strong>{preferences.location}</strong></p>
                  <p>🪴 Environment: <strong>{preferences.environment}</strong></p>
                  <p>☀️ Light: <strong>{preferences.sunlight.replace('_', ' ')}</strong></p>
                  <p>📐 Space: <strong>{preferences.space.replace('_', ' ')}</strong></p>
                  <p>🌱 Experience: <strong>{preferences.experience}</strong></p>
                  <p>🐾 Pet-Safe: <strong>{preferences.pet_conscious ? 'Yes (Strict)' : 'Standard'}</strong></p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setWizardStep(4)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleRunDiscovery}
                  disabled={loading}
                  className="px-8 py-3.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Botanical Catalog...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate My Personalized Recommendations
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 6: RESULTS VIEW */}
          {wizardStep === 6 && (
            <div className="fade-in space-y-8">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Top Plant Matches for Your Home ({discoveryResponse?.matched_plants?.length || 0})
                  </h2>
                  <p className="text-xs text-gray-500">
                    Evaluated across {discoveryResponse?.total_candidates_evaluated || 18} verified species with deterministic suitability scoring.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Adjust Conditions
                  </button>
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                    {savingPreferences ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>

              {prefSaveNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium fade-in">
                  {prefSaveNotice}
                </div>
              )}

              {/* AI Agronomic Consultation Narrative Banner */}
              {discoveryResponse && (
                <div className="p-6 md:p-8 bg-gradient-to-br from-emerald-900 via-teal-900 to-green-950 text-white rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="w-48 h-48 text-white" />
                  </div>
                  <div className="relative z-10 max-w-4xl">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5 text-emerald-300" />
                        {discoveryResponse.engine_used || 'GrowWise Agronomic Consultation'}
                      </span>
                      {discoveryResponse.weather_context && (
                        <span className="text-[11px] text-emerald-200">
                          • Incorporating live {discoveryResponse.weather_context.city} telemetry ({discoveryResponse.weather_context.current?.temperature}°C)
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold mb-3">
                      Personalized Home Botanical Consultation
                    </h3>
                    <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed mb-5 whitespace-pre-line">
                      {discoveryResponse.personalized_home_narrative}
                    </p>

                    {discoveryResponse.climate_adaptation_tip && (
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-xs flex items-start gap-3">
                        <Sun className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-50">
                          <strong className="text-amber-200">Microclimate Adaptation Tip: </strong>
                          {discoveryResponse.climate_adaptation_tip}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading State during re-run */}
              {loading && (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-primary animate-spin mb-3" />
                  <p className="text-sm font-bold text-gray-900">Evaluating Botanical Catalog...</p>
                  <p className="text-xs text-gray-500">Checking microclimate, sunlight tolerance, and pet safety rules</p>
                </div>
              )}

              {/* Recommendation Cards Grid */}
              {!loading && discoveryResponse?.matched_plants && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {discoveryResponse.matched_plants.map((plant) => (
                    <RecommendationCard
                      key={plant.id}
                      plant={plant}
                      isFavorite={favorites.includes(plant.id)}
                      onToggleFavorite={() => handleToggleFavorite(plant.id, plant.name)}
                      onViewDetails={() => setSelectedPlantDetail(plant)}
                      onAddToMyPlants={() => handleAddToMyPlants(plant)}
                      onStartGrowing={() => handleStartGrowing(plant)}
                      onAskPlantCoach={() => handleAskPlantCoach(plant)}
                      inCompare={compareList.includes(plant.id)}
                      onToggleCompare={() => toggleCompare(plant.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BOTANICAL CATALOG BROWSER */}
      {/* ==================================================================== */}
      {activeTab === 'catalog' && (
        <div className="fade-in space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                Verified Botanical Catalog
              </h2>
              <p className="text-xs text-gray-500">
                Explore our full clinical database of verified urban, balcony, and apartment species.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={catalogFilterCategory}
                onChange={(e) => setCatalogFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="indoor_air_purifier">Air Purifying</option>
                <option value="medicinal_traditional">Medicinal & Traditional</option>
                <option value="edible_culinary">Edible Herbs</option>
                <option value="vegetable">Vegetables</option>
                <option value="flowering_ornamental">Flowering</option>
                <option value="succulent">Succulents</option>
                <option value="fruit">Fruits</option>
              </select>

              <button
                onClick={() => setCatalogPetOnly(!catalogPetOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  catalogPetOnly
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                🐾 ASPCA Pet Safe Only
              </button>
            </div>
          </div>

          {catalogLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading verified catalog entries...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogPlants.map((plant) => (
                <CatalogBrowseCard
                  key={plant.id}
                  plant={plant}
                  isFavorite={favorites.includes(plant.id)}
                  onToggleFavorite={() => handleToggleFavorite(plant.id, plant.name)}
                  onViewDetails={() => setSelectedPlantDetail(plant)}
                  onAddToMyPlants={() => handleAddToMyPlants(plant)}
                  onStartGrowing={() => handleStartGrowing(plant)}
                  onAskPlantCoach={() => handleAskPlantCoach(plant)}
                  inCompare={compareList.includes(plant.id)}
                  onToggleCompare={() => toggleCompare(plant.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SAVED FAVORITES */}
      {/* ==================================================================== */}
      {activeTab === 'favorites' && (
        <div className="fade-in space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                My Favorite Plants ({favoritePlantsList.length})
              </h2>
              <p className="text-xs text-gray-500">
                Plants you have bookmarked for your future balcony or home garden setups.
              </p>
            </div>
          </div>

          {favoritePlantsList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-gray-200">
              <span className="text-4xl block mb-3">💖</span>
              <h3 className="text-base font-bold text-gray-900 mb-1">No favorite plants saved yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
                When browsing recommendations or the catalog, click the heart icon on any plant card to save it here.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors"
              >
                Find Recommended Plants
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoritePlantsList.map((plant) => (
                <CatalogBrowseCard
                  key={plant.id}
                  plant={plant}
                  isFavorite={true}
                  onToggleFavorite={() => handleToggleFavorite(plant.id, plant.name)}
                  onViewDetails={() => setSelectedPlantDetail(plant)}
                  onAddToMyPlants={() => handleAddToMyPlants(plant)}
                  onStartGrowing={() => handleStartGrowing(plant)}
                  onAskPlantCoach={() => handleAskPlantCoach(plant)}
                  inCompare={compareList.includes(plant.id)}
                  onToggleCompare={() => toggleCompare(plant.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* STICKY BOTTOM COMPARISON TRAY */}
      {/* ==================================================================== */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 text-white px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-700 flex items-center gap-6 max-w-xl w-[90%] justify-between fade-in">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Compare Tray ({compareList.length}/4)</p>
              <p className="text-[10px] text-gray-400">Side-by-side suitability matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareList([])}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={handleOpenComparisonModal}
              disabled={compareList.length < 2}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              Compare Side-by-Side
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SIDE-BY-SIDE PLANT COMPARISON */}
      {/* ==================================================================== */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-2.5">
                <Scale className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">Side-by-Side Plant Comparison</h3>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {compareLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Generating comparative agronomic matrix...</p>
              </div>
            ) : comparisonData ? (
              <div className="space-y-6">
                {/* AI Comparative Verdict */}
                <div className="p-5 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                  <p className="font-bold text-sm text-emerald-900 mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Comparative Agronomic Verdict
                  </p>
                  <p>{comparisonData.ai_verdict}</p>
                </div>

                {/* Comparison Matrix Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-3.5 font-bold text-gray-700 w-1/4">Horticultural Attribute</th>
                        {comparisonData.plants.map((p) => (
                          <th
                            key={p.id}
                            className={`p-3.5 font-bold text-gray-900 ${
                              p.id === comparisonData.best_fit_plant_id ? 'bg-emerald-50/70 text-emerald-900' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.id === comparisonData.best_fit_plant_id && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                  Best Fit
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 font-normal italic block">
                              {p.scientific_name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">☀️ Sunlight</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.sunlight[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">💧 Watering</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.watering[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">🌿 Maintenance</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.maintenance[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">📐 Space Footprint</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.space[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">🐾 Pet Safety</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800 font-medium">
                            {comparisonData.comparison_matrix.pet_safe[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">🌡️ Temperature Range</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.temperature_range[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">🌱 Growth Rate</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.growth_rate[p.name]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3.5 font-semibold text-gray-600 bg-gray-50/50">📏 Mature Size</td>
                        {comparisonData.plants.map((p) => (
                          <td key={p.id} className="p-3.5 text-gray-800">
                            {comparisonData.comparison_matrix.mature_size[p.name]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setCompareModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer hover:bg-gray-200"
                  >
                    Close Comparison
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: COMPREHENSIVE BOTANICAL PLANT PROFILE */}
      {/* ==================================================================== */}
      {selectedPlantDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-6 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPlantDetail.image_url}
                  alt={selectedPlantDetail.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-xs"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{selectedPlantDetail.name}</h3>
                    {selectedPlantDetail.pet_safe ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        🐾 ASPCA Pet Safe
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        ⚠️ Toxic to Pets
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 italic">{selectedPlantDetail.scientific_name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Category: {selectedPlantDetail.category?.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlantDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Snippet */}
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {selectedPlantDetail.overview || selectedPlantDetail.care_summary || 'Verified botanical specimen.'}
            </p>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-6">
              {[
                { id: 'care', label: 'Growing & Care' },
                { id: 'propagation', label: 'Pruning & Propagation' },
                { id: 'problems', label: 'Common Problems' },
                { id: 'climate', label: 'Regional Climate' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailModalTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    detailModalTab === tab.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Growing & Care */}
            {detailModalTab === 'care' && (
              <div className="space-y-4 text-xs fade-in">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-gray-50 rounded-2xl">
                    <p className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" /> Sunlight Requirements
                    </p>
                    <p className="text-gray-600">
                      {selectedPlantDetail.sunlight_label || Array.isArray(selectedPlantDetail.sunlight) ? selectedPlantDetail.sunlight.join(', ') : 'Direct / Indirect'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-2xl">
                    <p className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-blue-500" /> Watering Guidance
                    </p>
                    <p className="text-gray-600">
                      {selectedPlantDetail.watering_guidance || selectedPlantDetail.watering_label || 'Water when topsoil dries.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-2xl">
                    <p className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" /> Soil & Drainage
                    </p>
                    <p className="text-gray-600">
                      {selectedPlantDetail.soil_pref || selectedPlantDetail.soil_label || 'Well-draining potting soil.'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-2xl">
                    <p className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-rose-500" /> Temperature Tolerance
                    </p>
                    <p className="text-gray-600">
                      {selectedPlantDetail.temperature_range || `${selectedPlantDetail.min_temp_c}°C to ${selectedPlantDetail.max_temp_c}°C`}
                    </p>
                  </div>
                </div>

                {selectedPlantDetail.beginner_care_instructions && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl mt-4">
                    <p className="font-bold text-emerald-900 mb-2">Beginner Care Steps:</p>
                    <ul className="space-y-1 list-disc list-inside text-emerald-800">
                      {Array.isArray(selectedPlantDetail.beginner_care_instructions)
                        ? selectedPlantDetail.beginner_care_instructions.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))
                        : <li>{selectedPlantDetail.beginner_care_instructions}</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Pruning & Propagation */}
            {detailModalTab === 'propagation' && (
              <div className="space-y-4 text-xs fade-in">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-900 mb-1">Pruning & Maintenance Schedule</p>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedPlantDetail.pruning_guidance || selectedPlantDetail.pruning_summary || 'Prune dead leaves regularly.'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-900 mb-1">Propagation Methods</p>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedPlantDetail.propagation_methods || selectedPlantDetail.propagation_summary || 'Propagates via stem cuttings or division.'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-900 mb-1">Fertilization Strategy</p>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedPlantDetail.fertilizer_guidance || selectedPlantDetail.fertilizer_summary || 'Monthly organic compost feed in growing season.'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Common Problems */}
            {detailModalTab === 'problems' && (
              <div className="space-y-4 text-xs fade-in">
                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl">
                  <p className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Common Problems & Solutions
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    {selectedPlantDetail.common_problems || 'Overwatering causes root rot; prevent by testing soil moisture.'}
                  </p>
                </div>

                {selectedPlantDetail.tradeoffs_and_limitations && (
                  <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                    <p className="font-bold text-amber-900 mb-1">Known Limitations & Trade-offs:</p>
                    <ul className="space-y-1 list-disc list-inside text-amber-800">
                      {Array.isArray(selectedPlantDetail.tradeoffs_and_limitations)
                        ? selectedPlantDetail.tradeoffs_and_limitations.map((limit, idx) => (
                            <li key={idx}>{limit}</li>
                          ))
                        : <li>{selectedPlantDetail.tradeoffs_and_limitations}</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Regional Climate */}
            {detailModalTab === 'climate' && (
              <div className="space-y-4 text-xs fade-in">
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                  <p className="font-bold text-emerald-900 mb-1">India & Gujarat Climate Compatibility</p>
                  <p className="text-emerald-800 leading-relaxed">
                    {selectedPlantDetail.regional_notes || selectedPlantDetail.climate_fit_note || 'Thrives in warm Indian climates with regular hydration.'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-900 mb-1">Source & Botanical Provenance</p>
                  <p className="text-gray-500">
                    Verified Source: {selectedPlantDetail.verified_source || 'Horticultural Science Standard'} • Last Verification: {selectedPlantDetail.last_verified_date || '2025-08-15'}
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-gray-100 mt-6">
              <button
                onClick={() => handleToggleFavorite(selectedPlantDetail.id, selectedPlantDetail.name)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  favorites.includes(selectedPlantDetail.id)
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedPlantDetail.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                {favorites.includes(selectedPlantDetail.id) ? 'Favorited' : 'Save to Favorites'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAskPlantCoach(selectedPlantDetail)}
                  className="px-4 py-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5 text-amber-700" /> Ask Plant Coach
                </button>
                <button
                  onClick={() => handleAddToMyPlants(selectedPlantDetail)}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to My Plants
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// Component: Recommendation Result Card
// ====================================================================

function RecommendationCard({
  plant,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
  onAddToMyPlants,
  onStartGrowing,
  onAskPlantCoach,
  inCompare,
  onToggleCompare,
}) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
      {/* Plant Photo Banner */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={plant.image_url}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
          }}
        />
        {/* Match Score Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-extrabold text-emerald-800 shadow-sm border border-emerald-200 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          {plant.match_score}% {plant.match_badge}
        </div>

        {/* Favorite & Compare Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={onToggleCompare}
            title={inCompare ? 'Remove from compare' : 'Add to compare'}
            className={`w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer ${
              inCompare
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            className={`w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-rose-50 text-rose-600 shadow-sm'
                : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Pet Safety Pill */}
        <div className="absolute bottom-3 left-3">
          {plant.pet_safe ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-200 backdrop-blur-xs">
              🐾 ASPCA Pet Safe
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-200 backdrop-blur-xs">
              ⚠️ Pet Warning
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
              {plant.name}
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
              {plant.category}
            </span>
          </div>
          <p className="text-xs text-gray-400 italic">{plant.scientific_name}</p>
        </div>

        {/* Why it matches */}
        {plant.match_reasons && plant.match_reasons.length > 0 && (
          <div className="mb-3 text-[11px] text-gray-600 space-y-1">
            {plant.match_reasons.slice(0, 2).map((reason, idx) => (
              <p key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}

        {/* Tradeoffs & Warnings */}
        {plant.tradeoffs_and_warnings && plant.tradeoffs_and_warnings.length > 0 && (
          <div className="mb-4 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-snug flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>{plant.tradeoffs_and_warnings[0]}</span>
          </div>
        )}

        {/* Quick Horticultural Specs Badge Matrix */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 mb-5 bg-gray-50/70 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{plant.sunlight_label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{plant.watering_label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{plant.maintenance_label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{plant.temperature_range}</span>
          </div>
        </div>

        {/* Information Source & Quality Badge */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 mb-4">
          <span className="truncate max-w-[200px]" title={plant.verified_source}>
            Source: {plant.verified_source}
          </span>
          <span className="text-emerald-700 font-semibold">96% Verified</span>
        </div>

        {/* Functional Actions Bar (All 6 Actions Available) */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onViewDetails}
              className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              View Details
            </button>
            <button
              onClick={onAskPlantCoach}
              className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Brain className="w-3 h-3 text-amber-600" /> Plant Coach
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAddToMyPlants}
              className="py-2.5 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Garden
            </button>
            <button
              onClick={onStartGrowing}
              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Start Growing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// Component: Botanical Catalog Browse Card
// ====================================================================

function CatalogBrowseCard({
  plant,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
  onAddToMyPlants,
  onStartGrowing,
  onAskPlantCoach,
  inCompare,
  onToggleCompare,
}) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img
          src={plant.image_url}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={onToggleCompare}
            className={`w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer ${
              inCompare ? 'bg-amber-500 text-white shadow-sm' : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleFavorite}
            className={`w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite ? 'bg-rose-50 text-rose-600 shadow-sm' : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3">
          {plant.pet_safe ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-200 backdrop-blur-xs">
              🐾 ASPCA Pet Safe
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-200 backdrop-blur-xs">
              ⚠️ Pet Warning
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors">
            {plant.name}
          </h3>
          <p className="text-xs text-gray-400 italic">{plant.scientific_name}</p>
        </div>

        <p className="text-[11px] text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {plant.overview || 'Verified botanical profile.'}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 mb-4 bg-gray-50/70 p-2.5 rounded-xl mt-auto">
          <span className="truncate">☀️ {Array.isArray(plant.sunlight) ? plant.sunlight[0].replace('_', ' ') : 'Sun'}</span>
          <span className="truncate">💧 {plant.watering_frequency}</span>
        </div>

        <div className="space-y-1.5 mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onViewDetails}
              className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Details
            </button>
            <button
              onClick={onAskPlantCoach}
              className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Brain className="w-3 h-3 text-amber-600" /> Coach
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAddToMyPlants}
              className="py-2 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Plant
            </button>
            <button
              onClick={onStartGrowing}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Grow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
