import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IbadahGroup, IbadahGroupMember, WorshipNudge, UserProfile, WorshipTarget, ActivityLog } from '../types';
import { 
  Users, 
  Plus, 
  UserPlus, 
  VolumeX, 
  BellRing, 
  LogOut, 
  Copy, 
  Check, 
  Flame, 
  User as UserIcon, 
  Share2, 
  CornerDownRight, 
  Send,
  Award,
  Sparkles
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export const BADGE_DETAILS: Record<string, { label: string; description: string; icon: string; color: string; bg: string; border: string }> = {
  consistency_guru: {
    label: "Pejuang Istiqamah",
    description: "Meraih 100% target harian selama 3+ hari dalam seminggu",
    icon: "🌟",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200"
  },
  early_bird: {
    label: "Penyambut Fajar",
    description: "Mencatat ibadah di waktu fajar/subuh (03:00 - 06:15)",
    icon: "🌅",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200"
  },
  target_crusher: {
    label: "Penakluk Target",
    description: "Menyelesaikan 10+ target ibadah dalam seminggu terakhir",
    icon: "🏆",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200"
  },
  quran_explorer: {
    label: "Penjelajah Quran",
    description: "Tuntas menjaga tilawah Al-Quran harian selama 4+ hari",
    icon: "📖",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200"
  },
  generous_heart: {
    label: "Kebaikan Sedekah",
    description: "Rajin bersedekah harian selama 3+ hari dalam seminggu",
    icon: "💝",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200"
  }
};

export function calculateEarnedBadges(targets: WorshipTarget[], activities: ActivityLog[]): string[] {
  const earned: string[] = [];
  if (!targets || targets.length === 0 || !activities || activities.length === 0) return earned;

  // Let's get list of dates for the past 7 days
  const past7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    past7Days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }

  // Helper inside loop: calculate completion rate for a given date
  const getCompletionRateForDate = (dateStr: string) => {
    let completedCount = 0;
    let totalPct = 0;
    targets.forEach(tar => {
      const act = activities.find(a => a.targetId === tar.id && a.date === dateStr);
      const val = act ? act.value : 0;
      const ratio = tar.targetValue > 0 ? (val / tar.targetValue) : 0;
      totalPct += Math.min(ratio, 1);
      if (val >= tar.targetValue) completedCount++;
    });
    const pct = targets.length > 0 ? Math.round((totalPct / targets.length) * 100) : 0;
    return { pct, completedCount };
  };

  // 1. Consistency Guru: 100% completion rate on 3 or more days in the past 7 days
  let hundredPctDays = 0;
  past7Days.forEach(date => {
    const { pct } = getCompletionRateForDate(date);
    if (pct >= 100) hundredPctDays++;
  });
  if (hundredPctDays >= 3) {
    earned.push('consistency_guru');
  }

  // 2. Early Bird: Logged any completed activity with updatedAt hour between 03:00 and 06:15 local time (or if logged in early morning) in the last 7 days
  let earlyBirdDetected = false;
  const recentActivities = activities.filter(a => past7Days.includes(a.date) && a.completed);
  for (const act of recentActivities) {
    if (act.updatedAt) {
      const d = new Date(act.updatedAt);
      const hour = d.getHours();
      const minutesSinceMidnight = hour * 60 + d.getMinutes();
      if (minutesSinceMidnight >= 180 && minutesSinceMidnight <= 375) {
        earlyBirdDetected = true;
        break;
      }
    }
  }
  if (earlyBirdDetected) {
    earned.push('early_bird');
  }

  // 3. Target Crusher: Completed total of >= 10 logs in the last 7 days
  const totalCompletedInPast7Days = recentActivities.length;
  if (totalCompletedInPast7Days >= 10) {
    earned.push('target_crusher');
  }

  // 4. Quran Explorer: Tilawah/Tadarus completion >= 4 times in the past 7 days
  let quranDays = 0;
  targets.forEach(tar => {
    const isQuran = tar.name.toLowerCase().includes('tilawah') || 
                    tar.name.toLowerCase().includes('quran') || 
                    tar.name.toLowerCase().includes('baca') || 
                    tar.name.toLowerCase().includes('ngaji');
    if (isQuran) {
      past7Days.forEach(date => {
        const act = activities.find(a => a.targetId === tar.id && a.date === date);
        if (act && act.value >= tar.targetValue) {
          quranDays++;
        }
      });
    }
  });
  if (quranDays >= 4) {
    earned.push('quran_explorer');
  }

  // 5. Generous Heart: Charity/Sedekah completed >= 3 times in the past 7 days
  let charityDays = 0;
  targets.forEach(tar => {
    const isCharity = tar.name.toLowerCase().includes('sedekah') || 
                      tar.name.toLowerCase().includes('zakat') || 
                      tar.name.toLowerCase().includes('infaq') || 
                      tar.name.toLowerCase().includes('donasi');
    if (isCharity) {
      past7Days.forEach(date => {
        const act = activities.find(a => a.targetId === tar.id && a.date === date);
        if (act && act.value >= tar.targetValue) {
          charityDays++;
        }
      });
    }
  });
  if (charityDays >= 3) {
    earned.push('generous_heart');
  }

  return earned;
}

interface WorshipGroupsProps {
  userProfile: UserProfile;
  currentDate: string;
  completionRate: number; // current user's percentage rate
  worshipSummary: string; // current user's summary e.g. "3/5 Shalat, 1/2 Halaman"
  activities: ActivityLog[];
  targets: WorshipTarget[];
}

export default function WorshipGroups({ 
  userProfile, 
  currentDate, 
  completionRate, 
  worshipSummary,
  activities,
  targets
}: WorshipGroupsProps) {
  const [group, setGroup] = useState<IbadahGroup | null>(null);
  const [members, setMembers] = useState<(IbadahGroupMember & { completionRate?: number; worshipSummary?: string; updatedAt?: string; badges?: string[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<IbadahGroup[]>([]);
  const [showManageGroupsForm, setShowManageGroupsForm] = useState(false);

  // Forms states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [nudgeWorshipName, setNudgeWorshipName] = useState('Ibadah');

  // Realtime load all joined groups of the user
  useEffect(() => {
    if (!userProfile.userId) return;

    const gIds = Array.from(new Set([
      ...(userProfile.joinedGroupIds || []),
      ...(userProfile.currentGroupId ? [userProfile.currentGroupId] : [])
    ].filter(Boolean) as string[]));

    if (gIds.length === 0) {
      setJoinedGroups([]);
      return;
    }

    const groupDataMap: { [id: string]: IbadahGroup } = {};

    const unsubs = gIds.map(id => {
      return onSnapshot(
        doc(db, 'groups', id),
        (docSnap) => {
          if (docSnap.exists()) {
            groupDataMap[id] = { id: docSnap.id, ...docSnap.data() } as IbadahGroup;
          } else {
            delete groupDataMap[id];
          }
          // Convert current map values to array so that component updates
          setJoinedGroups(Object.values(groupDataMap));
        },
        (err) => {
          console.error(`Group subscription error for ${id}:`, err);
        }
      );
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [userProfile.userId, userProfile.joinedGroupIds, userProfile.currentGroupId]);

  // Realtime load active group and leaderboard members
  useEffect(() => {
    if (!userProfile.userId) return;

    const gId = userProfile.currentGroupId;
    if (!gId) {
      setGroup(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to the active group document in real-time
    const unsubGroup = onSnapshot(
      doc(db, 'groups', gId),
      (gSnap) => {
        if (gSnap.exists()) {
          setGroup({ id: gSnap.id, ...gSnap.data() } as IbadahGroup);
        } else {
          setGroup(null);
          setMembers([]);
        }
      },
      (err) => {
        console.error("Group fetch error: ", err);
      }
    );

    // 2. Listen to members subcollection inside the active group in real-time
    const unsubMembers = onSnapshot(
      collection(db, 'groups', gId, 'members'),
      (memberSnap) => {
        const list = memberSnap.docs.map(mDoc => ({
          userId: mDoc.id,
          ...mDoc.data()
        })) as any[];
        setMembers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Members fetch error: ", err);
        setLoading(false);
      }
    );

    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [userProfile.userId, userProfile.currentGroupId]);

  // Sync current user's progress values into their GroupMember document whenever it changes
  useEffect(() => {
    if (!group || !userProfile.userId) return;

    // Calculate dynamic badges on current sync trigger
    const earnedBadges = calculateEarnedBadges(targets, activities);

    const meRef = doc(db, 'groups', group.id, 'members', userProfile.userId);
    setDoc(meRef, {
      name: userProfile.name,
      joinedAt: new Date().toISOString(),
      completionRate: completionRate,
      worshipSummary: worshipSummary,
      updatedAt: currentDate,
      badges: earnedBadges
    }, { merge: true }).catch(err => {
      console.warn("Silent synchronization warning:", err);
    });
  }, [group?.id, completionRate, worshipSummary, currentDate, userProfile.name, userProfile.userId, targets, activities]);

  // Generate unique 6 uppercase letter join codes
  const generateJoinCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSwitchGroup = async (gId: string) => {
    setActionLoading(true);
    try {
      await setDoc(doc(db, 'users', userProfile.userId), {
        currentGroupId: gId
      }, { merge: true });
    } catch (err) {
      console.error("Gagal mengganti grup aktif:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const gId = 'grup-' + Math.random().toString(36).substr(2, 9);
      const code = generateJoinCode();

      const newGroupData: IbadahGroup = {
        id: gId,
        name: newGroupName.trim(),
        code: code,
        description: newGroupDesc.trim() || 'Grup monitoring dan saling menyemangati ibadah.',
        createdBy: userProfile.userId,
        creatorName: userProfile.name,
        createdAt: new Date().toISOString()
      };

      // 1. Create group document
      await setDoc(doc(db, 'groups', gId), newGroupData);

      // 2. Add current user as member in subcollection
      await setDoc(doc(db, 'groups', gId, 'members', userProfile.userId), {
        userId: userProfile.userId,
        name: userProfile.name,
        joinedAt: new Date().toISOString(),
        completionRate: completionRate,
        worshipSummary: worshipSummary,
        updatedAt: currentDate
      });

      // 3. Update User profile currentGroupId and joinedGroupIds
      const updatedJoined = Array.from(new Set([
        ...(userProfile.joinedGroupIds || []),
        ...(userProfile.currentGroupId ? [userProfile.currentGroupId] : []),
        gId
      ]));

      await setDoc(doc(db, 'users', userProfile.userId), {
        currentGroupId: gId,
        joinedGroupIds: updatedJoined
      }, { merge: true });

      setNewGroupName('');
      setNewGroupDesc('');
      setShowManageGroupsForm(false);
      setSuccessMsg(`Grup "${newGroupData.name}" berhasil dibentuk!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal membentuk grup.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Find group by code code
      const q = query(collection(db, 'groups'), where('code', '==', joinCode.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error('Kode grup tidak ditemukan atau kedaluwarsa.');
      }

      const gDoc = snap.docs[0];
      const gId = gDoc.id;
      const gData = gDoc.data() as IbadahGroup;

      // Add to members subcollection
      await setDoc(doc(db, 'groups', gId, 'members', userProfile.userId), {
        userId: userProfile.userId,
        name: userProfile.name,
        joinedAt: new Date().toISOString(),
        completionRate: completionRate,
        worshipSummary: worshipSummary,
        updatedAt: currentDate
      });

      // Update current user profiles 
      const updatedJoined = Array.from(new Set([
        ...(userProfile.joinedGroupIds || []),
        ...(userProfile.currentGroupId ? [userProfile.currentGroupId] : []),
        gId
      ]));

      await setDoc(doc(db, 'users', userProfile.userId), {
        currentGroupId: gId,
        joinedGroupIds: updatedJoined
      }, { merge: true });

      setJoinCode('');
      setShowManageGroupsForm(false);
      setSuccessMsg(`Berhasil bergabung ke grup "${gData.name}"!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal bergabung ke grup.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = () => {
    if (!group) return;
    setShowLeaveConfirm(true);
  };

  const executeLeaveGroup = async () => {
    if (!group) return;
    setShowLeaveConfirm(false);

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Remove member doc
      await deleteDoc(doc(db, 'groups', group.id, 'members', userProfile.userId));

      // 2. Remove group.id from joinedGroupIds and select next available group
      const currentList = Array.from(new Set([
        ...(userProfile.joinedGroupIds || []),
        ...(userProfile.currentGroupId ? [userProfile.currentGroupId] : [])
      ]));
      const remainingGroupIds = currentList.filter(id => id !== group.id);
      const nextActiveGroupId = remainingGroupIds.length > 0 ? remainingGroupIds[0] : null;

      await setDoc(doc(db, 'users', userProfile.userId), {
        currentGroupId: nextActiveGroupId,
        joinedGroupIds: remainingGroupIds
      }, { merge: true });

      setGroup(null);
      setMembers([]);
      setSuccessMsg('Anda telah keluar dari grup.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal memproses keluar grup.');
    } finally {
      setActionLoading(false);
    }
  };

  const sendNudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !selectedRecipientId) return;

    setActionLoading(true);
    try {
      const recipient = members.find(m => m.userId === selectedRecipientId);
      if (!recipient) return;

      const nId = 'nudge-' + Math.random().toString(36).substr(2, 9);
      const nudgeData: WorshipNudge = {
        id: nId,
        groupId: group.id,
        groupName: group.name,
        senderId: userProfile.userId,
        senderName: userProfile.name,
        recipientId: selectedRecipientId,
        targetName: nudgeWorshipName || 'Ibadah',
        timestamp: new Date().toISOString(),
        isRead: false
      };

      await setDoc(doc(db, 'nudges', nId), nudgeData);
      setSuccessMsg(`Nudge pengingat berhasil dikirim ke ${recipient.name}!`);
      setSelectedRecipientId(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal mengirimkan cubitan (nudge) pengingat.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[250px]">
        <div className="w-10 h-10 border-4 border-emerald-500/25 border-t-emerald-500 animate-spin rounded-full mb-3" />
        <p className="text-xs font-semibold text-slate-500 animate-pulse">Menghubungkan jaringan grup ibadah...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative transition-all">
      {/* Messages */}
      {errorMsg && (
        <div className="mb-4 bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-medium border border-rose-100 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button className="text-rose-500 hover:text-rose-700" onClick={() => setErrorMsg(null)}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center justify-between">
          <span>{successMsg}</span>
          <button className="text-emerald-500 hover:text-emerald-700" onClick={() => setSuccessMsg(null)}>×</button>
        </div>
      )}

      {group ? (
        // ACTIVE GROUP SCREEN
        <div>
          {/* Group Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5 select-none font-sans">
            <div>
              <div className="flex flex-wrap items-center gap-2 px-0.5">
                <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                {joinedGroups.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={group.id}
                      onChange={(e) => handleSwitchGroup(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 cursor-pointer max-w-[200px] truncate"
                    >
                      {joinedGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <h3 className="text-lg font-bold font-display text-slate-900">{group.name}</h3>
                )}

                <button
                  type="button"
                  onClick={() => setShowManageGroupsForm(!showManageGroupsForm)}
                  className={`text-[11px] font-extrabold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer select-none ${
                    showManageGroupsForm 
                      ? 'bg-slate-200 text-slate-800 border-slate-300' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>{showManageGroupsForm ? 'Tutup Atur' : 'Atur / Ikut Grup Lain'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">{group.description}</p>
            </div>

            {/* Invite Controls & Leaving option */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 px-3 flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KODE</span>
                <span className="font-mono font-bold text-xs text-slate-800 tracking-wider font-sans">{group.code}</span>
                <button 
                  onClick={copyCode}
                  className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-emerald-600 transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                onClick={handleLeaveGroup}
                disabled={actionLoading}
                className="bg-rose-50 border border-rose-150 p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer font-sans"
                title="Keluar dari grup"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Inline Multi-Group Builder & Joining panel */}
          {showManageGroupsForm && (
            <div className="mb-6 p-5 bg-slate-50/50 rounded-2xl border border-slate-200/65 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Gabung atau Buat Kelompok Ibadah Baru
                </h4>
                <button 
                  type="button"
                  onClick={() => setShowManageGroupsForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold font-sans cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                {/* Create Group Form */}
                <div className="md:pr-6 border-b md:border-b-0 md:border-r border-slate-200/60 pb-6 md:pb-0">
                  <h5 className="text-[12px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    Buat Kelompok Baru
                  </h5>
                  <form onSubmit={handleCreateGroup} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Nama Kelompok Ibadah
                      </label>
                      <input
                        type="text"
                        required
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Contoh: Keluarga / Lingkungan Masjid / Pejuang Subuh"
                        className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Deskripsi / Aturan Kelompok
                      </label>
                      <textarea
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        rows={2}
                        placeholder="Menerapkan target harian bersama..."
                        className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      {actionLoading ? 'Membentuk Kelompok...' : 'Bentuk Kelompok Ibadah'}
                    </button>
                  </form>
                </div>

                {/* Join Group Form */}
                <div className="md:pl-2">
                  <h5 className="text-[12px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <UserPlus className="h-4 w-4 text-emerald-600" />
                    Gabung Kelompok Lain
                  </h5>
                  <form onSubmit={handleJoinGroup} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Masukkan Kode Unik Kelompok
                      </label>
                      <input
                        type="text"
                        required
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Contoh: AH5J8K"
                        className="w-full text-center font-mono font-bold tracking-widest bg-white border border-slate-200 rounded-lg p-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 uppercase text-slate-800"
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5 leading-normal">
                        Minta kode undangan 6 digit dari admin kelompok lain agar Anda dapat tergabung bersama.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
                    >
                      {actionLoading ? 'Menghubungkan...' : 'Gabung Kelompok'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Group Leaderboard & Member list */}
          <div className="space-y-4 select-none">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-amber-500" />
              Perkembangan Target Anggota Hari Ini ({currentDate})
            </h4>

            <div className="grid grid-cols-1 gap-3.5">
              {members
                .slice()
                .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0)) // high percentage wins
                .map((memb) => {
                  const isMe = memb.userId === userProfile.userId;
                  const rate = memb.completionRate || 0;
                  const summary = memb.worshipSummary || 'Belum mencatat aktivitas hari ini';

                  // Determine active color based on progress rate
                  let colorClass = 'bg-slate-200';
                  let textClass = 'text-slate-500';
                  let ringClass = 'border-slate-100';

                  if (rate > 0) {
                    if (rate < 50) {
                      colorClass = 'bg-amber-400';
                      textClass = 'text-amber-600 font-semibold';
                    } else if (rate < 80) {
                      colorClass = 'bg-emerald-400';
                      textClass = 'text-emerald-600 font-semibold';
                    } else {
                      colorClass = 'bg-emerald-600';
                      textClass = 'text-emerald-700 font-bold';
                      ringClass = 'ring-2 ring-emerald-500/20';
                    }
                  }

                  return (
                    <div 
                      key={memb.userId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                        isMe ? 'bg-emerald-50/20 border-emerald-100 shadow-xs' : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/70'
                      } ${ringClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center select-none text-slate-600 font-bold shrink-0 relative">
                          {memb.name ? memb.name.slice(0, 2).toUpperCase() : 'M'}
                          {rate >= 100 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 text-[8px]" title="Pencapaian Sempurna!">👑</span>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 select-none">
                            <span className="font-bold text-sm text-slate-800">{memb.name}</span>
                            {isMe && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Saya</span>
                            )}
                            {(!memb.badges || memb.badges.length === 0) && rate >= 100 && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Lunas</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <CornerDownRight className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{summary}</span>
                          </div>

                          {/* Real-time Achievement Badge system */}
                          {memb.badges && memb.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {memb.badges.map((bKey) => {
                                const bInfo = BADGE_DETAILS[bKey];
                                if (!bInfo) return null;
                                return (
                                  <div 
                                    key={bKey}
                                    className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md border shadow-xs transition-all hover:scale-105 select-none ${bInfo.bg} ${bInfo.color} ${bInfo.border}`}
                                    title={`${bInfo.label}: ${bInfo.description}`}
                                  >
                                    <span>{bInfo.icon}</span>
                                    <span>{bInfo.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Performance Bar & Interactive Nudge */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 w-full sm:w-auto">
                        {/* Progress Gauge */}
                        <div className="flex items-center gap-2 w-full sm:w-36">
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className={`h-full transition-all duration-500 ${colorClass}`}
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs w-11 text-right font-mono tracking-tighter ${textClass}`}>
                            {rate}%
                          </span>
                        </div>

                        {/* Interactive Nudge Reminder Button */}
                        {!isMe && (
                          <button
                            onClick={() => setSelectedRecipientId(memb.userId)}
                            className="text-xs font-semibold bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer focus:outline-none"
                          >
                            <BellRing className="h-3.5 w-3.5 text-emerald-500 animate-swing" />
                            <span>Ingatkan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Explanatory Milestone Badge Legend Panel at bottom */}
            <div className="mt-8 bg-slate-50/70 rounded-2xl p-5 border border-slate-100 select-none">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-emerald-600" />
                Daftar Panduan Lencana Capaian Mingguan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(BADGE_DETAILS).map(([key, bInfo]) => (
                  <div key={key} className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-start gap-3 shadow-2xs">
                    <div className="text-2xl shrink-0 p-1">{bInfo.icon}</div>
                    <div>
                      <h5 className="font-extrabold text-[11px] text-slate-800 leading-tight">{bInfo.label}</h5>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1.5 leading-snug">{bInfo.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        // EMPTY/NO GROUP SCREEN
        <div className="py-2">
          <div className="text-center max-w-sm mx-auto mb-8 select-none">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold font-display text-base text-slate-800">Komunitas & Syiar Ibadah</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bergabung denga sesama muslim untuk memonitor progress ibadah bersama harian, saling memotivasi dan mengingatkan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Group Form */}
            <div className="md:pr-8 border-b md:border-b-0 md:border-r border-slate-100 pb-8 md:pb-0">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Plus className="h-4.5 w-4.5 text-emerald-600" />
                Buat Grup Baru
              </h4>
              <form onSubmit={handleCreateGroup} className="space-y-3.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Grup Ibadah
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Contoh: Pejuang Shubuh / Keluarga Jundir"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Deskripsi / Aturan Grup
                  </label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Saling memantau Shalat 5 waktu dan tadarus minimal 1 halaman per hari."
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  {actionLoading ? 'Membentuk Grup...' : 'Bentuk Grup Ibadah'}
                </button>
              </form>
            </div>

            {/* Join Group Form */}
            <div className="md:pl-2">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                Gabung Grup yang Ada
              </h4>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Masukkan Kode Unik Grup
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Contoh: AH5J8K"
                    className="w-full text-center font-mono font-bold tracking-widest bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 uppercase text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Hubungi pembuat grup atau keluarga Anda untuk meminta kode undangan 6 digit.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 rounded-lg transition cursor-pointer"
                >
                  {actionLoading ? 'Menyambungkan...' : 'Gabung Grup'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sending Nudge Popup Modal */}
      {selectedRecipientId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl relative select-none">
            <h4 className="text-base font-bold font-display text-slate-900 flex items-center gap-2 mb-2">
              <BellRing className="text-emerald-500 h-5 w-5" />
              Kirim Cubitan (Nudge) Pengingat
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Kirimkan pengingat real-time kepada rekan satu kelompok untuk memotivasi ibadah harian mereka.
            </p>

            <form onSubmit={sendNudge} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mengingatkan untuk Ibadah Apa?
                </label>
                <select
                  value={nudgeWorshipName}
                  onChange={(e) => setNudgeWorshipName(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="Semua Target">Semua Target Terpasang</option>
                  <option value="Shalat 5 Waktu">Shalat 5 Waktu di Masjid</option>
                  <option value="Tilawah Al-Quran">Tilawah & Tadarus Al-Quran</option>
                  <option value="Dzikir Lengkap">Dzikir Pagi Petang</option>
                  <option value="Zakat & Sedekah">Sedekah Harian</option>
                  <option value="Shalat Sunnah">Shalat Sunnah Qobliyah/Ba'diyah</option>
                  <option value="Kebaikan Lain">Melakukan Kebaikan/Bakti Orang Tua</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecipientId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Kirim Pengingat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {group && (
        <ConfirmModal
          isOpen={showLeaveConfirm}
          title={`Keluar dari Grup ${group.name}`}
          message={`Apakah Anda yakin ingin keluar dari grup "${group.name}"?`}
          confirmText="Keluar Grup"
          cancelText="Batal"
          onConfirm={executeLeaveGroup}
          onCancel={() => setShowLeaveConfirm(false)}
          isDanger={true}
        />
      )}
    </div>
  );
}
