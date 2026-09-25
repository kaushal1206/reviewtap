import React from 'react';
import { QrCode, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
            <QrCode className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-slate-300 font-heading tracking-tight">
            Review<span className="text-indigo-400">Tap</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Tap. Scan. Review.</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-2 h-2" />
            Phase 6
          </span>
        </div>

        {/* Copyright & Developer Credit */}
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-right">
          <span>&copy; {currentYear} ReviewTap. All rights reserved.</span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="text-slate-400 font-medium">Developed by Kaushal Bhardwaj</span>
        </div>
      </div>
    </footer>
  );
};
