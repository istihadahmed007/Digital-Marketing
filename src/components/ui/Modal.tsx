'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#17364A]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog with liquid glass depth */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white/95 dark:bg-[#122836]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(22,122,160,0.18)] border border-[#75D2EE]/30 p-6 z-10 my-8 transform transition-all animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#D7F1FA] dark:border-[#167AA0]/20">
          <div>
            <h3 className="text-lg font-bold text-[#17364A] dark:text-white">{title}</h3>
            {description && (
              <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#526D7D] hover:text-[#17364A] dark:hover:text-white hover:bg-[#D7F1FA]/50 dark:hover:bg-[#167AA0]/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
