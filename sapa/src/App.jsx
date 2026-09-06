import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SapaProvider } from './hooks/useVisitor.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import NamePrompt from './components/NamePrompt.jsx';
import Home from './pages/Home.jsx';
import Meter from './pages/Meter.jsx';
import Battle from './pages/Battle.jsx';
import Lab from './pages/Lab.jsx';
import Privacy from './pages/Privacy.jsx';

// Admin is never opened by a normal visitor, so it is split out of the
// main bundle entirely.
const Admin = lazy(() => import('./pages/Admin.jsx'));

export default function App() {
  return (
    <SapaProvider>
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/meter" element={<Meter />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Not linked from the public UI; see pages/Admin.jsx. */}
            <Route
              path="/admin"
              element={
                <Suspense fallback={<p className="py-24 text-center font-mono text-sm text-bone-300">Loading…</p>}>
                  <Admin />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <NamePrompt />
      </div>
    </SapaProvider>
  );
}
