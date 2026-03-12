import { useState, useEffect } from 'react';
import { api } from '../api';
import { Building2, AlertTriangle, ChevronRight, Plus, Clock, CheckCircle2, RefreshCw, FileText, User, Users, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function OperatorDashboard() {
  const [condos, setCondos] = useState<any[]>([]);
  const [pendingIncidents, setPendingIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [condoData, incidentData] = await Promise.all([
        api.getCondos(),
        api.getIncidents()
      ]);
      setCondos(condoData);
      setPendingIncidents(incidentData.filter((i: any) => i.status === 'pending'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Panel de Operador</h1>
          <p className="text-slate-500">Gestiona reportes e incidencias en tiempo real</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary hover:border-primary transition-all disabled:opacity-50"
          title="Refrescar datos"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alertas de Incidencias Pendientes */}
      <AnimatePresence>
        {pendingIncidents.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              <h2 className="font-black uppercase tracking-wider text-sm">Incidencias Pendientes de Solución</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {pendingIncidents.map((incident) => (
                <div 
                  key={`incident-${incident.id}`}
                  className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{incident.equipment_name}</p>
                      <p className="text-xs text-slate-500">{incident.condo_name} • Reportado hace {Math.round((new Date().getTime() - new Date(incident.created_at).getTime()) / (1000 * 60))} min</p>
                    </div>
                  </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => window.open(api.getIncidentPdfUrl(incident.id), '_blank')}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Descargar PDF"
                      >
                        <FileText size={18} />
                      </button>
                      <Link 
                        to="/operator/history"
                        className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                      >
                        Ver detalle <ChevronRight size={14} />
                      </Link>
                    </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Building2 size={20} />
          <h2 className="font-black uppercase tracking-wider text-sm">Condominios Asignados</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {condos.map((condo) => (
            <motion.div
              key={`condo-${condo.id}`}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                  {condo.address}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-4">{condo.name}</h3>
              
              <div className="flex items-center gap-4 mb-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <User size={14} className="text-blue-500" />
                  <span className="text-xs font-bold">{condo.tech_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users size={14} className="text-purple-500" />
                  <span className="text-xs font-bold">{condo.operator_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Settings size={14} className="text-slate-400" />
                  <span className="text-xs font-bold">{condo.equipment_count || 0}</span>
                </div>
              </div>

              <Link 
                to={`/operator/report/${condo.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-primary transition-colors"
              >
                <AlertTriangle size={18} />
                Reportar Incidencia
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {condos.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium">No tienes condominios asignados</p>
        </div>
      )}
    </div>
  );
}
