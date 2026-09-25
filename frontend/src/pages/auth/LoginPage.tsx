import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { QrCode, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleFillDemo = (type: 'admin' | 'owner') => {
    if (type === 'admin') {
      setEmail('admin@reviewtap.io');
      setPassword('Admin@123456');
    } else {
      setEmail('owner@artisanroasters.com');
      setPassword('Owner@123456');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { message?: string } } };
        setError(axErr.response?.data?.message || 'Invalid email or password');
      } else {
        setError('Connection failed. Please verify the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white font-heading tracking-tight">
            Welcome to Review<span className="text-indigo-400">Tap</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Tap. Scan. Review. — Sign in to manage your smart review touchpoints.
          </p>
        </div>

        {/* Demo Credentials Quick Fill Bar */}
        <div className="mt-6 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium text-slate-300">Quick Test Fill:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('owner')}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              Demo Merchant
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
            >
              Super Admin
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-4 glass-panel py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-slate-800/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
