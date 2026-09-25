import React, { useState } from 'react';
import { BusinessStatus } from '../../types';
import { CheckCircle2, PauseCircle, Archive, ChevronDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: BusinessStatus;
  onStatusChange?: (newStatus: BusinessStatus) => Promise<void>;
  editable?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  onStatusChange,
  editable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = {
    ACTIVE: {
      label: 'Active',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    },
    INACTIVE: {
      label: 'Inactive',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <PauseCircle className="w-3 h-3 text-amber-400" />,
    },
    ARCHIVED: {
      label: 'Archived',
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      icon: <Archive className="w-3 h-3 text-slate-400" />,
    },
  };

  const current = statusConfig[status] || statusConfig.ACTIVE;

  const handleSelect = async (newStatus: BusinessStatus) => {
    if (newStatus === status || !onStatusChange) return;
    setIsOpen(false);
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={!editable || isUpdating}
        onClick={() => editable && setIsOpen(!isOpen)}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none',
          current.color,
          editable && 'hover:brightness-110 cursor-pointer pr-2'
        )}
      >
        {isUpdating ? (
          <Loader2 className="w-3 h-3 animate-spin text-slate-300" />
        ) : (
          current.icon
        )}
        <span>{current.label}</span>
        {editable && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
      </button>

      {/* Status Transition Dropdown */}
      {isOpen && editable && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 rounded-xl glass-dropdown py-1.5 z-50 text-xs shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95">
            {(['ACTIVE', 'INACTIVE', 'ARCHIVED'] as BusinessStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={clsx(
                  'w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800/80 transition-colors',
                  s === status ? 'text-white font-semibold' : 'text-slate-400'
                )}
              >
                {statusConfig[s].icon}
                <span>{statusConfig[s].label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
