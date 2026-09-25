import React, { useState } from 'react';
import { Business } from '../../types';
import { Button } from '../common/Button';
import { Download, ExternalLink, Copy, Check, Smartphone, Sparkles, AlertCircle } from 'lucide-react';

interface QRCodeViewerProps {
  business: Business;
}

export const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ business }) => {
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingSvg, setDownloadingSvg] = useState(false);

  // Review URL that the QR/NFC points to
  const redirectUrl = `${window.location.origin}/r/${business.slug}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = (format: 'png' | 'svg') => {
    if (format === 'png') setDownloadingPng(true);
    if (format === 'svg') setDownloadingSvg(true);

    const downloadUrl = `/api/businesses/${business.id}/qr?format=${format}&download=true`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${business.slug}-reviewtap-qr.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingPng(false);
      setDownloadingSvg(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Visual Frame */}
      <div className="flex flex-col items-center">
        {/* Printable Countertop Stand Preview */}
        <div className="relative group p-6 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex flex-col items-center text-center max-w-xs w-full">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              ReviewTap Stand
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              /r/{business.slug}
            </span>
          </div>

          {/* Business Branding Header */}
          <h4 className="text-base font-bold text-white font-heading truncate max-w-[240px]">
            {business.name}
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Tap NFC or Scan QR to leave a 5-star review!
          </p>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-indigo-500/20 mb-4 group-hover:scale-[1.02] transition-transform">
            <img
              src={`/api/businesses/${business.id}/qr?format=svg`}
              alt={`${business.name} QR Code`}
              className="w-48 h-48 block"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Reviews Direct Link</span>
          </div>
        </div>
      </div>

      {/* Target Link and Copy Action */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Unique Redirect & NFC Target URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={redirectUrl}
            className="flex-1 bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs rounded-lg px-3 py-2.5 focus:outline-none"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={copyUrl}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open redirect in new tab"
          >
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Test
            </Button>
          </a>
        </div>
      </div>

      {/* Downloads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="primary"
          onClick={() => handleDownload('png')}
          isLoading={downloadingPng}
          icon={<Download className="w-4 h-4" />}
          className="w-full"
        >
          Download Print PNG (1024px)
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleDownload('svg')}
          isLoading={downloadingSvg}
          icon={<Download className="w-4 h-4" />}
          className="w-full"
        >
          Download Vector SVG
        </Button>
      </div>

      {/* NFC & Physical Deployment Tip */}
      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3 text-xs text-slate-300">
        <Smartphone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-indigo-300 font-semibold block mb-0.5">
            NFC Card & Countertop Deployment Ready
          </strong>
          To program an NFC card or tap puck, write the redirect URL above into an NTAG213/215 chip using the free <em>NFC Tools</em> app on iOS or Android.
        </div>
      </div>

      {/* Real Google Review URL info */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="truncate">
          Current Google Destination: <span className="font-mono text-slate-400">{business.googleReviewUrl}</span>
        </span>
      </div>
    </div>
  );
};
