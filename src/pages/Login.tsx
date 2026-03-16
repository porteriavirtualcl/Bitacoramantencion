import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { useAuth } from '../App';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        setLoading('google');
        try {
          const { user, token } = await api.login({ email: session.user.email });
          login(user, token);
          
          if (user.role === 'admin') navigate('/admin');
          else if (user.role === 'operator') navigate('/operator');
          else navigate('/tech');
        } catch (err: any) {
          setError(`No tienes acceso con este correo: ${session.user.email}. Contacta al administrador.`);
          setLoading(null);
        }
      }
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading('google');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setError('Error al conectar con Google: ' + error.message);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-Inter">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px]"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mx-auto mb-6">
              <Logo className="w-24 h-24" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
              portería <span className="text-primary italic">virtual</span>
            </h1>
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-[0.2em] mb-10">Bitácora Técnica</p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-600 p-5 rounded-3xl flex items-center gap-3 text-sm border border-red-100 mb-8 text-left transition-all"
              >
                <AlertCircle size={24} className="shrink-0" />
                <span className="font-bold leading-tight">{error}</span>
              </motion.div>
            )}

            <div className="space-y-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading !== null}
                className="group relative w-full flex items-center justify-center gap-4 p-5 bg-white border-[3px] border-slate-100 rounded-[1.5rem] font-black text-slate-700 hover:bg-slate-50 hover:border-primary/20 hover:text-primary transition-all duration-300 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {loading === 'google' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
                )}
                <span className="text-lg uppercase">
                  {loading === 'google' ? 'Cargando Perfil...' : 'Ingresar con Google'}
                </span>
                <div className="absolute inset-0 rounded-[1.5rem] ring-4 ring-primary/0 group-hover:ring-primary/5 transition-all"></div>
              </button>

              <div className="pt-4">
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-[280px] mx-auto">
                  Acceso exclusivo para personal autorizado de Portería Virtual Chile.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 p-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Estado del Sistema: Operativo
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-300 font-bold uppercase tracking-tighter">
            © {new Date().getFullYear()} Portería Virtual International.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
