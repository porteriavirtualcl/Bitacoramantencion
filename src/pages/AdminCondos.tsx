import { useState, useEffect } from 'react';
import { Building2, Plus, Search, X, Check, Loader2, Trash2, Edit2, User, Settings, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';

export default function AdminCondos() {
  const [condos, setCondos] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<any>(null);
  const [newCondo, setNewCondo] = useState({ name: '', address: '', equipmentIds: [] as number[], userIds: [] as number[] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [condoData, equipData, techData] = await Promise.all([
        api.getCondos(),
        api.getEquipment(),
        api.getTechs()
      ]);
      setCondos(condoData);
      setEquipmentTypes(equipData);
      setTechs(techData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (condo: any) => {
    setEditingCondo(condo);
    setLoading(true);
    try {
      const equip = await api.getCondoEquipment(condo.id);
      
      setNewCondo({
        name: condo.name,
        address: condo.address,
        equipmentIds: equip.map((e: any) => e.id),
        userIds: Array.isArray(condo.user_ids) ? condo.user_ids : []
      });
      setIsModalOpen(true);
    } catch (err) {
      alert('Error al cargar equipos del condominio');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEquip = (id: number) => {
    setNewCondo(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(id) 
        ? prev.equipmentIds.filter(eid => eid !== id)
        : [...prev.equipmentIds, id]
    }));
  };

  const handleToggleUser = (id: number) => {
    setNewCondo(prev => ({
      ...prev,
      userIds: prev.userIds.includes(id) 
        ? prev.userIds.filter(uid => uid !== id)
        : [...prev.userIds, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCondo) {
        await api.updateCondo(editingCondo.id, newCondo);
      } else {
        await api.createCondo(newCondo);
      }
      await loadData();
      setIsModalOpen(false);
      setNewCondo({ name: '', address: '', equipmentIds: [], userIds: [] });
      setEditingCondo(null);
    } catch (err) {
      alert('Error al guardar condominio');
    } finally {
      setSaving(false);
    }
  };

  if (loading && condos.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando condominios...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Gestión de Condominios</h1>
          <p className="text-sm text-slate-500">Administra los edificios y sus equipos configurados.</p>
        </div>
        <button 
          onClick={() => { setEditingCondo(null); setNewCondo({ name: '', address: '', equipmentIds: [], userIds: [] }); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Plus size={20} />
          <span>Nuevo Condominio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {condos.map((condo, index) => (
          <motion.div 
            key={condo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(condo)}
                    className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 rounded-lg"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm('¿Estás seguro de eliminar este condominio?')) {
                        try {
                          await api.request(`/condos/${condo.id}`, { method: 'DELETE' });
                          await loadData();
                        } catch (err) {
                          alert('Error al eliminar condominio');
                        }
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-50 rounded-lg"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">{condo.name}</h3>
                <p className="text-xs md:text-sm text-slate-500 line-clamp-1">{condo.address}</p>
              </div>

              <div className="pt-3 md:pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Técnicos</p>
                      <p className="text-xs font-bold text-slate-700">{condo.tech_count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                      <Users size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Operadores</p>
                      <p className="text-xs font-bold text-slate-700">{condo.operator_count || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit">
                  <Settings className="w-3 h-3" />
                  <span>{condo.equipment_count || 0} Equipos</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 100 }} className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-5 md:p-6 border-b flex items-center justify-between shrink-0">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">{editingCondo ? 'Editar Condominio' : 'Agregar Condominio'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5 md:space-y-6 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre del Condominio</label>
                  <input type="text" required className="input-field py-3" placeholder="Ej: Edificio Mirador" value={newCondo.name} onChange={e => setNewCondo({...newCondo, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Dirección</label>
                  <input type="text" required className="input-field py-3" placeholder="Calle, Número, Comuna" value={newCondo.address} onChange={e => setNewCondo({...newCondo, address: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Personal Asignado</label>
                    <span className="text-[10px] text-slate-400 font-medium">Técnicos y Operadores</span>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {techs.map(user => (
                      <button 
                        key={`user-btn-${user.id}`} 
                        type="button" 
                        onClick={() => handleToggleUser(user.id)} 
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${newCondo.userIds.includes(user.id) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${newCondo.userIds.includes(user.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                          {newCondo.userIds.includes(user.id) && <Check size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{user.name}</p>
                          <p className="text-[10px] opacity-70 uppercase">{user.role === 'tech' ? 'Técnico' : 'Operador'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Equipos a Revisar</label>
                    <span className="text-[10px] text-slate-400 font-medium">Selecciona los equipos presentes</span>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 p-1">
                    {equipmentTypes.map(type => (
                      <button key={`equip-btn-${type.id}`} type="button" onClick={() => handleToggleEquip(type.id)} className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${newCondo.equipmentIds.includes(type.id) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${newCondo.equipmentIds.includes(type.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>{newCondo.equipmentIds.includes(type.id) && <Check size={14} />}</div>
                        <span className="truncate">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">{saving ? <Loader2 className="animate-spin" size={20} /> : (editingCondo ? 'Guardar' : 'Crear')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
