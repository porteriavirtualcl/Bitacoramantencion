import { useState, useEffect } from 'react';
import { api } from '../api';
import { AlertTriangle, CheckCircle2, Clock, Building2, User, MessageSquare, FileText, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TechIncidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'resolved' | 'pending') => {
    // Optimistic update
    if (status === 'resolved') {
      setIncidents(prev => prev.filter(i => i.id !== id));
    } else {
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'pending' } : i));
    }
    
    setClosingId(null);

    try {
      await api.updateIncidentStatus(id, status);
      loadIncidents();
    } catch (error) {
      console.error('Error updating incident status:', error);
      loadIncidents();
      alert('Error al actualizar el estado de la incidencia');
    }
  };

  const handleDownloadPdf = (id: number) => {
    window.open(api.getIncidentPdfUrl(id), '_blank');
  };

  const activeIncidents = incidents
    .filter(i => i.status === 'in_process' || i.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Incidencias Pendientes</h1>
            <p className="text-slate-500">Problemas detectados que requieren tu atención inmediata</p>
          </div>
          <button
            onClick={() => loadIncidents(true)}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition-all disabled:opacity-50"
            title="Refrescar"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
          <span className="text-blue-600 font-bold text-sm">
            {activeIncidents.length} {activeIncidents.length === 1 ? 'incidencia activa' : 'incidencias activas'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {activeIncidents.map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-2xl p-6 border-l-4 ${
                incident.status === 'in_process' ? 'border-l-blue-500' : 'border-l-orange-500'
              } border-y border-r border-slate-200 shadow-sm`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      incident.status === 'in_process' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {incident.status === 'in_process' ? 'En Proceso' : 'Pendiente'}
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      incident.priority === 'Crítica' ? 'bg-red-600 text-white' :
                      incident.priority === 'Alta' ? 'bg-orange-100 text-orange-600' :
                      incident.priority === 'Media' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {incident.priority || 'Media'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      Reportado: {format(new Date(incident.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={20} className={incident.status === 'in_process' ? 'text-blue-500' : 'text-orange-500'} />
                    {incident.equipment_name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={16} className="text-slate-400" />
                      <span className="font-bold">{incident.condo_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={16} className="text-slate-400" />
                      <span>Reportado por: <span className="font-bold">{incident.operator_name}</span></span>
                    </div>
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

                  <div className="flex flex-col gap-2">
                    {closingId === incident.id ? (
                      <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-1">Cerrar como:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(incident.id, 'resolved')}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all"
                          >
                            Resuelta
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(incident.id, 'pending')}
                            className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all"
                          >
                            Pendiente
                          </button>
                        </div>
                        <button
                          onClick={() => setClosingId(null)}
                          className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setClosingId(incident.id)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                      >
                        <CheckCircle2 size={18} />
                        Cerrar Incidencia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeIncidents.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <CheckCircle2 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No hay incidencias activas</p>
          </div>
        )}
      </div>
    </div>
  );
}
