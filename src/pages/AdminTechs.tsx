import { useState, useEffect } from 'react';
import { Users, Plus, X, Check, Loader2, Mail, User, Shield, Building2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';

export default function AdminTechs() {
  const [techs, setTechs] = useState<any[]>([]);
  const [condos, setCondos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [assignedCondoIds, setAssignedCondoIds] = useState<number[]>([]);
  
  const [editingTech, setEditingTech] = useState<any>(null);
  const [newTech, setNewTech] = useState({ name: '', email: '', password: '', role: 'tech' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [techData, condoData] = await Promise.all([
        api.getTechs(),
        api.getCondos()
      ]);
      
      // For each tech, fetch their assigned condos to show count
      const techsWithCondos = await Promise.all(techData.map(async (tech: any) => {
        try {
          const assigned = await api.getTechCondos(tech.id);
          return { ...tech, condoCount: assigned.length };
        } catch (e) {
          return { ...tech, condoCount: 0 };
        }
      }));
      
      setTechs(techsWithCondos);
      setCondos(condoData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTech) {
        await api.updateUser(editingTech.id, newTech);
      } else {
        await api.createUser(newTech);
      }
      await loadData();
      setIsModalOpen(false);
      setNewTech({ name: '', email: '', password: '', role: 'tech' });
      setEditingTech(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (tech: any) => {
    setEditingTech(tech);
    setNewTech({
      name: tech.name,
      email: tech.email,
      password: '', // Don't show password, leave empty to not change
      role: tech.role
    });
    setIsModalOpen(true);
  };

  const openAssignModal = async (tech: any) => {
    setSelectedTech(tech);
    setLoading(true);
    try {
      const assigned = await api.getTechCondos(tech.id);
      setAssignedCondoIds(assigned.map((c: any) => c.id));
      setIsAssignModalOpen(true);
    } catch (err) {
      alert('Error al cargar condominios asignados');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCondo = (id: number) => {
    setAssignedCondoIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSaveAssignments = async () => {
    setSaving(true);
    try {
      await api.assignCondosToTech(selectedTech.id, assignedCondoIds);
      await loadData();
      setIsAssignModalOpen(false);
    } catch (err) {
      alert('Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading && techs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-slate-500">Cargando técnicos...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-500">Administra las cuentas de técnicos y operadores.</p>
        </div>
        <button 
          onClick={() => { setEditingTech(null); setNewTech({ name: '', email: '', password: '', role: 'tech' }); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Plus size={20} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {techs.map((tech, index) => (
          <motion.div 
            key={tech.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                    <User className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 leading-tight text-sm md:text-base">{tech.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        tech.role === 'tech' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {tech.role === 'tech' ? 'Técnico' : 'Operador'}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500">{tech.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => openEditModal(tech)}
                  className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 rounded-lg md:opacity-0 group-hover:opacity-100"
                  title="Editar Perfil"
                >
                  <Edit2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="px-2 py-0.5 md:px-2.5 md:py-1 bg-primary/5 text-primary rounded-full flex items-center gap-1.5">
                  <Building2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">
                    {tech.condoCount || 0} Condominios
                  </span>
                </div>
              </div>
              
              <div className="pt-3 md:pt-4 border-t border-slate-100">
                <button 
                  onClick={() => openAssignModal(tech)}
                  className="w-full flex items-center justify-center gap-2 py-2 md:py-2.5 bg-slate-50 hover:bg-primary hover:text-white text-slate-700 rounded-xl text-xs md:text-sm font-bold transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>Gestionar Asignaciones</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal: Nuevo/Editar Técnico */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 100 }} className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-5 md:p-6 border-b flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">{editingTech ? 'Editar Técnico' : 'Nuevo Técnico'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveTech} className="p-5 md:p-6 space-y-4 md:space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" required className="input-field pl-10 py-3" value={newTech.name} onChange={e => setNewTech({...newTech, name: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" required className="input-field pl-10 py-3" value={newTech.email} onChange={e => setNewTech({...newTech, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Contraseña {editingTech && '(opcional)'}</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" required={!editingTech} className="input-field pl-10 py-3" value={newTech.password} onChange={e => setNewTech({...newTech, password: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Rol</label>
                  <select 
                    className="input-field py-3" 
                    value={newTech.role} 
                    onChange={e => setNewTech({...newTech, role: e.target.value})}
                  >
                    <option value="tech">Técnico</option>
                    <option value="operator">Operador</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">
                    {saving ? <Loader2 className="animate-spin" size={20} /> : (editingTech ? 'Guardar' : 'Crear')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Asignar Condominios */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAssignModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 100 }} className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-5 md:p-6 border-b flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">Asignar Condominios</h2>
                  <p className="text-xs md:text-sm text-slate-500">{selectedTech?.name}</p>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-5 md:p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 gap-2">
                  {condos.map(condo => (
                    <button
                      key={`assign-condo-${condo.id}`}
                      onClick={() => handleToggleCondo(condo.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        assignedCondoIds.includes(condo.id)
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center border shrink-0 ${
                        assignedCondoIds.includes(condo.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'
                      }`}>
                        {assignedCondoIds.includes(condo.id) && <Check size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{condo.name}</p>
                        <p className="text-xs opacity-70 truncate">{condo.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5 md:p-6 border-t bg-slate-50 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSaveAssignments} disabled={saving} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
