import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../api';

export default function UploadPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      setProgress(30);
      const data = await uploadImage(file);
      setProgress(100);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) handleUpload(e.target.files[0]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Upload Garment Image</h1>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-950/50'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900'
        }`}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-4 text-lg text-gray-300">
          {dragActive ? 'Drop your image here' : 'Drag & drop a garment photo, or click to browse'}
        </p>
        <p className="mt-2 text-sm text-gray-500">JPG, PNG, GIF, WebP up to 20MB</p>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Uploading & classifying...</span>
            <span className="text-sm text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result?.image && (
        <div className="mt-8 bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3">
              <img
                src={`/uploads/${result.image.filename}`}
                alt={result.image.original_name}
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
            <div className="p-6 md:w-2/3">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded">
                  AI Generated
                </span>
                <h2 className="text-lg font-semibold text-gray-100">Classification Results</h2>
              </div>

              {result.classificationError ? (
                <p className="text-amber-400">Classification failed: {result.classificationError}</p>
              ) : (
                <>
                  <p className="text-gray-300 mb-4">{result.image.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Attr label="Garment Type" value={result.image.garment_type} />
                    <Attr label="Style" value={result.image.style} />
                    <Attr label="Material" value={result.image.material} />
                    <Attr label="Pattern" value={result.image.pattern} />
                    <Attr label="Season" value={result.image.season} />
                    <Attr label="Occasion" value={result.image.occasion} />
                    <Attr label="Consumer" value={result.image.consumer_profile} />
                    <Attr label="Location" value={[result.image.location_city, result.image.location_country, result.image.location_continent].filter(v => v && v !== 'Unknown').join(', ') || 'Unknown'} />
                  </div>
                  {result.image.color_palette && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-xs uppercase">Colors</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(typeof result.image.color_palette === 'string'
                          ? JSON.parse(result.image.color_palette)
                          : result.image.color_palette
                        ).map((color, i) => (
                          <span key={i} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{color}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.image.trend_notes && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-xs uppercase">Trend Notes</span>
                      <p className="text-gray-300 text-sm mt-1">{result.image.trend_notes}</p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => navigate(`/image/${result.image.id}`)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-500"
                >
                  View Details
                </button>
                <button
                  onClick={() => { setResult(null); setProgress(0); }}
                  className="bg-gray-800 text-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Attr({ label, value }) {
  if (!value || value === 'Unknown') return null;
  return (
    <div>
      <span className="text-gray-400 text-xs uppercase">{label}</span>
      <p className="text-gray-100 font-medium">{value}</p>
    </div>
  );
}
