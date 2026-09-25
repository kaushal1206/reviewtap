import React, { useState, useEffect } from 'react';
import { IntelligenceService } from '../../services/intelligence.service';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { BusinessHealth, BusinessInsight, ReviewIntelligence } from '../../types';
import { Lightbulb } from 'lucide-react';

export const BusinessInsightsPage: React.FC = () => {
  const { businesses, isLoading: isBusinessesLoading } = useBusinesses({ limit: 100 });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [health, setHealth] = useState<BusinessHealth | null>(null);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [intelligence, setIntelligence] = useState<ReviewIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const fetchData = async () => {
    if (!selectedBusinessId) return;
    try {
      setLoading(true);
      setError(null);
      const [healthData, insightsData, intelligenceData] = await Promise.all([
        IntelligenceService.getHealth(selectedBusinessId),
        IntelligenceService.getInsights(selectedBusinessId),
        IntelligenceService.getIntelligence(selectedBusinessId),
      ]);
      if (healthData) setHealth(healthData);
      setInsights(insightsData || []);
      if (intelligenceData) setIntelligence(intelligenceData);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load business intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      fetchData();
    }
  }, [selectedBusinessId]);

  const handleDismiss = async (insightId: string) => {
    if (!selectedBusinessId) return;
    try {
      await IntelligenceService.dismissInsight(selectedBusinessId, insightId);
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to dismiss insight');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'INACTIVE':
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'INFO':
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Lightbulb className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
                Review Intelligence & Health
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Customer success telemetry, automated recommendations, and algorithmic health scoring for {currentBusiness?.name}.
            </p>
          </div>

          {businesses.length > 1 && (
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {isBusinessesLoading || loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No businesses found</h3>
            <p className="text-sm text-slate-400 mt-1">Please create a business profile before viewing intelligence.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Health Scoring Grid */}
            {health && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Score Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health Index</span>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(health.status)}`}>
                        {health.status}
                      </span>
                    </div>
                    <div className="mt-6 flex items-baseline gap-3">
                      <span className="text-5xl font-extrabold text-white tracking-tight">{health.score}</span>
                      <span className="text-slate-500 font-medium text-lg">/ 100</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {health.status === 'HEALTHY'
                        ? 'Your review tap points are seeing strong scan velocity and balanced hardware utilization.'
                        : health.status === 'WARNING'
                        ? 'Activity or hardware engagement has slowed down recently. Follow recommendations below.'
                        : 'Minimal to zero scans recorded in the last 30 days. Immediate outreach recommended.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Evaluated across 4 core telemetry dimensions.</span>
                  </div>
                </div>

                {/* Breakdown Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">Component Breakdown</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 font-medium">Activity Recency</span>
                        <span className="text-white font-semibold">{health.breakdown.activityScore} / 25</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${(health.breakdown.activityScore / 25) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 font-medium">Scan Velocity</span>
                        <span className="text-white font-semibold">{health.breakdown.volumeScore} / 30</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${(health.breakdown.volumeScore / 30) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 font-medium">Hardware Deployment</span>
                        <span className="text-white font-semibold">{health.breakdown.hardwareScore} / 25</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${(health.breakdown.hardwareScore / 25) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 font-medium">Subscription Health</span>
                        <span className="text-white font-semibold">{health.breakdown.subscriptionScore} / 20</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(health.breakdown.subscriptionScore / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {health.factors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Observed Factors:</div>
                      <ul className="space-y-1">
                        {health.factors.map((factor, idx) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Automated Recommendations & Insights */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Automated Customer Success Insights</h2>
                  <p className="text-sm text-slate-400">Algorithmic action recommendations to maximize customer reviews.</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full font-medium">
                  {insights.length} active
                </span>
              </div>

              {insights.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  No pending action recommendations. Everything is running smoothly!
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-700"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getSeverityBadge(insight.severity)}`}>
                            {insight.severity}
                          </span>
                          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{insight.type}</span>
                          <h3 className="text-sm font-semibold text-white ml-1">{insight.title}</h3>
                        </div>
                        <p className="text-xs text-slate-400">{insight.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {insight.actionUrl && (
                          <a
                            href={insight.actionUrl}
                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                          >
                            Take Action
                          </a>
                        )}
                        <button
                          onClick={() => handleDismiss(insight.id)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review Intelligence Telemetry */}
            {intelligence && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Scans (All-Time)</span>
                    <p className="text-3xl font-bold text-white mt-2">{intelligence.summary.totalScans.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Redirects</span>
                    <p className="text-3xl font-bold text-indigo-400 mt-2">{intelligence.summary.totalRedirects.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NFC Taps</span>
                    <p className="text-3xl font-bold text-cyan-400 mt-2">{intelligence.summary.totalNfcTaps.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">7-Day Growth</span>
                    <p className={`text-3xl font-bold mt-2 ${intelligence.velocity.weeklyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {intelligence.velocity.weeklyChangePercent > 0 ? '+' : ''}
                      {intelligence.velocity.weeklyChangePercent}%
                    </p>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {intelligence.velocity.current7Days} vs {intelligence.velocity.previous7Days} scans
                    </span>
                  </div>
                </div>

                {/* Top Hardware Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Top Performing NFC Cards</h3>
                    {intelligence.topPerformers.nfcCards.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No active NFC cards recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {intelligence.topPerformers.nfcCards.map((card) => (
                          <div key={card.id} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                            <div>
                              <div className="text-sm font-medium text-white">{card.label}</div>
                              <div className="text-xs text-slate-500 font-mono">UID: {card.identifier}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-indigo-400">{card.totalEvents} taps</div>
                              <div className="text-xs text-slate-500">{card.percentageOfTotal}% share</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Top Performing QR Sources</h3>
                    {intelligence.topPerformers.qrSources.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No QR scan sources recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {intelligence.topPerformers.qrSources.map((source) => (
                          <div key={source.id} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                            <div>
                              <div className="text-sm font-medium text-white">{source.label}</div>
                              <div className="text-xs text-slate-500 font-mono">Code: {source.identifier}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-cyan-400">{source.totalEvents} scans</div>
                              <div className="text-xs text-slate-500">{source.percentageOfTotal}% share</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
