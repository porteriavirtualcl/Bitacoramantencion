import { useState, useEffect } from 'react';
import { api } from '../api';
import { AlertTriangle, CheckCircle2, Clock, Building2, MessageSquare, FileText, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OperatorHistory() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (id: number) => {
    window.open(api.getIncidentPdfUrl(id), '_blank');
  };

  if (loading) return <div className="flex justify-center p-12">Cargando historial...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Historial de Reportes</h1>
        <p className="text-slate-500">Registro de todas las incidencias que has reportado</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {incidents.map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      incident.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {incident.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      Reportado: {format(new Date(incident.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                    {incident.resolved_at && (
                      <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                        <CheckCircle2 size={12} />
                        Resuelto: {format(new Date(incident.resolved_at), "d 'de' MMMM, HH:mm", { locale: es })}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={20} className={incident.status === 'pending' ? 'text-red-500' : 'text-green-500'} />
                    {incident.equipment_name}
                  </h3>

                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="font-bold">{incident.condo_name}</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
                    <MessageSquare size={18} className="text-slate-400 shrink-0 mt-1" />
                    <p className="text-slate-700 italic">"{incident.description}"</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadPdf(incident.id)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileText size={18} />
                    Descargar PDF
                  </button>
                  
                  {incident.status === 'resolved' && (
                    <div className="flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-xl font-bold border border-green-100">
                      <CheckCircle2 size={18} />
                      Resuelto
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {incidents.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <History className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Aún no has reportado incidencias</p>
          </div>
        )}
      </div>
    </div>
  );
}
