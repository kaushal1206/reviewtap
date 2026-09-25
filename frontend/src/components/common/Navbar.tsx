import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationService } from '../../services/notification.service';
import { Button } from './Button';
import {
  QrCode,
  LogOut,
  Sparkles,
  Building2,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  ListFilter,
  Store,
  CreditCard,
  Radio,
  Users,
  Bell,
  Activity,
  Lightbulb,
  Gauge,
} from 'lucide-react';
import { clsx } from 'clsx';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        // silent fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Businesses', path: '/dashboard/businesses', icon: <Store className="w-4 h-4" /> },
    { name: 'NFC Cards', path: '/dashboard/nfc', icon: <Radio className="w-4 h-4" /> },
    { name: 'Team', path: '/dashboard/team', icon: <Users className="w-4 h-4" /> },
    { name: 'Insights', path: '/dashboard/insights', icon: <Lightbulb className="w-4 h-4" /> },
    { name: 'Activity', path: '/dashboard/activity', icon: <Activity className="w-4 h-4" /> },
    { name: 'Usage', path: '/dashboard/usage', icon: <Gauge className="w-4 h-4" /> },
    { name: 'Analytics', path: '/dashboard/analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'Events', path: '/dashboard/events', icon: <ListFilter className="w-4 h-4" /> },
    { name: 'Billing', path: '/dashboard/subscription', icon: <CreditCard className="w-4 h-4" /> },
    ...(user?.role === 'SUPER_ADMIN'
      ? [
          { name: 'Admin Ops', path: '/dashboard/admin/overview', icon: <ShieldCheck className="w-4 h-4" /> },
          { name: 'Plan Catalog', path: '/dashboard/admin/plans', icon: <ShieldCheck className="w-4 h-4" /> },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-heading">
                  Review<span className="text-indigo-400">Tap</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Phase 6
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Tap. Scan. Review.
              </p>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {user && (
            <nav className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  link.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(link.path);

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    )}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* User Session & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notification Bell */}
              <Link
                to="/dashboard/notifications"
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-slate-950 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                {user.role === 'SUPER_ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="text-slate-200 font-medium">{user.fullName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Merchant'}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={<LogOut className="w-4 h-4" />}
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
