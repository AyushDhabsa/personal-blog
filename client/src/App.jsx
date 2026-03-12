import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './components/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ArticleList from './pages/ArticleList';
import ArticleView from './pages/ArticleView';
import Contact from './pages/Contact';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ArticleEditor from './pages/ArticleEditor';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <p style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>Loading...</p>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 180px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<ArticleList category="blog" />} />
          <Route path="/research" element={<ArticleList category="research" />} />
          <Route path="/article/:slug" element={<ArticleView />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/new" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/admin/edit/:id" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', borderRadius: 8 },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
