import { Link } from 'react-router-dom';

export default function ImageCard({ image }) {
  const colors = Array.isArray(image.color_palette) ? image.color_palette : [];

  return (
    <Link
      to={`/image/${image.id}`}
      className="block bg-gray-900 rounded-lg shadow-sm border border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[3/4] overflow-hidden bg-gray-800">
        <img
          src={`/uploads/${image.filename}`}
          alt={image.original_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {image.garment_type && image.garment_type !== 'Unknown' && (
            <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded">
              {image.garment_type}
            </span>
          )}
          {image.style && image.style !== 'Unknown' && (
            <span className="bg-purple-900/50 text-purple-300 text-xs font-medium px-2 py-0.5 rounded">
              {image.style}
            </span>
          )}
          {image.season && image.season !== 'Unknown' && (
            <span className="bg-green-900/50 text-green-300 text-xs font-medium px-2 py-0.5 rounded">
              {image.season}
            </span>
          )}
        </div>
        {image.material && image.material !== 'Unknown' && (
          <p className="text-xs text-gray-400 truncate">{image.material}</p>
        )}
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {colors.slice(0, 3).map((c, i) => (
              <span key={i} className="text-xs text-gray-500">{c}</span>
            ))}
            {colors.length > 3 && <span className="text-xs text-gray-500">+{colors.length - 3}</span>}
          </div>
        )}
        {image.annotations?.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
            </svg>
            <span className="text-xs text-amber-400">{image.annotations.length} note{image.annotations.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
