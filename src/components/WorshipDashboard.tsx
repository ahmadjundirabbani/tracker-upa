import React, { useState } from 'react';
import { WorshipTarget, ActivityLog } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, 
  Minus, 
  Check, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Compass, 
  Award, 
  Smile, 
  BookOpen,
  X
} from 'lucide-react';

interface WorshipDashboardProps {
  userId: string;
  targets: WorshipTarget[];
  activities: ActivityLog[];
  currentDate: string;
  onDateChange: (newDate: string) => void;
  onActionStart: () => void;
  onActionComplete: () => void;
}

export default function WorshipDashboard({
  userId,
  targets,
  activities,
  currentDate,
  onDateChange,
  onActionStart,
  onActionComplete
}: WorshipDashboardProps) {

  const handleAdjustValue = async (target: WorshipTarget, delta: number) => {
    onActionStart();
    try {
      // Find existing log for today & target
      const existingLog = activities.find(a => a.targetId === target.id && a.date === currentDate);
      
      const currentVal = existingLog ? existingLog.value : 0;
      const targetVal = target.targetValue;
      let newVal = Math.max(0, currentVal + delta);
      
      const isCompleted = newVal >= targetVal;
      const activityId = `log-${target.id}-${currentDate}`;

      const logData: ActivityLog = {
        id: activityId,
        userId: userId,
        targetId: target.id,
        targetName: target.name,
        date: currentDate,
        value: newVal,
        targetValue: targetVal,
        metric: target.metric,
        completed: isCompleted,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userId, 'activities', activityId), logData);
    } catch (err) {
      console.error("Gagal memperbarui aktivitas:", err);
    } finally {
      onActionComplete();
    }
  };

  const handleSetExact = async (target: WorshipTarget, exactValue: number) => {
    onActionStart();
    try {
      const targetVal = target.targetValue;
      const isCompleted = exactValue >= targetVal;
      const activityId = `log-${target.id}-${currentDate}`;

      const logData: ActivityLog = {
        id: activityId,
        userId: userId,
        targetId: target.id,
        targetName: target.name,
        date: currentDate,
        value: exactValue,
        targetValue: targetVal,
        metric: target.metric,
        completed: isCompleted,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userId, 'activities', activityId), logData);
    } catch (err) {
      console.error(err);
    } finally {
      onActionComplete();
    }
  };

  // Move date offset helper
  const adjustDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const formattedDisplayDate = new Date(currentDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate dynamic stats for today
  const dailyStats = React.useMemo(() => {
    if (targets.length === 0) return { pct: 0, completedCount: 0, totalCount: 0 };
    
    let completedCount = 0;
    let totalPctRun = 0;

    targets.forEach((tar) => {
      const act = activities.find(a => a.targetId === tar.id && a.date === currentDate);
      const val = act ? act.value : 0;
      
      const ratio = tar.targetValue > 0 ? (val / tar.targetValue) : 0;
      totalPctRun += Math.min(ratio, 1); // Clamp at 100% per target node
      
      if (val >= tar.targetValue) {
        completedCount++;
      }
    });

    const averageRate = Math.round((totalPctRun / targets.length) * 100);

    return {
      pct: averageRate,
      completedCount,
      totalCount: targets.length
    };
  }, [targets, activities, currentDate]);

  return (
    <div className="space-y-6">
      
      {/* Date Navigator Header panel */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4 select-none">
        <button
          onClick={() => adjustDate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 cursor-pointer"
          title="Hari sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
          <div className="text-center">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 font-display leading-tight">{formattedDisplayDate}</h3>
            {currentDate === new Date().toISOString().slice(0, 10) ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">HARI INI</span>
            ) : (
              <button 
                onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}
                className="text-[9.5px] text-emerald-600 hover:underline font-bold"
              >
                Kembali ke Hari Ini
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => adjustDate(1)}
          className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 cursor-pointer"
          title="Hari berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Aggregate Widgets for selected Day */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 select-none">
        
        {/* Progress gauge card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rasio Kepatuhan</span>
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-800 font-display tracking-tight">{dailyStats.pct}%</span>
            <span className="text-xs font-semibold text-slate-400">target tercapai</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
            <div 
              className="bg-emerald-600 h-full transition-all duration-500"
              style={{ width: `${dailyStats.pct}%` }}
            />
          </div>
        </div>

        {/* Counter cards */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ibadah Terpenuhi</span>
            <Award className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-black text-slate-800 font-display tracking-tight">
              {dailyStats.completedCount}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-2">dari {dailyStats.totalCount} target aktif</span>
          </div>
          <p className="text-[10.5px] text-slate-500 leading-snug">
            Selesaikan minimal 80% dari target hari ini untuk mempertahankan konsistensi!
          </p>
        </div>

        {/* Dynamic Spiritual Wisdom quotes */}
        <div className="bg-emerald-600 text-emerald-50 p-5 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            <Compass className="h-4 w-4 shrink-0" />
            <span>Hikmah Mutaba'ah</span>
          </div>
          <p className="my-2.5 text-xs font-medium italic leading-relaxed text-emerald-100">
            "Amalan yang paling dicintai oleh Allah adalah amalan yang berkelanjutan (istiqamah) meskipun sedikit."
          </p>
          <span className="text-[9px] font-bold text-emerald-300">Hadits Riwayat Al-Bukhari</span>
        </div>
      </div>

      {/* Primary Log Tracker Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5 select-none">
          Laporkan Pelaksanaan Ibadah ({currentDate})
        </h4>

        {targets.length === 0 ? (
          <div className="py-10 text-center select-none">
            <Smile className="h-10 w-10 text-slate-350 mx-auto mb-2.5" />
            <h5 className="font-bold text-slate-700 text-sm">Mari Pasang Target Pertama Anda!</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Silakan navigasi ke tab <strong>"Pengaturan Target"</strong> untuk mengaktifkan target ibadah yang ingin Anda lacak harian.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((tar) => {
              const logDoc = activities.find(a => a.targetId === tar.id && a.date === currentDate);
              const loggedValue = logDoc ? logDoc.value : 0;
              const isDone = loggedValue >= tar.targetValue;

              // Calculate scale of progress
              const pctAchieved = tar.targetValue > 0 ? Math.round((loggedValue / tar.targetValue) * 100) : 0;

              return (
                <div 
                  key={tar.id}
                  className={`border rounded-xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDone 
                      ? 'bg-emerald-50/15 border-emerald-155' 
                      : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Left segment - Target info & indicators */}
                  <div className="flex-1 select-none">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 rounded-full p-1.5 shrink-0 transition-all ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        <Check className={`h-4 w-4 ${isDone ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 leading-tight block">{tar.name}</span>
                          {isDone && (
                            <span className="text-[8.5px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">LUNAS</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                          <span>Target: {tar.targetValue} {tar.metric}</span>
                          <span>•</span>
                          <span className="text-emerald-600">{pctAchieved}% Tercapai</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right segment - Counter actions */}
                  <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 select-none">
                    
                    {/* Visual Progress Number bubble */}
                    <div className="text-right sm:mr-3">
                      <span className="text-slate-500 text-xs font-semibold mr-1">Tercatat:</span>
                      <span className="font-mono text-sm font-black text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-250/20">
                        {loggedValue}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5">{tar.metric}</span>
                    </div>

                    {/* Plus & Minus Adjustment handlers */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustValue(tar, -1)}
                        disabled={loggedValue <= 0}
                        className="p-2 border border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 rounded-lg transition-all shadow-xs cursor-pointer focus:outline-none"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      {/* Immediate Check-all target shortcut button */}
                      <button
                        onClick={() => handleSetExact(tar, isDone ? 0 : tar.targetValue)}
                        className={`text-xs px-3 py-2 border rounded-lg transition-all cursor-pointer font-bold select-none focus:outline-none ${
                          isDone 
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {isDone ? 'Set Nol' : `Selesai (${tar.targetValue})`}
                      </button>

                      <button
                        onClick={() => handleAdjustValue(tar, 1)}
                        className="p-2 border border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50 text-slate-600 rounded-lg transition-all shadow-xs cursor-pointer focus:outline-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
