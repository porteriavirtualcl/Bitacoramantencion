import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function OperatorIncidentForm() {
  const { condoId } = useParams();
  const navigate = useNavigate();
  const [condo, setCondo] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    equipmentTypeId: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [condoId]);

  const loadData = async () => {
    try {
      const condos = await api.getCondos();
      const currentCondo = condos.find((c: any) => c.id === Number(condoId));
      setCondo(currentCondo);

      const condoEquipment = await api.getCondoEquipment(Number(condoId));
      setEquipment(condoEquipment);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentTypeId || !formData.description) return;

    setSubmitting(true);
    try {
      await api.reportIncident({
        condoId: Number(condoId),
        equipmentTypeId: Number(formData.equipmentTypeId),
        description: formData.description
      });
      setSuccess(true);
      setTimeout(() => navigate('/operator'), 2000);
    } catch (error) {
      console.error('Error reporting incident:', error);
      alert('Error al reportar la incidencia');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Cargando...</div>;
  if (!condo) return <div>Condominio no encontrado</div>;

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">¡Reporte Enviado!</h2>
          <p className="text-slate-500">El técnico asignado ha sido notificado.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/operator')}
        className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold"
      >
        <ArrowLeft size={20} />
        Volver
      </button>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Reportar Incidencia</h1>
            <p className="text-slate-500 flex items-center gap-2">
              <Building2 size={16} />
              {condo.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Equipo con Problema
            </label>
            <select
              required
              value={formData.equipmentTypeId}
              onChange={(e) => setFormData({ ...formData, equipmentTypeId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-slate-50"
            >
              <option value="">Selecciona el equipo...</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Descripción del Problema
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe detalladamente el problema detectado..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-slate-50 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Reporte de Incidencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
