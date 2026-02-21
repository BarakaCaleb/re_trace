import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateAsset from "./pages/CreateAsset";
import OEMPassport from "./pages/OEMPassport";
import Asset from "./pages/Asset";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const DashboardComp = Dashboard as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/oem/passport" element={<OEMPassport />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardComp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/assets/new"
        element={
          <ProtectedRoute>
            <CreateAsset />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/assets/:assetId"
        element={
          <ProtectedRoute>
            <Asset />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}