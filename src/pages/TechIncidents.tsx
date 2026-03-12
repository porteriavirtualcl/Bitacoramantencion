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
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

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

  const handleResolve = async (id: number) => {
    if (!confirm('¿Marcar esta incidencia como resuelta?')) return;
    
    // Optimistic update
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i));
    
    try {
      await api.updateIncidentStatus(id, 'resolved');
      // No need to reload everything if we updated it locally, 
      // but we can still do it to ensure sync with server
      loadIncidents();
    } catch (error) {
      console.error('Error resolving incident:', error);
      // Rollback on error
      loadIncidents();
      alert('Error al resolver la incidencia');
    }
  };

  const handleDownloadPdf = (id: number) => {
    window.open(api.getIncidentPdfUrl(id), '_blank');
  };

  const filteredIncidents = incidents.filter(i => i.status === activeTab);

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Incidencias Reportadas</h1>
            <p className="text-slate-500">Problemas detectados por los operadores en tus condominios</p>
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

        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pendientes ({incidents.filter(i => i.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'resolved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resueltas ({incidents.filter(i => i.status === 'resolved').length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredIncidents.map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-2xl p-6 border-l-4 shadow-sm ${
                incident.status === 'pending' ? 'border-l-red-500' : 'border-l-green-500'
              } border-y border-r border-slate-200`}
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
                    <AlertTriangle size={20} className={incident.status === 'pending' ? 'text-red-500' : 'text-slate-300'} />
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

                  {incident.status === 'pending' && (
                    <button
                      onClick={() => handleResolve(incident.id)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-slate-900/10"
                    >
                      <CheckCircle2 size={18} />
                      Marcar como Resuelto
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredIncidents.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <CheckCircle2 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">
              {activeTab === 'pending' ? 'No hay incidencias pendientes' : 'No hay incidencias resueltas'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
