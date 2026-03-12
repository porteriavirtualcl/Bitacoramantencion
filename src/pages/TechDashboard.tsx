import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, ArrowRight, Loader2, PlusCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { clsx } from 'clsx';

export default function TechDashboard() {
  const [condos, setCondos] = useState<any[]>([]);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState<number | null>(null);
  const [logType, setLogType] = useState<'mantenimiento' | 'correctiva'>('mantenimiento');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('TechDashboard: loadData started');
    try {
      const [condoData, historyData] = await Promise.all([
        api.getCondos(),
        api.getHistory()
      ]);
      console.log('TechDashboard: Data loaded', { condos: condoData, history: historyData });
      
      setCondos(Array.isArray(condoData) ? condoData : []);
      
      if (Array.isArray(historyData)) {
        const active = historyData.filter((l: any) => l.status === 'in_progress');
        console.log('TechDashboard: Active logs identified', active);
        setActiveLogs(active);
      } else {
        console.warn('TechDashboard: historyData is not an array', historyData);
        setActiveLogs([]);
      }
    } catch (err: any) {
      console.error('TechDashboard: Error loading data', err);
      // If it's a 401, the interceptor or App.tsx should handle it, but we log it here.
    } finally {
      setLoading(false);
    }
  };

  const handleStartMaintenance = async (condoId: number) => {
    console.log('handleStartMaintenance called for condo:', condoId);
    // Check if there's already an active log for this condo
    const existingLog = activeLogs.find(l => l.condo_id === condoId);
    if (existingLog) {
      console.log('Existing active log found:', existingLog.id);
      const route = existingLog.log_type === 'mantenimiento' ? 'maintenance' : 'corrective';
      navigate(`/tech/${route}/${existingLog.id}`);
      return;
    }

    setStarting(condoId);
    try {
      console.log('Calling api.startLog...');
      const response = await api.startLog(condoId, logType);
      console.log('api.startLog response:', response);
      if (response && response.id) {
        const route = logType === 'mantenimiento' ? 'maintenance' : 'corrective';
        navigate(`/tech/${route}/${response.id}`);
      } else {
        throw new Error('No ID returned from server');
      }
    } catch (err: any) {
      console.error('Error in handleStartMaintenance:', err);
      alert('Error al iniciar mantención: ' + err.message);
    } finally {
      setStarting(null);
    }
  };

  const filteredCondos = condos.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.address.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando condominios...</p>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Nueva Bitácora</h1>
          <p className="text-sm text-slate-500">Selecciona el tipo de visita y el condominio.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setLogType('mantenimiento')}
              className={clsx(
                "flex-1 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                logType === 'mantenimiento' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Mantenimiento
            </button>
            <button 
              onClick={() => setLogType('correctiva')}
              className={clsx(
                "flex-1 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                logType === 'correctiva' ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Correctiva
            </button>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar condominio..." 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-4 focus:bg-white focus:border-primary focus:outline-none transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {activeLogs.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="text-amber-500" size={18} />
            <span>Bitácoras en Curso</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {activeLogs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
                      {log.log_type}
                    </span>
                    <span className="text-[10px] md:text-xs text-amber-600 font-medium">
                      Iniciado: {new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base">{log.condo_name}</h3>
                </div>
                <button 
                  onClick={() => {
                    const route = log.log_type === 'mantenimiento' ? 'maintenance' : 'corrective';
                    navigate(`/tech/${route}/${log.id}`);
                  }}
                  className="mt-3 md:mt-4 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-all shadow-sm"
                >
                  Continuar Bitácora
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="text-primary" size={18} />
          <span>Condominios Asignados</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredCondos.map((condo, index) => (
          <motion.div 
            key={condo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg text-primary">
                  <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 leading-tight">{condo.name}</h3>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 line-clamp-1">{condo.address}</p>
              
              <button 
                onClick={() => handleStartMaintenance(condo.id)}
                disabled={starting !== null}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl font-bold text-sm md:text-base transition-all",
                  activeLogs.some(l => l.condo_id === condo.id)
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                    : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                )}
              >
                {starting === condo.id ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {activeLogs.some(l => l.condo_id === condo.id) ? (
                      <>
                        <Clock size={18} />
                        <span>Continuar Bitácora</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={18} />
                        <span>Iniciar Mantención</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
        </div>
      </div>

      {filteredCondos.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">No se encontraron condominios.</p>
        </div>
      )}
    </div>
  );
}
