import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Pentesting from './pages/Pentesting';
import Grc from './pages/Grc';
import Ciso from './pages/Ciso';
import Training from './pages/Training';
import Licenses from './pages/Licenses';
import Physical from './pages/Physical';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pentesting" element={<Pentesting />} />
        <Route path="/grc" element={<Grc />} />
        <Route path="/ciso" element={<Ciso />} />
        <Route path="/training" element={<Training />} />
        <Route path="/licenses" element={<Licenses />} />
        <Route path="/physical" element={<Physical />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={null}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
