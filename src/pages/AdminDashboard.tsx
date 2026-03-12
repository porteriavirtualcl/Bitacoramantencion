import { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, Settings, History, Users, TrendingUp, AlertTriangle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({ condos: 0, logs: 0, pending: 0, techs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const condos = await api.getCondos();
      const history = await api.getHistory();
      const techs = await api.getTechs();
      setStats({
        condos: condos.length,
        logs: history.length,
        pending: history.filter((l: any) => l.status !== 'completed').length,
        techs: techs.length,
        recent: history.slice(0, 5)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando panel...</p>
    </div>
  );

  const cards = [
    { label: 'Condominios', value: stats.condos, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', path: '/admin/condos' },
    { label: 'Mantenciones Totales', value: stats.logs, icon: History, color: 'text-purple-600', bg: 'bg-purple-50', path: '/history' },
    { label: 'En Proceso', value: stats.pending, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', path: '/history' },
    { label: 'Técnicos Activos', value: stats.techs, icon: Users, color: 'text-green-600', bg: 'bg-green-50', path: '/admin/techs' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="text-slate-500">Bienvenido al centro de control de Portería Virtual.</p>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={card.path} className="block bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow h-full">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`p-2.5 md:p-3 ${card.bg} ${card.color} rounded-xl`}>
                  <card.icon size={20} className="md:w-6 md:h-6" />
                </div>
              </div>
              <p className="text-slate-500 text-xs md:text-sm font-medium">{card.label}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{card.value}</h3>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Mantenciones Recientes</h2>
            <Link to="/history" className="text-primary text-sm font-medium hover:underline">Ver todo</Link>
          </div>
          <div className="space-y-4">
            {stats.recent?.map((log: any) => (
              <div key={`recent-log-${log.id}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${log.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {log.status === 'completed' ? <CheckCircle2 size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{log.condo_name}</p>
                    <p className="text-xs text-slate-500">{log.tech_name} • {new Date(log.start_time).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase ${log.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {log.status === 'completed' ? 'OK' : 'PROCESO'}
                  </span>
                  {log.status === 'completed' && (
                    <button 
                      onClick={() => window.open(api.getLogPdfUrl(log.id), '_blank')}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Ver PDF"
                    >
                      <FileText size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Configuración Rápida</h2>
          <div className="grid grid-cols-1 gap-4">
            <Link to="/admin/condos" className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Building2 size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Gestionar Condominios</p>
                <p className="text-xs text-slate-500">Agrega nuevos edificios y asigna equipos.</p>
              </div>
            </Link>
            <Link to="/admin/equipment" className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
              <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                <Settings size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Tipos de Equipos</p>
                <p className="text-xs text-slate-500">Configura los elementos a revisar en cada visita.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
