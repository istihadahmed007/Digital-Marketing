import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * If true, applies 3D hover depth (lifts 2-4px, tilts 2-3 degrees).
   * Eligible for preview tiles, stat highlights, and summary cards.
   * NEVER use on forms, tables, charts, or text editors.
   */
  preview3D?: boolean;
  /**
   * Opaque surface (94% opacity) for dense text, forms, tables, and dialogs.
   */
  opaque?: boolean;
  /**
   * Accent border tint
   */
  accent?: 'default' | 'primary' | 'subtle';
  className?: string;
}

export function GlassCard({
  children,
  preview3D = false,
  opaque = false,
  accent = 'default',
  className = '',
  ...props
}: GlassCardProps) {
  const baseClass = opaque ? 'glass-panel-opaque' : 'glass-panel';
  const motionClass = preview3D ? 'preview-tile-3d' : 'glass-panel-stable';
  
  const accentBorder =
    accent === 'primary'
      ? 'border-[#75D2EE]/80 dark:border-sky-500/50'
      : accent === 'subtle'
      ? 'border-[#D7F1FA]/60 dark:border-sky-900/40'
      : 'border-[#75D2EE]/45 dark:border-sky-800/40';

  return (
    <div
      className={`${baseClass} ${motionClass} ${accentBorder} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
