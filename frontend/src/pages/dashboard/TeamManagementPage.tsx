import React, { useState, useEffect } from 'react';
import { TeamService } from '../../services/team.service';
import { useBusinesses } from '../../hooks/useBusinesses';
import { Navbar } from '../../components/common/Navbar';
import { TeamMember, Invitation, TeamRole } from '../../types';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';

export const TeamManagementPage: React.FC = () => {
  const { businesses, isLoading: isBusinessesLoading } = useBusinesses({ limit: 100 });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('STAFF');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize selectedBusinessId once businesses load
  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const loadTeamData = async () => {
    if (!selectedBusinessId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [membersData, invitesData] = await Promise.all([
        TeamService.listMembers(selectedBusinessId),
        TeamService.listInvitations(selectedBusinessId),
      ]);
      setMembers(membersData);
      setInvitations(invitesData);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessId) {
      loadTeamData();
    }
  }, [selectedBusinessId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !inviteEmail.trim()) return;

    try {
      setInviteSubmitting(true);
      setInviteError(null);
      const res = await TeamService.inviteMember(
        selectedBusinessId,
        inviteEmail.trim(),
        inviteRole
      );
      setGeneratedInviteLink(res?.inviteLink || null);
      setInviteEmail('');
      loadTeamData();
    } catch (err: any) {
      setInviteError(err?.response?.data?.error?.message || err?.message || 'Failed to send invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await TeamService.revokeInvitation(selectedBusinessId, invitationId);
      loadTeamData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!selectedBusinessId) return;
    if (!confirm(`Are you sure you want to remove ${name} from this business?`)) return;
    try {
      await TeamService.removeMember(selectedBusinessId, memberId);
      loadTeamData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to remove team member');
    }
  };

  const handleUpdateRole = async (memberId: string, role: TeamRole) => {
    if (!selectedBusinessId) return;
    try {
      await TeamService.updateMemberRole(selectedBusinessId, memberId, role);
      loadTeamData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to update member role');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Team Management</h1>
            </div>
            <p className="text-sm text-slate-400">
              Manage operational staff accounts, manager roles, and invitations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

            <button
              onClick={() => {
                setGeneratedInviteLink(null);
                setInviteError(null);
                setIsInviteModalOpen(true);
              }}
              disabled={!selectedBusinessId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isBusinessesLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No businesses found</h3>
            <p className="text-sm text-slate-400 mt-1">Please create a business profile before managing team members.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Members Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Team Members ({members.length})</h2>
                  <p className="text-xs text-slate-400">Users with active operational access to {currentBusiness?.name}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading team members...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No team members joined yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Joined Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-white flex items-center gap-2">
                              {member.fullName}
                              {member.isBusinessOwner && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                                  Primary Owner
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500">{member.email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {member.isBusinessOwner ? (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                OWNER
                              </span>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value as TeamRole)}
                                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="MANAGER">MANAGER</option>
                                <option value="STAFF">STAFF</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {!member.isBusinessOwner && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.fullName)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Remove team member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Invitations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Pending Invitations ({invitations.filter((i) => i.status === 'PENDING').length})</h2>
                  <p className="text-xs text-slate-400">Invited staff members who have not yet accepted their invitation</p>
                </div>
              </div>

              {invitations.filter((i) => i.status === 'PENDING').length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
                  No pending invitations.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Invitee Email</th>
                        <th className="px-4 py-3">Assigned Role</th>
                        <th className="px-4 py-3">Sent By</th>
                        <th className="px-4 py-3">Expires At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {invitations
                        .filter((i) => i.status === 'PENDING')
                        .map((invite) => (
                          <tr key={invite.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-4 py-3.5 font-mono text-white text-xs">{invite.email}</td>
                            <td className="px-4 py-3.5">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                {invite.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400">
                              {invite.invitedBy?.fullName || 'Owner'}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition border border-rose-500/20"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Send an invite link to onboard a manager or staff member to {currentBusiness?.name}.
                </p>
              </div>

              {inviteError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  {inviteError}
                </div>
              )}

              {generatedInviteLink ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-400 mb-2">Invitation Created Successfully!</p>
                    <p className="text-xs text-slate-300 mb-3">
                      Share this secure invitation link with the recipient:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInviteLink}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedInviteLink)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Invitee Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role & Permissions</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STAFF">STAFF — View analytics and operations</option>
                      <option value="MANAGER">MANAGER — Manage NFC cards, stands & staff</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                    >
                      {inviteSubmitting ? 'Creating...' : 'Generate Invite Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
