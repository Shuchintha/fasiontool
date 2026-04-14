const API_BASE = '/api';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/images/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
  return res.json();
}

export async function getImages(page = 1, limit = 20) {
  const res = await fetch(`${API_BASE}/images?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch images');
  return res.json();
}

export async function getImage(id) {
  const res = await fetch(`${API_BASE}/images/${id}`);
  if (!res.ok) throw new Error('Failed to fetch image');
  return res.json();
}

export async function searchImages(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  }
  const res = await fetch(`${API_BASE}/images/search?${query}`);
  if (!res.ok) throw new Error('Failed to search images');
  return res.json();
}

export async function getFilters() {
  const res = await fetch(`${API_BASE}/filters`);
  if (!res.ok) throw new Error('Failed to fetch filters');
  return res.json();
}

export async function addAnnotation(imageId, data) {
  const res = await fetch(`${API_BASE}/images/${imageId}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to add annotation');
  return res.json();
}

export async function updateAnnotation(annotationId, data) {
  const res = await fetch(`${API_BASE}/annotations/${annotationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update annotation');
  return res.json();
}

export async function deleteAnnotation(annotationId) {
  const res = await fetch(`${API_BASE}/annotations/${annotationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete annotation');
  return res.json();
}

export async function deleteImage(id) {
  const res = await fetch(`${API_BASE}/images/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete image');
  return res.json();
}
