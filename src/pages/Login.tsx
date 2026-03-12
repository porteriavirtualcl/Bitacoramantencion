import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { useAuth } from '../App';

import { Logo } from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, token } = await api.login({ email, password });
      
      if (user.mustChangePassword) {
        setMustChange(true);
        setTempToken(token);
        setTempUser(user);
        setLoading(false);
        return;
      }

      login(user, token);
      navigate(user.role === 'admin' ? '/admin' : '/tech');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Temporarily set token to make the request
      localStorage.setItem('token', tempToken);
      await api.changePassword({ newPassword });
      
      // Password changed, now login
      login(tempUser, tempToken);
      navigate(tempUser.role === 'admin' ? '/admin' : '/tech');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mustChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px]">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-10 text-center">
              <h1 className="text-2xl font-black text-slate-700 tracking-tight">Cambiar Contraseña</h1>
              <p className="text-slate-500 text-sm mt-4">Por seguridad, debes cambiar tu contraseña en tu primer inicio de sesión.</p>
            </div>

            <form onSubmit={handleChangePassword} className="px-10 pb-10 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-100">
                  <AlertCircle size={20} />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="password" required
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-primary focus:outline-none transition-all text-slate-900 font-medium" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="password" required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-primary focus:outline-none transition-all text-slate-900 font-medium" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-3 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Cambiar y Entrar'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="p-10 text-center">
            <div className="flex items-center justify-center mx-auto mb-4">
              <Logo className="w-24 h-24" />
            </div>
            <h1 className="text-3xl font-black text-slate-700 tracking-tight">portería <span className="text-primary">virtual</span></h1>
            <div className="h-1 w-12 bg-primary/20 mx-auto mt-4 rounded-full" />
            <p className="text-slate-500 text-sm mt-6">Sistema de Gestión de Mantenciones</p>
          </div>

          <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-6">
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-primary focus:outline-none transition-all text-slate-900 font-medium" 
                  placeholder="contacto@porteriavirtual.cl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-primary focus:outline-none transition-all text-slate-900 font-medium" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Acceder al Sistema'}
            </button>
          </form>

          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} Portería Virtual. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
