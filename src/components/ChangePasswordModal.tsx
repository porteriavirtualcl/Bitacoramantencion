import { useState } from 'react';
import { X, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 100 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 100 }} 
            className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 md:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Cambiar Contraseña</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            {success ? (
              <div className="p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">¡Contraseña Actualizada!</h3>
                <p className="text-slate-500">Tu contraseña ha sido cambiada exitosamente.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 md:space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm border border-red-100">
                    <AlertCircle size={20} />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Contraseña Actual</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" required 
                      className="input-field pl-10 py-3" 
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" required 
                      className="input-field pl-10 py-3" 
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" required 
                      className="input-field pl-10 py-3" 
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Actualizar'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
