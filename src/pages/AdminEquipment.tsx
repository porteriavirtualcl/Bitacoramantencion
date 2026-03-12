import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2, Save, X } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';

export default function AdminEquipment() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const data = await api.getEquipment();
      setTypes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.createEquipment(newName);
      await loadTypes();
      setNewName('');
    } catch (err) {
      alert('Error al agregar tipo de equipo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando tipos de equipos...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tipos de Equipos</h1>
        <p className="text-slate-500">Define los elementos que los técnicos deben revisar en cada visita.</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <input 
            type="text" 
            className="input-field flex-1" 
            placeholder="Nuevo tipo de equipo (ej: Sensores de Humo)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button 
            type="submit"
            disabled={saving || !newName.trim()}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap py-2.5 md:py-2"
          >
            <Plus size={20} />
            <span>Agregar</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-600 text-sm uppercase tracking-wider">
          Equipos Registrados
        </div>
        <div className="divide-y divide-slate-100">
          {types.map((type, index) => (
            <motion.div 
              key={type.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                  <Settings size={18} />
                </div>
                <span className="font-medium text-slate-700">{type.name}</span>
              </div>
              <button 
                onClick={async () => {
                  if (confirm('¿Estás seguro de eliminar este tipo de equipo?')) {
                    try {
                      await api.deleteEquipment(type.id);
                      await loadTypes();
                    } catch (err) {
                      alert('Error al eliminar tipo de equipo');
                    }
                  }
                }}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit">
          <Settings size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">Nota de Configuración</p>
          <p className="text-sm text-blue-700 mt-1">
            Los cambios en los tipos de equipos afectarán a las nuevas bitácoras creadas. 
            Asegúrate de asignar los nuevos equipos a los condominios correspondientes.
          </p>
        </div>
      </div>
    </div>
  );
}
