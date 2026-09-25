import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { Navbar } from '../../components/common/Navbar';
import {
  BarChart3,
  QrCode,
  Smartphone,
  TrendingUp,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { overview, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  const kpis = overview?.kpis || {
    totalEvents: 0,
    qrEvents: 0,
    nfcEvents: 0,
    todayEvents: 0,
    last7DaysEvents: 0,
    last30DaysEvents: 0,
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
  };

  const distribution = overview?.distribution || {
    qr: 0,
    nfc: 0,
    total: 0,
    qrPercentage: 0,
    nfcPercentage: 0,
  };

  const trends = overview?.trends || [];
  const maxTrendTotal = Math.max(1, ...trends.map((t) => t.total));

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-indigo-400" />
                Aggregated Telemetry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Traffic & Redirect Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time measurement of customer interactions across physical QR codes and NFC touchpoints.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 mb-6">
            {error}
          </div>
        )}

        {/* 6 Primary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Total Redirects
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.totalEvents}
            </div>
            <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>All time</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              QR Scans
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.qrEvents}
            </div>
            <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              <span>{distribution.qrPercentage}% share</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              NFC Taps
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.nfcEvents}
            </div>
            <div className="text-[11px] text-purple-400 mt-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>{distribution.nfcPercentage}% share</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Scans Today
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.todayEvents}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Active today</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Last 7 Days
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.last7DaysEvents}
            </div>
            <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Weekly volume</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Last 30 Days
            </span>
            <div className="text-2xl font-extrabold text-white font-heading">
              {kpis.last30DaysEvents}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Monthly volume</span>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Daily Trend Time Series Visual (2 Cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Daily Redirect Volume
                </h3>
                <p className="text-xs text-slate-400">
                  Daily scans and NFC taps over the last 14 days.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>QR Scans</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>NFC Taps</span>
                </span>
              </div>
            </div>

            {/* Custom Bar Chart Visual */}
            <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 border-b border-slate-800">
              {trends.map((point) => {
                const totalHeight = Math.max(4, Math.round((point.total / maxTrendTotal) * 100));
                const qrHeight = point.total > 0 ? Math.round((point.qr / point.total) * 100) : 0;
                const nfcHeight = point.total > 0 ? Math.round((point.nfc / point.total) * 100) : 0;

                return (
                  <div key={point.date} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] text-white px-2 py-1 rounded-md shadow-xl pointer-events-none whitespace-nowrap z-20">
                      {point.date}: {point.total} total ({point.qr} QR, {point.nfc} NFC)
                    </div>

                    {/* Bar container */}
                    <div
                      className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-125"
                      style={{ height: `${totalHeight}%` }}
                    >
                      {point.nfc > 0 && (
                        <div
                          className="w-full bg-purple-500"
                          style={{ height: `${nfcHeight}%` }}
                        />
                      )}
                      <div
                        className="w-full bg-indigo-600"
                        style={{ height: point.nfc > 0 ? `${qrHeight}%` : '100%' }}
                      />
                    </div>

                    {/* Date label */}
                    <span className="text-[10px] text-slate-500 font-mono rotate-[-45deg] origin-top-left mt-2">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source Distribution Card (1 Col) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PieChart className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-heading">
                  Source Distribution
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Customer engagement channels comparison.
              </p>

              {/* Progress Bars */}
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 text-slate-200 font-medium">
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      <span>QR Code Scans</span>
                    </span>
                    <span className="font-bold text-white">
                      {distribution.qr} ({distribution.qrPercentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${distribution.qrPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 text-slate-200 font-medium">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <span>NFC Card Taps</span>
                    </span>
                    <span className="font-bold text-white">
                      {distribution.nfc} ({distribution.nfcPercentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${distribution.nfcPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-slate-300 mt-6">
              <strong className="text-indigo-300 block mb-0.5">Physical Countertop Tip</strong>
              NFC cards yield high engagement when embedded on check-out counters and restaurant table stands.
            </div>
          </div>
        </div>

        {/* Top Performing Businesses & Device Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Locations Table */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
            <h3 className="text-base font-bold text-white font-heading mb-1">
              Top Locations by Traffic
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Your highest-traffic review touchpoints.
            </p>

            <div className="space-y-3">
              {overview?.topBusinesses && overview.topBusinesses.length > 0 ? (
                overview.topBusinesses.map((biz, idx) => (
                  <div
                    key={biz.id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/20">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-white truncate max-w-[200px]">
                          {biz.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          /r/{biz.slug}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-indigo-400">
                        {biz._count.scanEvents}
                      </div>
                      <div className="text-[10px] uppercase text-slate-500">
                        Scans
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">
                  No scan data available yet.
                </div>
              )}
            </div>
          </div>

          {/* Device & OS Distribution */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
            <h3 className="text-base font-bold text-white font-heading mb-1">
              Devices & Platforms
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Customer operating systems and device types.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Top Devices
                </span>
                {overview?.devices.devices && overview.devices.devices.length > 0 ? (
                  overview.devices.devices.map((d) => (
                    <div key={d.device} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-300">{d.device}</span>
                      <span className="font-semibold text-white">{d.count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No data</span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Top Operating Systems
                </span>
                {overview?.devices.operatingSystems && overview.devices.operatingSystems.length > 0 ? (
                  overview.devices.operatingSystems.map((o) => (
                    <div key={o.os} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[100px]">{o.os}</span>
                      <span className="font-semibold text-white">{o.count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No data</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
