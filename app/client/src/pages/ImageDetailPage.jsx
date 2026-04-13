import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getImage, addAnnotation, updateAnnotation, deleteAnnotation } from '../api';

export default function ImageDetailPage() {
  const { id } = useParams();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Annotation form state
  const [designer, setDesigner] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchImage = useCallback(async () => {
    try {
      const data = await getImage(id);
      setImage(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  const handleSaveAnnotation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (editingId) {
        await updateAnnotation(editingId, { designer, tags: tagArray, notes });
        setEditingId(null);
      } else {
        await addAnnotation(id, { designer, tags: tagArray, notes });
      }
      setDesigner('');
      setTags('');
      setNotes('');
      await fetchImage();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (annot) => {
    setEditingId(annot.id);
    setDesigner(annot.designer || '');
    setTags(Array.isArray(annot.tags) ? annot.tags.join(', ') : '');
    setNotes(annot.notes || '');
  };

  const handleDelete = async (annotId) => {
    try {
      await deleteAnnotation(annotId);
      await fetchImage();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDesigner('');
    setTags('');
    setNotes('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error || 'Image not found'}</p>
        <Link to="/" className="text-indigo-600 hover:underline mt-4 block">Back to library</Link>
      </div>
    );
  }

  const colors = Array.isArray(image.color_palette) ? image.color_palette : [];
  const location = [image.location_city, image.location_country, image.location_continent]
    .filter(v => v && v !== 'Unknown')
    .join(', ');

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">&larr; Back to library</Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <img
            src={`/uploads/${image.filename}`}
            alt={image.original_name}
            className="w-full rounded-xl shadow-sm"
          />
          <p className="text-xs text-gray-400 mt-2">{image.original_name} &middot; {new Date(image.upload_date).toLocaleDateString()}</p>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* AI Generated Section */}
          <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-indigo-200 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded">
                AI Generated
              </span>
            </div>

            {image.description && (
              <p className="text-gray-700 mb-4">{image.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Attr label="Garment Type" value={image.garment_type} />
              <Attr label="Style" value={image.style} />
              <Attr label="Material" value={image.material} />
              <Attr label="Pattern" value={image.pattern} />
              <Attr label="Season" value={image.season} />
              <Attr label="Occasion" value={image.occasion} />
              <Attr label="Consumer Profile" value={image.consumer_profile} />
              <Attr label="Location" value={location || 'Unknown'} />
            </div>

            {colors.length > 0 && (
              <div className="mt-4">
                <span className="text-gray-500 text-xs uppercase">Color Palette</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {colors.map((c, i) => (
                    <span key={i} className="bg-white text-gray-700 px-2 py-1 rounded text-xs border">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {image.trend_notes && image.trend_notes !== 'Unknown' && (
              <div className="mt-4">
                <span className="text-gray-500 text-xs uppercase">Trend Notes</span>
                <p className="text-gray-600 text-sm mt-1">{image.trend_notes}</p>
              </div>
            )}
          </section>

          {/* Designer Notes Section */}
          <section className="bg-amber-50 rounded-xl p-6 border border-amber-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded">
                Designer Notes
              </span>
            </div>

            {/* Existing annotations */}
            {image.annotations?.length > 0 ? (
              <div className="space-y-3 mb-4">
                {image.annotations.map(annot => (
                  <div key={annot.id} className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{annot.designer || 'Anonymous'}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(annot)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(annot.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
                    </div>
                    {annot.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {annot.tags.map((tag, i) => (
                          <span key={i} className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    {annot.notes && <p className="text-sm text-gray-600">{annot.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(annot.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No designer notes yet. Add your observations below.</p>
            )}

            {/* Add/edit annotation form */}
            <form onSubmit={handleSaveAnnotation} className="space-y-3">
              <input
                type="text"
                placeholder="Your name"
                value={designer}
                onChange={(e) => setDesigner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                placeholder="Tags (comma-separated, e.g., artisan, handmade, vibrant)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <textarea
                placeholder="Your notes and observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || (!designer && !tags && !notes)}
                  className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Note' : 'Add Note'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Attr({ label, value }) {
  if (!value || value === 'Unknown') return null;
  return (
    <div>
      <span className="text-gray-500 text-xs uppercase">{label}</span>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}
