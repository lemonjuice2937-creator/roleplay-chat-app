"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import {
  fetchReferences,
  uploadReferenceFile,
  saveReferenceRecord,
  deleteReference,
} from '../services/referencesService';

interface ReferencesViewProps {
  roleId: string;
  userId: string;
  isOwner: boolean;
  onBack: () => void;
}

export default function ReferencesView({ roleId, userId, isOwner, onBack }: ReferencesViewProps) {
  const [references, setReferences] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const data = await fetchReferences(roleId);
      setReferences(data);
    } catch (err) {
      console.error('Erro ao carregar referências:', err);
    }
  };

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
      const imageUrl = await uploadReferenceFile(selectedFile);
      await saveReferenceRecord(userId, imageUrl, nome || undefined, descricao || undefined, roleId);
      setNome('');
      setDescricao('');
      setSelectedFile(null);
      setPreviewUrl(null);
      await loadReferences();
    } catch (err: any) {
      console.error('Erro ao salvar referência:', err);
      setError(err?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      await deleteReference(id, filePath);
      setReferences((prev) => prev.filter((ref) => ref.id !== id));
    } catch (err) {
      console.error('Erro ao deletar referência:', err);
    }
  };

  const extractFilePath = (imageUrl: string): string => {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('referencias');
    if (bucketIndex === -1) return '';
    return pathParts.slice(bucketIndex + 1).join('/');
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
          <h2 className="text-xl font-bold text-white">Banco de Referências</h2>
          <div className="w-10" />
        </div>

        {isOwner && (
          <div className="bg-navy-800 rounded-2xl p-4 mb-6 border border-purple-500/20">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-white bg-navy-900 border border-purple-500/20 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
              placeholder="Nome da referência (opcional)"
            />

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full text-white bg-navy-900 border border-purple-500/20 rounded-xl px-4 py-3 mb-3 resize-none focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
              placeholder="Descrição (opcional)"
              rows={2}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full h-40 border-2 border-dashed border-purple-500/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-colors mb-4 overflow-hidden"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={32} className="text-purple-500/50 mb-2" />
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
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>

            {error && (
              <p className="mt-2 text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="bg-navy-800 rounded-2xl overflow-hidden border border-purple-500/20"
            >
              <div className="aspect-square bg-navy-900">
                <img
                  src={ref.imagem_url}
                  alt={ref.nome || 'Referência'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                {ref.nome && (
                  <p className="text-white text-sm font-medium truncate">{ref.nome}</p>
                )}
                {ref.descricao && (
                  <p className="text-white/50 text-xs truncate mt-1">{ref.descricao}</p>
                )}
                {isOwner && (
                  <button
                    onClick={() => handleDelete(ref.id, extractFilePath(ref.imagem_url))}
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

        {references.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">Nenhuma referência encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
