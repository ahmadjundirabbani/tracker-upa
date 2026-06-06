import React, { useState } from 'react';
import { WorshipTarget } from '../types';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, ShieldAlert, Sparkles, BookOpen, Clock, HeartHandshake } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface WorshipTargetsProps {
  userId: string;
  targets: WorshipTarget[];
  onActionStart: () => void;
  onActionComplete: () => void;
}

export default function WorshipTargets({ userId, targets, onActionStart, onActionComplete }: WorshipTargetsProps) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('kali');
  const [targetValue, setTargetValue] = useState(1);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<string | null>(null);

  const predefinedTargets = [
    { name: "🕌 Shalat 5 Waktu & Berjamaah", metric: "kali", targetValue: 5, frequency: "daily" as const },
    { name: "📖 Tilawah Al-Quran", metric: "halaman", targetValue: 2, frequency: "daily" as const },
    { name: "✨ Sedekah Subuh / Sedekah Harian", metric: "kali", targetValue: 1, frequency: "daily" as const },
    { name: "🌅 Dzikir Pagi Petang", metric: "kali", targetValue: 2, frequency: "daily" as const },
    { name: "🤲 Shalat Sunnah Ba'diyah & Qobliyah", metric: "rakaat", targetValue: 8, frequency: "daily" as const },
    { name: "🌌 Shalat Qiyamul Lail (Tahajjud)", metric: "rakaat", targetValue: 2, frequency: "daily" as const },
    { name: "☀️ Shalat Dhuha", metric: "rakaat", targetValue: 2, frequency: "daily" as const },
    { name: "📅 Puasa Sunnah (Senin Kamis/Ayyamul Bidh)", metric: "kali", targetValue: 1, frequency: "weekly" as const }
  ];

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onActionStart();
    setErrorMsg(null);

    try {
      const id = 'Target-' + Math.random().toString(36).substr(2, 9);
      const newTarget: WorshipTarget = {
        id: id,
        userId: userId,
        name: name.trim(),
        metric: metric.trim(),
        targetValue: Number(targetValue),
        frequency: frequency,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userId, 'targets', id), newTarget);
      
      setName('');
      setMetric('kali');
      setTargetValue(1);
      setFrequency('daily');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menambahkan target baru. Silakan periksa jaringan.');
    } finally {
      onActionComplete();
    }
  };

  const handleQuickAdd = async (predef: typeof predefinedTargets[0]) => {
    onActionStart();
    setErrorMsg(null);

    try {
      const id = 'Target-' + Math.random().toString(36).substr(2, 9);
      const newTarget: WorshipTarget = {
        id: id,
        userId: userId,
        name: predef.name,
        metric: predef.metric,
        targetValue: predef.targetValue,
        frequency: predef.frequency,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userId, 'targets', id), newTarget);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menambahkan target rekomendasi.');
    } finally {
      onActionComplete();
    }
  };

  const handleDeleteTarget = (targetId: string) => {
    setTargetToDelete(targetId);
  };

  const executeDeleteTarget = async () => {
    if (!targetToDelete) return;
    const targetId = targetToDelete;
    setTargetToDelete(null);

    onActionStart();
    try {
      await deleteDoc(doc(db, 'users', userId, 'targets', targetId));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menghapus target.');
    } finally {
      onActionComplete();
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all select-none">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
          <HeartHandshake className="h-5.5 w-5.5" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display text-slate-800">
            Daftar Target Ibadah Anda
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur target spiritual personal untuk melacak kemajuan harian Anda
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg flex items-start gap-2 text-xs font-semibold text-rose-700">
          <ShieldAlert className="h-4.5 w-4.5 text-rose-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Targets Configuration Form */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 p-5 rounded-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-emerald-500" />
            Atur Target Kustom
          </h4>

          <form onSubmit={handleAddTarget} className="space-y-4">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Kategori / Nama Ibadah
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Shalat Dhuha"
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 text-slate-850"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Jumlah Target
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Satuan / Metrik
                </label>
                <input
                  type="text"
                  required
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="halaman / kali"
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 text-slate-850"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Frekuensi Target
              </label>
              <div className="grid grid-cols-2 gap-2 bg-white border border-slate-200 p-0.5 rounded-lg select-none">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`text-[11px] font-bold py-1.5 rounded-md transition-all ${
                    frequency === 'daily' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Harian
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`text-[11px] font-bold py-1.5 rounded-md transition-all ${
                    frequency === 'weekly' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mingguan
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold text-xs py-2.5 rounded-xl text-white transition-all shadow-xs cursor-pointer"
            >
              Simpan Target Baru
            </button>
          </form>
        </div>

        {/* List of Active targets */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">
              Daftar Target Aktif Anda ({targets.length})
            </h4>

            {targets.length === 0 ? (
              <div className="bg-slate-50/50 rounded-xl p-8 border border-slate-100 text-center select-none">
                <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h5 className="font-bold text-slate-700 text-sm">Belum Ada Target</h5>
                <p className="text-slate-450 text-xs mt-1.5 max-w-sm mx-auto">
                  Tambahkan target manual lewat form kustom di sebelah kiri, atau pilih daftar rekomendasi di bawah ini untuk memulai dengan cepat.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {targets.map((tar) => (
                  <div 
                    key={tar.id}
                    className="p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-xs transition-all flex items-start justify-between gap-3 select-none"
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-800 line-clamp-1 block">{tar.name}</span>
                      <div className="flex items-center gap-2.5 mt-1 text-xs font-semibold">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10.5px]">
                          Target: {tar.targetValue} {tar.metric}
                        </span>
                        <span className="text-slate-450 tracking-wide font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {tar.frequency === 'daily' ? 'Harian' : 'Mingguan'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTarget(tar.id)}
                      className="text-slate-350 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Predefined / Recommended preset button panel */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              Rekomendasi Set Target Ibadah Populer
            </h4>
            <div className="flex flex-wrap gap-2.5 select-none">
              {predefinedTargets.map((predef, index) => {
                const alreadyExists = targets.some(
                  t => t.name.toLowerCase() === predef.name.toLowerCase() || t.name.toLowerCase().includes(predef.name.replace(/[^\w\s]/g, '').trim().toLowerCase())
                );

                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAdd(predef)}
                    disabled={alreadyExists}
                    className={`text-xs font-semibold px-3 py-2 rounded-xl transition border cursor-pointer select-none ${
                      alreadyExists 
                        ? 'bg-slate-100 border-slate-200/50 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700'
                    }`}
                  >
                    + {predef.name.split(' ').slice(1).join(' ')} ({predef.targetValue} {predef.metric})
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={targetToDelete !== null}
        title="Hapus Target Ibadah"
        message="Apakah Anda yakin ingin menghapus target ibadah ini? Semua riwayat lama target ini akan tetap tersimpan tetapi target tidak akan muncul di log harian lagi."
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={executeDeleteTarget}
        onCancel={() => setTargetToDelete(null)}
        isDanger={true}
      />
    </div>
  );
}
