"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import {
  fetchSkills,
  saveSkillRecord,
  deleteSkill,
} from '../services/skillsService';

interface SkillsViewProps {
  roleId: string;
  userId: string;
  isOwner: boolean;
  onBack: () => void;
}

export default function SkillsView({ roleId, userId, isOwner, onBack }: SkillsViewProps) {
  const [skills, setSkills] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await fetchSkills(roleId);
      setSkills(data);
    } catch (err) {
      console.error('Erro ao carregar habilidades:', err);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await saveSkillRecord(userId, nome.trim(), descricao.trim() || undefined, roleId);
      setNome('');
      setDescricao('');
      await loadSkills();
    } catch (err: any) {
      console.error('Erro ao salvar habilidade:', err);
      setError(err?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSkill(id);
      setSkills((prev) => prev.filter((skill) => skill.id !== id));
    } catch (err) {
      console.error('Erro ao deletar habilidade:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-navy-900 rounded-3xl border border-purple-500/30 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center active:scale-90 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <h2 className="text-xl font-bold text-white">Banco de Habilidades</h2>
          <div className="w-10" />
        </div>

        {isOwner && (
          <div className="bg-navy-800 rounded-2xl p-4 mb-6 border border-purple-500/20">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-white bg-navy-900 border border-purple-500/20 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
              placeholder="Nome da habilidade"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full text-white bg-navy-900 border border-purple-500/20 rounded-xl px-4 py-3 mb-3 resize-none focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
              placeholder="Descrição da habilidade (efeito, custo, mecânica, etc.)"
              rows={3}
            />

            <button
              onClick={handleSave}
              disabled={!nome.trim() || loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {loading ? 'Adicionando...' : 'Adicionar Habilidade'}
            </button>

            {error && (
              <p className="mt-2 text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="bg-navy-800 rounded-2xl p-4 border border-purple-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-purple-400 shrink-0" />
                    <p className="text-white font-medium truncate">{skill.nome}</p>
                  </div>
                  {skill.descricao && (
                    <p className="text-white/50 text-sm leading-relaxed">{skill.descricao}</p>
                  )}
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="shrink-0 w-8 h-8 bg-red-500/10 hover:bg-red-500/20 active:scale-90 transition-all duration-200 rounded-xl flex items-center justify-center"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {skills.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Nenhuma habilidade encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
