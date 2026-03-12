import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { LogOut, LayoutDashboard, ClipboardList, Settings, History, Building2, User, Menu, X, Users, Key, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import ChangePasswordModal from './components/ChangePasswordModal';
import Login from './pages/Login';
import TechDashboard from './pages/TechDashboard';
import MaintenanceForm from './pages/MaintenanceForm';
import CorrectiveForm from './pages/CorrectiveForm';
import AdminDashboard from './pages/AdminDashboard';
import AdminCondos from './pages/AdminCondos';
import AdminEquipment from './pages/AdminEquipment';
import AdminTechs from './pages/AdminTechs';
import HistoryPage from './pages/History';

import { useNotifications } from './hooks/useNotifications';

import TechIncidents from './pages/TechIncidents';
import OperatorDashboard from './pages/OperatorDashboard';
import OperatorIncidentForm from './pages/OperatorIncidentForm';
import OperatorHistory from './pages/OperatorHistory';

const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext);

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  useNotifications(user);

  const navItems = user?.role === 'admin' 
    ? [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { label: 'Usuarios', icon: Users, path: '/admin/techs' },
        { label: 'Condominios', icon: Building2, path: '/admin/condos' },
        { label: 'Equipos', icon: Settings, path: '/admin/equipment' },
        { label: 'Historial', icon: History, path: '/history' },
      ]
    : user?.role === 'operator'
    ? [
        { label: 'Panel', icon: LayoutDashboard, path: '/operator' },
        { label: 'Historial', icon: History, path: '/operator/history' },
      ]
    : [
        { label: 'Nueva Bitácora', icon: ClipboardList, path: '/tech' },
        { label: 'Incidencias', icon: AlertTriangle, path: '/tech/incidents' },
        { label: 'Mi Historial', icon: History, path: '/history' },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3 group">
            <Logo className="w-10 h-10 md:w-12 md:h-12 group-hover:scale-105 transition-transform" />
            <div>
              <span className="block font-black text-lg md:text-xl tracking-tight text-slate-700 leading-none">portería</span>
              <span className="block font-bold text-[10px] md:text-sm tracking-widest text-primary uppercase">virtual</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="flex items-center gap-2 text-slate-600 hover:text-primary font-medium transition-colors py-2"
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize mt-1">{user?.role === 'admin' ? 'Administrador' : 'Técnico'}</p>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(true)} 
                className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                title="Cambiar Contraseña"
              >
                <Key size={22} />
              </button>
              <button 
                onClick={logout} 
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={22} />
              </button>
            </div>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-600">
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-primary text-white border-t border-white/10"
          >
            <div className="p-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg"
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <hr className="border-white/10" />
              <button 
                onClick={() => { setIsPasswordModalOpen(true); setIsMenuOpen(false); }}
                className="flex items-center gap-3 p-2 text-white/80 hover:bg-white/10 rounded-lg"
              >
                <Key size={20} />
                <span>Cambiar Contraseña</span>
              </button>
              <button 
                onClick={() => { logout(); setIsMenuOpen(false); }}
                className="flex items-center gap-3 p-2 text-red-300 hover:bg-white/10 rounded-lg"
              >
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl mx-auto w-full p-3 md:p-6">
        {children}
      </main>

      <footer className="bg-slate-100 border-t py-6 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} portería virtual - Sistema de Bitácora de Mantención</p>
      </footer>
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/tech'} />;
  
  return <Layout>{children}</Layout>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: any, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/techs" element={<ProtectedRoute role="admin"><AdminTechs /></ProtectedRoute>} />
          <Route path="/admin/condos" element={<ProtectedRoute role="admin"><AdminCondos /></ProtectedRoute>} />
          <Route path="/admin/equipment" element={<ProtectedRoute role="admin"><AdminEquipment /></ProtectedRoute>} />
          
          <Route path="/tech" element={<ProtectedRoute role="tech"><TechDashboard /></ProtectedRoute>} />
          <Route path="/tech/incidents" element={<ProtectedRoute role="tech"><TechIncidents /></ProtectedRoute>} />
          <Route path="/tech/maintenance/:logId" element={<ProtectedRoute role="tech"><MaintenanceForm /></ProtectedRoute>} />
          <Route path="/tech/corrective/:logId" element={<ProtectedRoute role="tech"><CorrectiveForm /></ProtectedRoute>} />
          
          <Route path="/operator" element={<ProtectedRoute role="operator"><OperatorDashboard /></ProtectedRoute>} />
          <Route path="/operator/report/:condoId" element={<ProtectedRoute role="operator"><OperatorIncidentForm /></ProtectedRoute>} />
          <Route path="/operator/history" element={<ProtectedRoute role="operator"><OperatorHistory /></ProtectedRoute>} />
          
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginRedirect() {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'operator') return <Navigate to="/operator" />;
    return <Navigate to="/tech" />;
  }
  return <Login />;
}
