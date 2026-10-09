import { useState } from 'react';
import { X, Camera, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function Diagnosis() {
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Mock API call delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult({
        disease: "Healthy Leaf",
        confidence: "96%",
        status: "Healthy",
        description: "The leaf appears healthy with no significant visible disease symptoms.",
        recommendations: [
          "Continue regular watering",
          "Maintain adequate sunlight",
          "Monitor leaves regularly"
        ]
      });
    }, 2500);
  };

  const reset = () => {
    setImagePreview(null);
    setResult(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto fade-in pb-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">AI Plant Health Check</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Upload a clear photo of a plant leaf and let our AI analyze its health and detect potential diseases.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100">
        {!imagePreview ? (
          <div className="mt-2 flex justify-center px-6 pt-12 pb-16 border-2 border-gray-300 border-dashed rounded-2xl hover:bg-gray-50 transition-colors group">
            <div className="space-y-4 text-center">
              <div className="bg-primary-light/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Camera className="mx-auto h-10 w-10 text-primary" />
              </div>
              <div className="flex text-lg text-gray-600 justify-center font-medium">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md text-primary hover:text-primary-dark focus-within:outline-none">
                  <span>Choose Image</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                </label>
                <p className="pl-2">or drag & drop here</p>
              </div>
              <p className="text-sm text-gray-500">Supported formats: JPG, JPEG, PNG, WEBP</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative rounded-2xl overflow-hidden max-h-[500px] flex justify-center bg-gray-900">
              <img src={imagePreview} alt="Preview" className="max-w-full max-h-[500px] object-contain" />
              {!isAnalyzing && !result && (
                <button 
                  onClick={reset}
                  className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow hover:bg-white text-gray-600 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary-light" />
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    Analyzing your plant...
                  </h3>
                  <p className="text-white/80">AI is checking leaf patterns and symptoms.</p>
                </div>
              )}
            </div>

            {!isAnalyzing && !result && (
              <div className="flex justify-center">
                <button 
                  onClick={handleAnalyze}
                  className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 w-full md:w-auto justify-center"
                >
                  <Sparkles className="w-6 h-6" />
                  Analyze Plant
                </button>
              </div>
            )}
            
            {result && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 md:p-8 border border-green-100 fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Plant Health Result</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <ResultCard label="Disease" value={result.disease} />
                  <ResultCard label="Confidence" value={result.confidence} />
                  <ResultCard label="Status" value={result.status} color="text-green-600" />
                </div>
                
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">What we found</h3>
                  <p className="text-gray-700 leading-relaxed">{result.description}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-8 pt-6 border-t border-green-200/50 flex justify-center">
                   <button 
                    onClick={reset}
                    className="text-primary font-medium hover:underline bg-white px-6 py-2.5 rounded-xl shadow-sm border border-gray-100"
                  >
                    Analyze another image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
