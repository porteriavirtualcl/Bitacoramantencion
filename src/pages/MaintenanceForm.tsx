import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, Save, Loader2, Clock, Info, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { clsx } from 'clsx';

export default function MaintenanceForm() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [startTime] = useState(new Date());
  const [responses, setResponses] = useState<Record<number, { status: string, observations: string }>>({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    console.log('MaintenanceForm mounted with logId:', logId);
    loadData();
  }, [logId]);

  const loadData = async () => {
    console.log('loadData called for logId:', logId);
    try {
      if (!logId) {
        console.error('No logId provided to MaintenanceForm');
        return;
      }
      const currentLog = await api.getLog(Number(logId));
      console.log('currentLog fetched:', currentLog);
      
      if (currentLog) {
        console.log('Fetching equipment for condo:', currentLog.condo_id);
        const equipData = await api.getCondoEquipment(currentLog.condo_id);
        console.log('equipData fetched:', equipData);
        setEquipment(equipData);
        
        if (equipData.length === 0) {
          console.warn('No equipment found for this condo');
        }

        // Initialize responses
        const initialResponses: any = {};
        equipData.forEach((e: any) => {
          initialResponses[e.id] = { status: '', observations: '' };
        });
        setResponses(initialResponses);
      } else {
        console.error('Log not found for ID:', logId);
        alert('No se encontró la bitácora especificada.');
        navigate('/tech');
      }
    } catch (err: any) {
      console.error('Error loading maintenance data:', err);
      alert('Error al cargar los datos de la bitácora: ' + err.message);
      navigate('/tech');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    setResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], status }
    }));
  };

  const handleObservationChange = (id: number, observations: string) => {
    setResponses(prev => ({
      ...prev,
      [id]: { ...prev[id], observations }
    }));
  };

  const handleSubmit = async () => {
    // Validate that all equipment has a status and observations
    const incompleteStatus = equipment.some(e => !responses[e.id]?.status);
    const incompleteObservations = equipment.some(e => !responses[e.id]?.observations || responses[e.id]?.observations.trim().length < 3);

    if (incompleteStatus || incompleteObservations) {
      setShowErrors(true);
      if (incompleteStatus) {
        alert('Por favor, selecciona un estado (OK, Falla o N/A) para todos los equipos.');
      } else {
        alert('Por favor, ingresa observaciones detalladas para cada equipo revisado.');
      }
      return;
    }

    setSubmitting(true);
    try {
      const details = Object.entries(responses).map(([id, data]) => ({
        equipment_id: Number(id),
        status: data.status,
        observations: data.observations
      }));
      
      await api.finishLog(Number(logId), { details });
      // Show success state
      setSubmitting(false);
      setIsSuccess(true);
    } catch (err) {
      alert('Error al finalizar mantención');
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
      className="max-w-md mx-auto py-20 text-center space-y-8"
    >
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-100/50 rotate-3">
        <CheckCircle2 size={56} />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Bitácora Finalizada!</h2>
        <p className="text-slate-500 font-medium leading-relaxed">
          El reporte PDF ha sido generado y enviado exitosamente.<br/>
          Se ha enviado una copia a:<br/>
          <span className="text-primary font-bold">contacto@porteriavirtual.cl</span>
        </p>
      </div>
      <div className="pt-4">
        <button 
          onClick={() => navigate('/tech')}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 group"
        >
          <span>Cerrar y Volver al Inicio</span>
          <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Bitácora de Mantención</h1>
          <p className="text-sm text-slate-500">Revisa cada equipo y registra tus observaciones.</p>
        </div>
        <div className="flex items-center justify-center md:justify-start gap-2 px-4 py-2 bg-primary/5 text-primary rounded-full font-medium text-sm">
          <Clock size={16} />
          <span>Iniciado: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="space-y-6">
        {equipment.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-4">
            <AlertCircle className="mx-auto text-amber-500" size={48} />
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">No hay equipos asignados</p>
              <p className="text-slate-500 max-w-xs mx-auto">Este condominio no tiene equipos configurados para revisión. Contacta al administrador.</p>
            </div>
            <button 
              onClick={() => navigate('/tech')}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Volver al Dashboard
            </button>
          </div>
        ) : equipment.map((item, index) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className={clsx(
              "p-4 md:p-6 space-y-4 border-l-4 transition-all",
              showErrors && (!responses[item.id]?.status || !responses[item.id]?.observations || responses[item.id]?.observations.trim().length < 3)
                ? "border-red-500 bg-red-50/30"
                : "border-transparent"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">{item.name}</h3>
                  {showErrors && !responses[item.id]?.status && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle size={10} />
                      Selecciona un estado
                    </p>
                  )}
                </div>
                <div className={clsx(
                  "flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto border transition-colors flex-wrap sm:flex-nowrap",
                  showErrors && !responses[item.id]?.status ? "border-red-300 bg-red-50" : "border-transparent"
                )}>
                  {[
                    { val: 'ok', label: 'OK', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                    { val: 'fail', label: 'Falla', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { val: 'na', label: 'N/A', icon: Info, color: 'text-slate-500', bg: 'bg-slate-200' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => handleStatusChange(item.id, opt.val)}
                      className={clsx(
                        "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 sm:py-1.5 rounded-md text-xs md:text-sm font-bold transition-all",
                        responses[item.id]?.status === opt.val 
                          ? `${opt.bg} ${opt.color} shadow-sm` 
                          : "text-slate-500 hover:bg-white"
                      )}
                    >
                      <opt.icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">Observaciones</label>
                  {showErrors && (!responses[item.id]?.observations || responses[item.id]?.observations.trim().length < 3) && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Requerido</span>
                  )}
                </div>
                <textarea 
                  value={responses[item.id]?.observations}
                  onChange={(e) => handleObservationChange(item.id, e.target.value)}
                  className={clsx(
                    "input-field min-h-[80px] resize-none transition-all",
                    showErrors && (!responses[item.id]?.observations || responses[item.id]?.observations.trim().length < 3)
                      ? "border-red-300 focus:ring-red-200 bg-red-50/50"
                      : ""
                  )}
                  placeholder="Escribe detalles sobre el estado del equipo..."
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
        <button 
          onClick={() => navigate('/tech')}
          className="w-full sm:w-auto px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full sm:w-auto btn-secondary px-8 py-3 flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
        >
          {submitting ? <Loader2 className="animate-spin" /> : (
            <>
              <Save size={20} />
              <span>Enviar Reporte PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
