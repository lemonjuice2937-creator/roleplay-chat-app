interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'Excluir' }: ConfirmModalProps) {
  const isDestructive = confirmText === 'Excluir';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-navy-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
        <p className="text-white text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-navy-800 hover:bg-navy-700 active:scale-95 transition-all rounded-xl text-white/70 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 active:scale-95 transition-all rounded-xl font-medium ${
              isDestructive
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
