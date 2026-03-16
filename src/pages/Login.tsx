import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Hammer, Monitor, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { useAuth } from '../App';
import { Logo } from '../components/Logo';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleQuickLogin = async (email: string, roleName: string) => {
    setError('');
    setLoading(roleName);

    try {
      const { user, token } = await api.login({ email });
      login(user, token);
      
      // Admin a /admin, otros a /tech (Dashboard tecnico/operador)
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'operator') navigate('/operator');
      else navigate('/tech');
      
    } catch (err: any) {
      setError(`Error al ingresar como ${roleName}: ${err.message}`);
      setLoading(null);
    }
  };

  const users = [
    { 
      role: 'admin', 
      name: 'Administrador', 
      email: 'admin@pvirtual.cl', 
      icon: <Shield className="w-8 h-8" />,
      color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:border-blue-200',
      description: 'Gestión completa de edificios, equipos y personal.'
    },
    { 
      role: 'tech', 
      name: 'Técnico', 
      email: 'tecnico@pvirtual.cl', 
      icon: <Hammer className="w-8 h-8" />,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200',
      description: 'Realizar mantenciones y ver equipos asignados.'
    },
    { 
      role: 'operator', 
      name: 'Operador', 
      email: 'operador@pvirtual.cl', 
      icon: <Monitor className="w-8 h-8" />,
      color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100 hover:border-purple-200',
      description: 'Reportar incidencias y monitorear el estado.'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px]"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="p-10 text-center pb-6">
            <div className="flex items-center justify-center mx-auto mb-4">
              <Logo className="w-20 h-20" />
            </div>
            <h1 className="text-3xl font-black text-slate-700 tracking-tight">portería <span className="text-primary">virtual</span></h1>
            <p className="text-slate-500 text-sm mt-4 font-medium uppercase tracking-widest">Acceso Rápido por Rol</p>
          </div>

          <div className="px-8 pb-10 space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-100"
              >
                <AlertCircle size={20} />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            <div className="grid gap-4">
              {users.map((user) => (
                <button
                  key={user.role}
                  disabled={loading !== null}
                  onClick={() => handleQuickLogin(user.email, user.name)}
                  className={`flex items-center gap-5 p-5 text-left transition-all border-2 rounded-2xl group relative ${user.color} ${loading === user.name ? 'opacity-80 scale-95' : 'hover:-translate-y-1'}`}
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                    {user.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight">{user.name}</h3>
                    <p className="text-xs opacity-70 mt-1 font-medium">{user.description}</p>
                  </div>
                  {loading === user.name && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] rounded-2xl">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} Portería Virtual. Modo Demostración Activado.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
