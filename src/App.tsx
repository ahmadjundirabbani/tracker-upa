import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, WorshipTarget, ActivityLog, WorshipNudge } from './types';

// Components
import AuthScreen from './components/AuthScreen';
import WorshipDashboard from './components/WorshipDashboard';
import WorshipChart from './components/WorshipChart';
import AiInsights from './components/AiInsights';
import WorshipGroups from './components/WorshipGroups';
import WorshipTargets from './components/WorshipTargets';
import ConfirmModal from './components/ConfirmModal';

// Icons
import { 
  BookOpen, 
  Users, 
  HeartHandshake, 
  TrendingUp, 
  Sparkles, 
  BellRing, 
  LogOut, 
  RefreshCw,
  LayoutDashboard,
  Bell,
  CheckCircle,
  X
} from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<WorshipTarget[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [incomingNudges, setIncomingNudges] = useState<WorshipNudge[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'group' | 'targets' | 'ai-insights'>('dashboard');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  
  // Loading & Action states
  const [authLoading, setAuthLoading] = useState(true);
  const [dbSyncing, setDbSyncing] = useState(false);

  // Trigger loading animations
  const startAction = () => setDbSyncing(true);
  const finishAction = () => setDbSyncing(false);

  // 1. Firebase Authentication Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setAuthLoading(true);
      if (u) {
        setFirebaseUser(u);
        
        // Listen to User Profile changes
        const unsubProfile = onSnapshot(
          doc(db, 'users', u.uid),
          async (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            } else {
              // Safe fallback profile bootstrap
              const initialProfile: UserProfile = {
                userId: u.uid,
                name: u.displayName || 'Hamba Allah',
                email: u.email || '',
                joinedAt: new Date().toISOString(),
                currentGroupId: null
              };
              try {
                await setDoc(doc(db, 'users', u.uid), initialProfile, { merge: true });
                setUserProfile(initialProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
              }
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
          }
        );

        setAuthLoading(false);
        return () => unsubProfile();
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setTargets([]);
        setActivities([]);
        setIncomingNudges([]);
        setAuthLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Real-time Worship Targets, Activities & Nudges snapshot subscriptions
  useEffect(() => {
    if (!firebaseUser) return;

    const uid = firebaseUser.uid;
    startAction();

    // Query Targets
    const unsubTargets = onSnapshot(
      collection(db, 'users', uid, 'targets'),
      (snap) => {
        const list = snap.docs.map(d => d.data() as WorshipTarget);
        setTargets(list);
        finishAction();
      },
      (err) => {
        finishAction();
        handleFirestoreError(err, OperationType.GET, `users/${uid}/targets`);
      }
    );

    // Query Activities
    const unsubActivities = onSnapshot(
      collection(db, 'users', uid, 'activities'),
      (snap) => {
        const list = snap.docs.map(d => d.data() as ActivityLog);
        setActivities(list);
        finishAction();
      },
      (err) => {
        finishAction();
        handleFirestoreError(err, OperationType.GET, `users/${uid}/activities`);
      }
    );

    // Query Nudges (only unread notifications meant for this user)
    const unsubNudges = onSnapshot(
      query(collection(db, 'nudges'), where('recipientId', '==', uid), where('isRead', '==', false)),
      (snap) => {
        const list = snap.docs.map(d => d.data() as WorshipNudge);
        setIncomingNudges(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `nudges`);
      }
    );

    return () => {
      unsubTargets();
      unsubActivities();
      unsubNudges();
    };
  }, [firebaseUser]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut(auth);
  };

  // Helper calculation for today's aggregate rate 
  const aggregateMetrics = React.useMemo(() => {
    if (targets.length === 0) return { pct: 0, summary: 'Belum ada target' };

    let totalPctRun = 0;
    let completedCount = 0;

    targets.forEach((tar) => {
      const act = activities.find(a => a.targetId === tar.id && a.date === currentDate);
      const val = act ? act.value : 0;
      const ratio = tar.targetValue > 0 ? (val / tar.targetValue) : 0;
      
      totalPctRun += Math.min(ratio, 1);
      if (val >= tar.targetValue) {
        completedCount++;
      }
    });

    const pct = Math.round((totalPctRun / targets.length) * 100);
    const summary = `${completedCount}/${targets.length} Ibadah Selesai`;

    return { pct, summary };
  }, [targets, activities, currentDate]);

  const handleDismissNudge = async (nudgeId: string) => {
    try {
      // Mark as read in Firestore to dim the notifications synchronously across devices
      await setDoc(doc(db, 'nudges', nudgeId), { isRead: true }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-100 mb-4">
          <BookOpen className="h-8 w-8 text-white animate-pulse" />
        </div>
        <h3 className="text-lg font-bold font-display text-slate-800 animate-pulse">Memuat SakinahTrack...</h3>
        <p className="text-xs text-slate-400 mt-1">Mengambil autentikasi & sinkronisasi awan...</p>
      </div>
    );
  }

  // Not logged in gate
  if (!firebaseUser || !userProfile) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/75 text-slate-900 pb-16">
      
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logotype */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight font-display text-slate-900 block leading-tight">
                  SakinahTrack ✨
                </span>
                <span className="text-[9.5px] text-emerald-600 font-semibold uppercase tracking-wider block">MUTABA'AH DIGITAL</span>
              </div>
            </div>

            {/* Syncing loader and Account Controls */}
            <div className="flex items-center gap-4">
              {dbSyncing && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
                  <span className="hidden sm:inline">Sinkronisasi Realtime...</span>
                </div>
              )}

              {/* Greeting */}
              <div className="text-right hidden md:block">
                <span className="text-xs text-slate-405 font-medium block">Assalamualaikum,</span>
                <span className="text-xs font-bold text-slate-800 font-display block">{userProfile.name}</span>
              </div>

              {/* Alert Sign notifications bell */}
              <div className="relative">
                <button 
                  onClick={() => { setActiveTab('group'); }}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition relative cursor-pointer"
                  title="Notifikasi Pengingat"
                >
                  <Bell className="h-5 w-5" />
                  {incomingNudges.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none animate-bounce">
                      {incomingNudges.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 border border-slate-150 rounded-xl text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Keluar"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Real-time Toast Alerts for Incoming Nudges (Group Reminders) */}
      {incomingNudges.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 select-none">
          <div className="space-y-2">
            {incomingNudges.map((nudge) => (
              <div 
                key={nudge.id}
                className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 animate-slide-in"
              >
                <div className="flex items-start gap-3">
                  <BellRing className="h-6 w-6 text-emerald-200 shrink-0 mt-0.5 animate-swing" />
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">🔔 Cubitan Pengingat dari Kelompok!</h4>
                    <p className="text-xs text-emerald-100 mt-1 font-medium">
                      <strong className="text-white font-extrabold">{nudge.senderName}</strong> mengingatkan Anda untuk melakukan <strong>{nudge.targetName}</strong> di dalam grup <span className="underline font-bold">{nudge.groupName}</span>. Mari selesaikan target ibadah hari ini!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleDismissNudge(nudge.id)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer border border-emerald-500/50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Baik, Siap!</span>
                  </button>
                  <button
                    onClick={() => handleDismissNudge(nudge.id)}
                    className="p-2 text-emerald-250 hover:text-white transition"
                    title="Abaikan"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Sub-Navigation Tab selector */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 select-none">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex overflow-x-auto whitespace-nowrap gap-1 md:flex-row shadow-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 min-w-[120px] shrink-0 py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Tracker Harian
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[120px] shrink-0 py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Grafika Histori
          </button>

          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`flex-1 min-w-[120px] shrink-0 py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai-insights'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            Analisis AI report
          </button>

          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 min-w-[120px] shrink-0 py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Grup Kelompok
          </button>

          <button
            onClick={() => setActiveTab('targets')}
            className={`flex-1 min-w-[120px] shrink-0 py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide font-display flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'targets'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/10'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="h-4 w-4" />
            Atur Target
          </button>
        </div>
      </nav>

      {/* Main Content Area router */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {activeTab === 'dashboard' && (
          <WorshipDashboard
            userId={firebaseUser.uid}
            targets={targets}
            activities={activities}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onActionStart={startAction}
            onActionComplete={finishAction}
          />
        )}

        {activeTab === 'history' && (
          <WorshipChart
            activities={activities}
            targets={targets}
          />
        )}

        {activeTab === 'ai-insights' && (
          <AiInsights
            activities={activities}
            targets={targets}
            userName={userProfile.name}
          />
        )}

        {activeTab === 'group' && (
          <WorshipGroups
            userProfile={userProfile}
            currentDate={currentDate}
            completionRate={aggregateMetrics.pct}
            worshipSummary={aggregateMetrics.summary}
            activities={activities}
            targets={targets}
          />
        )}

        {activeTab === 'targets' && (
          <WorshipTargets
            userId={firebaseUser.uid}
            targets={targets}
            onActionStart={startAction}
            onActionComplete={finishAction}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Keluar dari SakinahTrack"
        message="Apakah Anda yakin ingin keluar dari SakinahTrack?"
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDanger={true}
      />

    </div>
  );
}
