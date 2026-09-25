import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { TeamService } from '../../services/team.service';
import { Invitation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import confetti from 'canvas-confetti';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Building2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing.');
      setIsLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        const data = await TeamService.getInvitationPreview(token);
        if (data) {
          setInvitation(data);
        } else {
          setError('Invitation not found or has expired.');
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || err.message || 'Failed to load invitation.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await TeamService.acceptInvitation(token);
      setIsAccepted(true);

      // Trigger celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        navigate('/dashboard/businesses');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Team Invitation</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
            ReviewTap Collaboration
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400">Verifying invitation token...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Invitation Error</p>
              <p className="text-xs text-rose-300/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {isAccepted && (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-400 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to the Team!</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              You are now an authorized member of {invitation?.business?.name}. Redirecting to your dashboard...
            </p>
          </div>
        )}

        {/* Invitation Details & Acceptance Action */}
        {!isLoading && !isAccepted && invitation && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {invitation.business?.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Invited by {invitation.invitedBy?.fullName || 'Business Owner'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {invitation.role === 'MANAGER' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {invitation.role}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Manage customer review NFC cards and QR stands.</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Track tap analytics and review conversion growth.</span>
              </p>
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  Signed in as: <span className="text-slate-200 font-medium">{user.email}</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  onClick={handleAccept}
                  isLoading={isSubmitting}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Accept & Join Team
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to={`/login?redirect=/invite/${token}`}
                  className="block w-full"
                >
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Sign In to Accept
                  </Button>
                </Link>
                <Link
                  to={`/register?redirect=/invite/${token}`}
                  className="block w-full"
                >
                  <Button variant="outline" size="lg" className="w-full justify-center">
                    Create New Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
