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
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const FILTER_ORDER = [
  'garment_type', 'style', 'material', 'pattern', 'season', 'occasion',
  'consumer_profile', 'location_continent', 'location_country', 'location_city',
  'designer', 'year', 'month',
];

export default function FilterSidebar({ filters, activeFilters, searchQuery, onFilterChange, onSearchChange, onClear }) {
  // All sections expanded by default
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(FILTER_ORDER.map(key => [key, true]))
  );

  const hasActiveFilters = searchQuery || Object.values(activeFilters).some(v =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  // Collect all active chips for the summary
  const activeChips = [];
  FILTER_ORDER.forEach(key => {
    const selected = activeFilters[key] || [];
    const arr = Array.isArray(selected) ? selected : [selected];
    arr.forEach(val => {
      const label = key === 'month' ? (MONTH_NAMES[val] || val) : val;
      activeChips.push({ key, val, label });
    });
  });

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
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
    <aside className="w-60 flex-shrink-0">
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 scrollbar-thin">
        {/* Header + Search */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800/60 border border-gray-700/50 rounded-md text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeChips.map(({ key, val, label }) => (
              <button
                key={`${key}-${val}`}
                onClick={() => toggleValue(key, val)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-xs rounded-full hover:bg-indigo-500/25 transition-colors group"
              >
                <span className="truncate max-w-[7rem]">{label}</span>
                <svg className="w-3 h-3 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Filter groups — compact accordion */}
        <div className="space-y-0.5">
          {FILTER_ORDER.map(key => {
            const values = filters[key];
            if (!values || values.length === 0) return null;

            const isExpanded = expanded[key];
            const selected = activeFilters[key] || [];
            const selectedArr = Array.isArray(selected) ? selected : [selected];

            return (
              <div key={key} className="rounded-md overflow-hidden">
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-md transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {FILTER_LABELS[key] || key}
                    {selectedArr.length > 0 && (
                      <span className="w-4 h-4 flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold rounded-full leading-none">
                        {selectedArr.length}
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-2 pb-1.5 max-h-36 overflow-y-auto">
                    <div className="flex flex-wrap gap-1 pt-1">
                      {values.map(val => {
                        const isActive = selectedArr.includes(val);
                        const displayVal = key === 'month' ? (MONTH_NAMES[val] || val) : val;
                        return (
                          <button
                            key={val}
                            onClick={() => toggleValue(key, val)}
                            className={`px-2 py-0.5 text-xs rounded-md border transition-all ${
                              isActive
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                            }`}
                          >
                            {displayVal}
                          </button>
                        );
                      })}
                    </div>
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
