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

const Insights = lazy(() => import('./pages/Insights'));
const InsightArticle = lazy(() => import('./pages/InsightArticle'));
const About = lazy(() => import('./pages/About'));
const Faq = lazy(() => import('./pages/Faq'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Admin = lazy(() => import('./pages/Admin'));

const lazyRoute = (el: React.ReactNode) => <Suspense fallback={null}>{el}</Suspense>;

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
        <Route path="/insights" element={lazyRoute(<Insights />)} />
        <Route path="/insights/:slug" element={lazyRoute(<InsightArticle />)} />
        <Route path="/about" element={lazyRoute(<About />)} />
        <Route path="/faq" element={lazyRoute(<Faq />)} />
          <Route path="/assessment" element={<Assessment />} />
        <Route path="/admin" element={lazyRoute(<Admin />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
