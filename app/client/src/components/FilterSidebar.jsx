export default function FilterSidebar({ filters, activeFilters, searchQuery, onFilterChange, onSearchChange, onClear }) {
  return (
    <div className="w-64 flex-shrink-0">
      <p className="text-sm text-gray-500">Filters loading...</p>
    </div>
  );
}
