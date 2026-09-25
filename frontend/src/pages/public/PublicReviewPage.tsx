import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Business } from '../../types';
import { Star, ExternalLink, MapPin, Sparkles, AlertCircle } from 'lucide-react';

export const PublicReviewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/public/business/${slug}`);
        if (res.data.success) {
          setBusiness(res.data.data.business);
        }
      } catch {
        setError('Business profile not found or currently inactive.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBusiness();
    }
  }, [slug]);

  const handleReviewClick = () => {
    // Trigger festive celebratory confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (business?.googleReviewUrl) {
      setTimeout(() => {
        window.location.href = business.googleReviewUrl;
      }, 400);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-heading">
            Link Inactive or Not Found
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {error || 'This ReviewTap link is not connected to an active business.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Review Card */}
      <div className="relative z-10 max-w-sm w-full glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl text-center flex flex-col items-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ReviewTap Experience</span>
        </div>

        {/* Business Avatar / Name */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-indigo-500/25 mb-4">
          {business.name.charAt(0)}
        </div>

        <h1 className="text-2xl font-extrabold text-white font-heading tracking-tight mb-1">
          {business.name}
        </h1>

        {business.category && (
          <p className="text-xs text-slate-400 font-medium mb-3">
            {business.category}
          </p>
        )}

        {business.address && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-6">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[260px]">{business.address}</span>
          </div>
        )}

        {/* 5-Star Rating Visual */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 w-full">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce"
              style={{ animationDelay: `${star * 100}ms` }}
            />
          ))}
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          How was your experience today? Tap below to share your review on Google. It only takes 10 seconds!
        </p>

        {/* Primary Review CTA */}
        <button
          onClick={handleReviewClick}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 border border-indigo-400/30 group"
        >
          <span>Review Us on Google</span>
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        {/* Micro Footer */}
        <div className="mt-8 text-[11px] text-slate-500 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <strong className="text-slate-400 font-heading">ReviewTap</strong>
            <span>• Tap. Scan. Review.</span>
          </div>
          <span className="text-[10px] text-slate-600">Developed by Kaushal Bhardwaj</span>
        </div>
      </div>
    </div>
  );
};
