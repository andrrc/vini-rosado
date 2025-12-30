import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LandingPage } from './pages/LandingPage'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { UpdatePassword } from './pages/UpdatePassword'
import { HistoryDashboard } from './pages/HistoryDashboard'
import { CreateAnalysis } from './pages/CreateAnalysis'
import { AnalysisDetails } from './pages/AnalysisDetails'
import { AdminDashboard } from './pages/AdminDashboard'
import { ImageStudioPage } from './pages/ImageStudioPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <HistoryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/nova-analise"
            element={
              <ProtectedRoute>
                <CreateAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/analise/:id"
            element={
              <ProtectedRoute>
                <AnalysisDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/estudio-imagem/:id"
            element={
              <ProtectedRoute>
                <ImageStudioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

