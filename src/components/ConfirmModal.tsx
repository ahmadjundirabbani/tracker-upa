import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isDanger = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertCircle className="h-6 w-6" id="confirm-modal-icon" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1" id="confirm-modal-title">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed" id="confirm-modal-message">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            id="confirm-modal-cancel"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            id="confirm-modal-confirm"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors cursor-pointer shadow-sm ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
