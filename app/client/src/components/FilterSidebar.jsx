import { useState } from 'react';

const FILTER_LABELS = {
  garment_type: 'Garment Type',
  style: 'Style',
  material: 'Material',
  pattern: 'Pattern',
  season: 'Season',
  occasion: 'Occasion',
  consumer_profile: 'Consumer Profile',
  location_continent: 'Continent',
  location_country: 'Country',
  location_city: 'City',
  designer: 'Designer',
  year: 'Year',
  month: 'Month',
};

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const FILTER_ORDER = [
  'garment_type', 'style', 'material', 'pattern', 'season', 'occasion',
  'consumer_profile', 'location_continent', 'location_country', 'location_city',
  'designer', 'year', 'month',
];

export default function FilterSidebar({ filters, activeFilters, searchQuery, onFilterChange, onSearchChange, onClear }) {
  const [collapsed, setCollapsed] = useState({});

  const hasActiveFilters = searchQuery || Object.values(activeFilters).some(v =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  const toggleCollapse = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleValue = (filterKey, value) => {
    const current = activeFilters[filterKey] || [];
    const arr = Array.isArray(current) ? current : [current];
    const updated = arr.includes(value)
      ? arr.filter(v => v !== value)
      : [...arr, value];
    onFilterChange(filterKey, updated);
  };

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-4">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search descriptions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="w-full mb-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Clear all filters
          </button>
        )}

        {/* Filter groups */}
        <div className="space-y-2">
          {FILTER_ORDER.map(key => {
            const values = filters[key];
            if (!values || values.length === 0) return null;

            const isCollapsed = collapsed[key];
            const selected = activeFilters[key] || [];
            const selectedArr = Array.isArray(selected) ? selected : [selected];

            return (
              <div key={key} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <button
                  onClick={() => toggleCollapse(key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  <span>
                    {FILTER_LABELS[key] || key}
                    {selectedArr.length > 0 && (
                      <span className="ml-1 bg-indigo-900/50 text-indigo-300 text-xs px-1.5 py-0.5 rounded-full">
                        {selectedArr.length}
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="px-3 pb-2 max-h-48 overflow-y-auto">
                    {values.map(val => (
                      <label key={val} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedArr.includes(val)}
                          onChange={() => toggleValue(key, val)}
                          className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                        />
                        <span className="text-gray-400 truncate">
                          {key === 'month' ? (MONTH_NAMES[val] || val) : val}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
