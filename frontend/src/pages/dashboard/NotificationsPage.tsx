import React, { useState, useEffect } from 'react';
import { NotificationService } from '../../services/notification.service';
import { Navbar } from '../../components/common/Navbar';
import { Notification, NotificationType, NotificationStatus } from '../../types';
import {
  Bell,
  CheckCheck,
  Archive,
  CreditCard,
  Gauge,
  Radio,
  Building2,
  Users,
  Info,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await NotificationService.list({
        status: statusFilter ? (statusFilter as NotificationStatus) : undefined,
        limit: 50,
      });
      if (res) {
        setNotifications(res.notifications || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [statusFilter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await NotificationService.archive(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUBSCRIPTION':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'USAGE_LIMIT':
        return <Gauge className="w-4 h-4 text-amber-400" />;
      case 'NFC_CARD':
        return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'BUSINESS':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'TEAM':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'SYSTEM':
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bell className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Notification Center</h1>
            </div>
            <p className="text-sm text-slate-400">
              System alerts, billing updates, team activity, and quota warnings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Notifications</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read</option>
            </select>

            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              <CheckCheck className="w-4 h-4 text-indigo-400" />
              Mark All Read
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No notifications</h3>
            <p className="text-sm text-slate-400 mt-1">You are all caught up with alerts and system updates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition flex items-start gap-4 ${
                  notif.status === 'UNREAD'
                    ? 'bg-slate-900/90 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {getTypeIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {notif.type}
                    </span>
                    <h3 className="text-sm font-semibold text-white truncate">{notif.title}</h3>
                    {notif.status === 'UNREAD' && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">{notif.message}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {new Date(notif.createdAt).toLocaleString()}
                    {notif.business && <span> • {notif.business.name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.status === 'UNREAD' && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      title="Mark as Read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Archive Notification"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
