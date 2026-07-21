"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {
  fetchClothing,
  uploadClothingFile,
  saveClothingRecord,
  deleteClothing,
  type VestuarioItem,
} from '../services/clothingService';

interface ClothingViewProps {
  roleId: string;
  userId: string;
  canEdit: boolean;
  onBack: () => void;
}

export default function ClothingView({ roleId, userId, canEdit, onBack }: ClothingViewProps) {
  const [clothing, setClothing] = useState<VestuarioItem[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filePath: string; nome: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClothing = useCallback(async () => {
    try {
      const data = await fetchClothing(roleId);
      setClothing(data);
    } catch (err) {
      console.error('Erro ao carregar vestuário:', err);
    }
  }, [roleId]);

  useEffect(() => {
    loadClothing();
  }, [loadClothing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    try {
      const imageUrl = await uploadClothingFile(selectedFile);
      await saveClothingRecord(userId, imageUrl, nome || undefined, descricao || undefined, roleId);
      setNome('');
      setDescricao('');
      setSelectedFile(null);
      setPreviewUrl(null);
      await loadClothing();
    } catch (err: unknown) {
      console.error('Erro ao salvar visual:', err);
      setError((err as Error)?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      await deleteClothing(id, filePath);
      setClothing((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Erro ao deletar visual:', err);
    }
  };

  const extractFilePath = (imageUrl: string): string => {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('vestuario');
    if (bucketIndex === -1) return '';
    return pathParts.slice(bucketIndex + 1).join('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-navy-900 rounded-3xl border border-accent-500/30 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center active:scale-90 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <h2 className="text-xl font-bold text-white">Vestuário</h2>
          <div className="w-10" />
        </div>

        {canEdit && (
          <div className="bg-navy-800 rounded-2xl p-4 mb-6 border border-accent-500/20">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-white bg-navy-900 border border-accent-500/20 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-accent-500/50 transition-colors text-sm"
              placeholder="Nome do visual (opcional)"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full text-white bg-navy-900 border border-accent-500/20 rounded-xl px-4 py-3 mb-3 resize-none focus:outline-none focus:border-accent-500/50 transition-colors text-sm"
              placeholder="Descrição (opcional)"
              rows={2}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full h-40 border-2 border-dashed border-accent-500/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-accent-500/50 transition-colors mb-4 overflow-hidden"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={32} className="text-accent-500/50 mb-2" />
                  <span className="text-white/40 text-sm">IMAGEM/UPLOAD</span>
                  <span className="text-white/30 text-xs mt-1">Clique ou arraste</span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={handleSave}
              disabled={!selectedFile || loading}
              className="w-full py-3 bg-accent-600 hover:bg-accent-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>

            {error && (
              <p className="mt-2 text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {clothing.map((item) => (
            <div
              key={item.id}
              className="bg-navy-800 rounded-2xl overflow-hidden border border-accent-500/20"
            >
              <div className="aspect-square bg-navy-900">
                <img
                  src={item.imagem_url}
                  alt={item.nome || 'Visual'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                {item.nome && (
                  <p className="text-accent-400 text-sm font-bold truncate" style={{ textShadow: '0 0 8px rgba(30,116,196,0.6), 0 0 20px rgba(30,116,196,0.3)' }}>{item.nome}</p>
                )}
                {item.descricao && (
                  <p className="text-white/50 text-xs truncate mt-1">{item.descricao}</p>
                )}
                {canEdit && (
                  <button
                    onClick={() => setDeleteTarget({ id: item.id, filePath: extractFilePath(item.imagem_url), nome: item.nome })}
                    className="mt-2 w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all duration-200 rounded-xl text-red-400 text-xs flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {clothing.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">Nenhum visual encontrado</p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          message={`Você tem certeza de que quer excluir ${deleteTarget.nome}?`}
          onConfirm={() => { handleDelete(deleteTarget.id, deleteTarget.filePath); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

