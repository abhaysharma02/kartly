import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import VendorLogin from './pages/vendor/Login';
import VendorRegister from './pages/vendor/Register';
import VendorDashboard from './pages/vendor/Dashboard';
import CustomerMenu from './pages/customer/CustomerMenu';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Vendor Auth Routes */}
          <Route path="/vendor/login" element={<VendorLogin />} />
          <Route path="/vendor/register" element={<VendorRegister />} />

          {/* Protected Vendor Routes */}
          <Route
            path="/vendor/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="dashboard" element={<VendorDashboard />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Customer Ordering App (No Auth Required) */}
          <Route path="/q/:vendorId" element={<CustomerMenu />} />

          {/* Admin Routes (Simplified for now) */}
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/vendor/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
