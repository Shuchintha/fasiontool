import { Routes, Route, Link } from 'react-router-dom';
import BrowsePage from './pages/BrowsePage';
import UploadPage from './pages/UploadPage';
import ImageDetailPage from './pages/ImageDetailPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Fashion Classifier
            </Link>
            <div className="flex gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse
              </Link>
              <Link
                to="/upload"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Upload
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/image/:id" element={<ImageDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
