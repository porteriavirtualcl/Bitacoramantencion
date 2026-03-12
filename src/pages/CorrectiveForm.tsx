import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Wrench
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';

export default function CorrectiveForm() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [logData, setLogData] = useState<any>(null);
  
  const [problemDescription, setProblemDescription] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');

  useEffect(() => {
    loadData();
  }, [logId]);

  const loadData = async () => {
    try {
      if (!logId) return;
      const data = await api.getLog(Number(logId));
      setLogData(data);
      if (data.problem_description) setProblemDescription(data.problem_description);
      if (data.actions_taken) setActionsTaken(data.actions_taken);
    } catch (err: any) {
      console.error('Error loading log data:', err);
      alert('Error al cargar los datos de la bitácora');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim() || !actionsTaken.trim()) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    setSubmitting(true);
    try {
      await api.finishLog(Number(logId), { 
        problemDescription, 
        actionsTaken 
      });
      setSubmitting(false);
      setIsSuccess(true);
    } catch (err) {
      alert('Error al finalizar la bitácora');
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando formulario...</p>
    </div>
  );

  if (isSuccess) return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto py-20 text-center space-y-6"
    >
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">¡Bitácora Finalizada!</h2>
        <p className="text-slate-500">El registro ha sido guardado y enviado por correo exitosamente.</p>
      </div>
      <button 
        onClick={() => navigate('/tech')}
        className="btn-primary w-full"
      >
        Volver al Dashboard
      </button>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <button 
        onClick={() => navigate('/tech')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Volver</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="bg-slate-900 p-5 md:p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Bitácora de Incidencia</h1>
                <p className="text-slate-400 text-xs">Registro de falla y acciones tomadas</p>
              </div>
            </div>
            <div className="flex">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-500 text-white rounded-md shadow-lg shadow-amber-500/20">
                {logData?.log_type || 'Correctiva'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(logData?.start_time).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(logData?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{logData?.tech_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="truncate">{logData?.condo_name}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MessageSquare className="text-primary" size={20} />
              <h2>Descripción del Problema</h2>
            </div>
            <textarea
              required
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder="Describe detalladamente la falla o problema encontrado..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Wrench className="text-primary" size={20} />
              <h2>Acciones Tomadas</h2>
            </div>
            <textarea
              required
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder="Describe las reparaciones o acciones realizadas para solucionar el problema..."
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
            />
          </div>

          <div className="pt-2 md:pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 md:py-4 flex items-center justify-center gap-2 text-base md:text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Finalizar y Enviar Registro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
