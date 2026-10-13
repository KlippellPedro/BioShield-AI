import React, { useState } from 'react';
import { Zone, EPIType, ZoneCategory } from '../types';
import { eventsStore } from '../store/eventsStore';
import { authStore } from '../store/authStore';
import { 
  ShieldIcon, 
  PlusIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon
} from '../components/icons';

export const Zones: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>(eventsStore.getZones());
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ZoneCategory>('UTI');
  const [tRemocao, setTRemocao] = useState<number>(5);
  const [selectedEpis, setSelectedEpis] = useState<EPIType[]>(['MASCARA', 'LUVAS', 'AVENTAL']);
  const [isActive, setIsActive] = useState<boolean>(true);

  const allEpis: { type: EPIType; label: string }[] = [
    { type: 'MASCARA', label: 'Máscara (Cirúrgica ou PFF2)' },
    { type: 'LUVAS', label: 'Luvas de Procedimento' },
    { type: 'AVENTAL', label: 'Avental Descartável' },
    { type: 'TOUCA', label: 'Touca Hospitalar' },
    { type: 'PROTETOR_FACIAL', label: 'Protetor Facial (Face Shield)' },
  ];

  const handleOpenCreate = () => {
    setEditingZone(null);
    setCode('');
    setName('');
    setCategory('UTI');
    setTRemocao(5);
    setSelectedEpis(['MASCARA', 'LUVAS', 'AVENTAL']);
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setEditingZone(zone);
    setCode(zone.code);
    setName(zone.name);
    setCategory(zone.category);
    setTRemocao(zone.t_remocao_seconds);
    setSelectedEpis([...zone.required_epi]);
    setIsActive(zone.is_active);
    setShowModal(true);
  };

  const toggleEpi = (epi: EPIType) => {
    if (selectedEpis.includes(epi)) {
      setSelectedEpis(selectedEpis.filter((e) => e !== epi));
    } else {
      setSelectedEpis([...selectedEpis, epi]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    if (editingZone) {
      eventsStore.updateZone(editingZone.zone_id, {
        code,
        name,
        category,
        t_remocao_seconds: tRemocao,
        required_epi: selectedEpis,
        is_active: isActive,
      });
    } else {
      eventsStore.createZone({
        code,
        name,
        category,
        t_remocao_seconds: tRemocao,
        required_epi: selectedEpis,
        is_active: isActive,
      });
    }

    setZones([...eventsStore.getZones()]);
    setShowModal(false);
  };

  const currentHospital = authStore.getHospital();

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="medical-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShieldIcon className="w-6 h-6 text-cyan-400" />
            <span>Zonas de Risco — {currentHospital.short_name}</span>
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Setores cadastrados exclusivamente para o <strong className="text-white">{currentHospital.name}</strong>. Parâmetros de tolerância e EPIs obrigatórios desta unidade.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-medical-primary flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider self-start sm:self-auto shadow-md"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Cadastrar Novo Setor</span>
        </button>
      </div>

      {/* Hospital Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zones.map((zone) => (
          <div
            key={zone.zone_id}
            className="medical-card p-6 rounded-2xl space-y-5 hover:border-cyan-400/50 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-blue-900 shadow-sm">
                    {zone.code}
                  </span>
                  <span className="text-xs font-medium text-cyan-300 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    Setor: {zone.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{zone.name}</h3>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  zone.is_active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {zone.is_active ? 'Monitorando' : 'Inativo'}
              </span>
            </div>

            {/* Tolerance timer */}
            <div className="p-3.5 rounded-xl bg-[#07132e] border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">Tempo de Tolerância (T_remoção):</span>
              </span>
              <span className="text-white font-bold text-sm bg-blue-600 px-3 py-1 rounded-lg shadow-sm">
                {zone.t_remocao_seconds} segundos
              </span>
            </div>

            {/* Required PPEs */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Equipamentos Obrigatórios ({zone.required_epi.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {zone.required_epi.map((epi) => (
                  <span
                    key={epi}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0b1b3d] text-white border border-cyan-500/30 flex items-center gap-1.5"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{epi}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Edit Action */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => handleOpenEdit(zone)}
                className="btn-medical-secondary px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Editar Parâmetros
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0a1838] border border-cyan-400/40 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldIcon className="w-5 h-5 text-cyan-400" />
                <span>{editingZone ? 'Editar Parâmetros do Setor' : 'Cadastrar Novo Setor Hospitalar'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-200 font-semibold block mb-1.5">Código da Unidade (Ex: UTI-LESTE, CC-03):</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: UTI-SUL, SALA-CIRURGICA-04"
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-slate-200 font-semibold block mb-1.5">Nome Completo do Setor:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Unidade Coronariana — Leitos 01 a 12"
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-200 font-semibold block mb-1.5">Categoria do Setor:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ZoneCategory)}
                    className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                  >
                    <option value="UTI">UTI Adulto / Neonatal</option>
                    <option value="CENTRO_CIRURGICO">Centro Cirúrgico</option>
                    <option value="ISOLAMENTO">Isolamento Respiratório</option>
                    <option value="EMERGENCIA">Sala Vermelha / Emergência</option>
                    <option value="OUTRO">Outro Setor de Risco</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-200 font-semibold block mb-1.5">Tolerância (Segundos):</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={tRemocao}
                    onChange={(e) => setTRemocao(Number(e.target.value))}
                    className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Tempo antes de gerar alarme</span>
                </div>
              </div>

              {/* PPE Selection */}
              <div>
                <label className="text-slate-200 font-semibold block mb-2">Equipamentos de Proteção Obrigatórios:</label>
                <div className="space-y-2">
                  {allEpis.map((epi) => {
                    const isChecked = selectedEpis.includes(epi.type);
                    return (
                      <button
                        type="button"
                        key={epi.type}
                        onClick={() => toggleEpi(epi.type)}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between border ${
                          isChecked
                            ? 'bg-blue-600 text-white border-cyan-300 font-semibold shadow-sm'
                            : 'bg-[#07132e] border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-sm">{epi.label}</span>
                        <span className="text-xs font-bold">{isChecked ? '✓ Obrigatório' : '○ Opcional'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600"
                />
                <label htmlFor="isActiveToggle" className="text-slate-200 font-medium cursor-pointer text-sm">
                  Manter monitoramento ativo neste setor
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-white font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-medical-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
                >
                  Salvar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
