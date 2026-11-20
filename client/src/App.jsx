import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminPartners from './pages/AdminPartners.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CollectionDrives from './pages/CollectionDrives.jsx';
import ImpactDashboard from './pages/ImpactDashboard.jsx';
import PartnerDashboard from './pages/PartnerDashboard.jsx';
import PickupDetails from './pages/PickupDetails.jsx';
import PublicPassport from './pages/PublicPassport.jsx';
import RegisterTextile from './pages/RegisterTextile.jsx';
import TextileDetail from './pages/TextileDetail.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { homePath } from './utils/navigation.js';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePath(user)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/login/admin" element={<AuthPage mode="login" adminOnly />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/p/:refId" element={<PublicPassport />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/textiles" element={<UserDashboard />} />
          <Route path="/textiles/new" element={<RegisterTextile />} />
          <Route path="/textiles/:id" element={<TextileDetail />} />
          <Route path="/pickups/:id" element={<PickupDetails />} />
          <Route path="/impact" element={<ImpactDashboard />} />
          <Route path="/drives" element={<CollectionDrives />} />
          <Route path="/workspace" element={<HomeRedirect />} />
        </Route>
        <Route element={<ProtectedRoute roles={['partner', 'admin']} />}>
          <Route path="/partner" element={<PartnerDashboard />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/partners" element={<AdminPartners />} />
        </Route>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
