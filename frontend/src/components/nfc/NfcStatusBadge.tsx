import React from 'react';
import { NfcCardStatus } from '../../types';
import { CheckCircle2, PauseCircle, Clock, AlertCircle, Archive } from 'lucide-react';
import { clsx } from 'clsx';

interface NfcStatusBadgeProps {
  status: NfcCardStatus;
  showIcon?: boolean;
  className?: string;
}

export const NfcStatusBadge: React.FC<NfcStatusBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'Active',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5',
          dot: 'bg-emerald-400',
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned (Pending)',
          icon: <Clock className="w-3.5 h-3.5" />,
          styles: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5',
          dot: 'bg-amber-400',
        };
      case 'UNASSIGNED':
        return {
          label: 'Unassigned',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          styles: 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-slate-500/5',
          dot: 'bg-slate-400',
        };
      case 'INACTIVE':
        return {
          label: 'Inactive',
          icon: <PauseCircle className="w-3.5 h-3.5" />,
          styles: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5',
          dot: 'bg-rose-400',
        };
      case 'RETIRED':
        return {
          label: 'Retired',
          icon: <Archive className="w-3.5 h-3.5" />,
          styles: 'bg-zinc-800 text-zinc-400 border-zinc-700 shadow-none line-through',
          dot: 'bg-zinc-500',
        };
      default:
        return {
          label: status,
          icon: null,
          styles: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-sm',
        config.styles,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
