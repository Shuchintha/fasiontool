import { useState, useEffect, useCallback } from 'react';
import { getImages, searchImages, getFilters } from '../api';
import ImageCard from '../components/ImageCard';
import FilterSidebar from '../components/FilterSidebar';

export default function BrowsePage() {
  const [images, setImages] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFilters = useCallback(async () => {
    try {
      const data = await getFilters();
      setFilters(data);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  const fetchImages = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const hasFilters = searchQuery || Object.values(activeFilters).some(v =>
        Array.isArray(v) ? v.length > 0 : Boolean(v)
      );

      let data;
      if (hasFilters) {
        const params = { ...activeFilters, page, limit: 20 };
        if (searchQuery) params.q = searchQuery;
        data = await searchImages(params);
      } else {
        data = await getImages(page, 20);
      }

      setImages(data.images);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load images:', err);
      setError('Failed to load images. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeFilters, searchQuery]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchImages(1);
  }, [fetchImages]);

  const handleFilterChange = (key, values) => {
    setActiveFilters(prev => ({ ...prev, [key]: values }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <FilterSidebar
        filters={filters}
        activeFilters={activeFilters}
        searchQuery={searchQuery}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchQuery}
        onClear={handleClearFilters}
      />

      {/* Main content */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-100">
            Inspiration Library
            <span className="text-sm font-normal text-gray-400 ml-2">
              {pagination.total} image{pagination.total !== 1 ? 's' : ''}
            </span>
          </h1>
        </div>

        {error ? (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => fetchImages(1)}
              className="mt-3 text-sm text-indigo-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-600" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {searchQuery || Object.values(activeFilters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) ? (
              <>
                <p className="mt-4 text-gray-400">No images match your filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-sm text-indigo-400 hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <p className="mt-4 text-gray-400">No images found. Upload some garment photos to get started!</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map(img => (
                <ImageCard key={img.id} image={img} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => fetchImages(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 rounded border border-gray-700 text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchImages(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 rounded border border-gray-700 text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
