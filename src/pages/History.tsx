import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Calendar, Clock, Building2, User, CheckCircle2, Loader2, ChevronRight, FileText, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (logId: number) => {
    window.open(api.getLogPdfUrl(logId), '_blank');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando historial...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Mantenciones</h1>
          <p className="text-slate-500">Registro de todas las visitas y bitácoras realizadas.</p>
        </div>
        <button 
          onClick={() => navigate('/tech')}
          className="btn-primary flex items-center gap-2"
        >
          <PlusCircle size={20} />
          <span>Nueva Bitácora</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom">
                <th className="p-4 font-semibold text-slate-600">Fecha</th>
                <th className="p-4 font-semibold text-slate-600">Tipo</th>
                <th className="p-4 font-semibold text-slate-600">Condominio</th>
                <th className="p-4 font-semibold text-slate-600">Técnico</th>
                <th className="p-4 font-semibold text-slate-600">Horario</th>
                <th className="p-4 font-semibold text-slate-600">Estado</th>
                <th className="p-4 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, index) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span className="font-medium">
                        {format(new Date(log.start_time), "dd 'de' MMMM", { locale: es })}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${
                      log.log_type === 'correctiva' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                      log.log_type === 'emergencia' ? 'bg-red-50 text-red-600 border-red-200' : 
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {log.log_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      <span>{log.condo_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      <span>{log.tech_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span>
                        {format(new Date(log.start_time), "HH:mm")} - {log.end_time ? format(new Date(log.end_time), "HH:mm") : 'En curso'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      log.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      log.status === 'paused' ? 'bg-slate-100 text-slate-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.status === 'completed' ? 'Finalizado' : 
                       log.status === 'paused' ? 'Pausado' : 
                       'En Proceso'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {log.status === 'completed' ? (
                      <button 
                        onClick={() => handleDownloadPdf(log.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl transition-all text-sm font-bold shadow-sm shadow-primary/20"
                        title="Ver Reporte PDF"
                      >
                        <FileText size={18} />
                        <span>Ver Reporte</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const route = log.log_type === 'correctiva' ? 'corrective' : 'maintenance';
                          navigate(`/tech/${route}/${log.id}`);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl transition-all text-sm font-bold shadow-sm shadow-amber-500/20"
                      >
                        <Clock size={18} />
                        <span>Continuar</span>
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-20">
            <HistoryIcon className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-500">No hay registros de mantención.</p>
          </div>
        )}
      </div>
    </div>
  );
}
