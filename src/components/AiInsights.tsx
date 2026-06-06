import React, { useState } from 'react';
import { ActivityLog, WorshipTarget } from '../types';
import { Sparkles, Brain, AlertTriangle } from 'lucide-react';

interface AiInsightsProps {
  activities: ActivityLog[];
  targets: WorshipTarget[];
  userName: string;
}

export default function AiInsights({ activities, targets, userName }: AiInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const loadingPhrases = [
    "Menghubungi Penasihat Ibadah AI...",
    "Menganalisis tingkat konsistensi Shalat & Tilawah...",
    "Memetakan grafik ibadah dengan ketenangan spiritual...",
    "Merumuskan rencana aksi ibadah yang realistis untuk Anda...",
    "Mempersiapkan wejangan rohani yang hangat..."
  ];

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);
    setLoadingPhraseIndex(0);

    // Dynamic phrase rotator to improve UX during cold starts
    const phraseInterval = setInterval(() => {
      setLoadingPhraseIndex(prev => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      // Format data to keep the payload clean
      const serializedTargets = targets.map(t => ({
        name: t.name,
        targetValue: t.targetValue,
        metric: t.metric,
        frequency: t.frequency
      }));

      // Take last 14 logs to avoid bloating token sizes
      const sortedActivities = [...activities]
        .sort((a,b) => b.date.localeCompare(a.date))
        .slice(0, 15)
        .map(a => ({
          date: a.date,
          targetName: a.targetName,
          value: a.value,
          targetValue: a.targetValue,
          metric: a.metric,
          completed: a.completed
        }));

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: userName,
          targets: serializedTargets,
          activities: sortedActivities
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal memperoleh insight.");
      }

      const data = await res.json();
      setInsights(data.insights);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Koneksi ke asisten AI terputus. Pastikan kunci GEMINI_API_KEY telah diatur.");
    } finally {
      clearInterval(phraseInterval);
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl p-6 relative overflow-hidden transition-all">
      {/* Visual background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative">
        <div className="flex items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Fitur Pintar</span>
              <h3 className="text-xl font-bold font-display text-white">Insight Progress AI</h3>
            </div>
          </div>
          
          {!loading && insights && (
            <button
              onClick={fetchInsights}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg className="h-4 w-4 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.582M21 12a9 9 0 11-18 0" />
              </svg>
              Segarkan Analisis
            </button>
          )}
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          Analisis ritual ibadah harian Anda secara holistik dengan kecerdasan AI. Peroleh evaluasi spiritual berkala, pelajari metrik ritme konsistensi, dan dapatkan saran hidayah yang menyentuh jiwa.
        </p>

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-300">Gagal Memulai Konsultasi AI</h4>
              <p className="text-xs text-red-200/90 mt-1">{error}</p>
              <button 
                onClick={fetchInsights}
                className="mt-3 bg-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
              >
                Coba Hubungkan Kembali
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-slate-800/60 border border-slate-800/80 rounded-xl p-8 py-12 flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute w-14 h-14 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="w-14 h-14 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
              <Brain className="h-6 w-6 text-emerald-400 absolute" />
            </div>
            <p className="font-semibold text-white font-display text-sm">
              {loadingPhrases[loadingPhraseIndex]}
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-xs">
              Mengevaluasi {activities.length} aktivitas terdaftar Anda. Kunci rahasia API diproses secara privat dan aman.
            </p>
          </div>
        ) : insights ? (
          <div className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-5 md:p-6 text-slate-100 text-sm leading-relaxed max-h-[380px] overflow-y-auto custom-scrollbar">
            {/* Rich Text Representation parsed loosely in beautiful styles */}
            <div className="prose prose-invert prose-emerald text-slate-300 prose-sm max-w-none">
              {insights.split('\n').map((line, idx) => {
                // Formatting bullet headings like "1. Name:" or "**Name**"
                if (line.startsWith('###')) {
                  return <h4 key={idx} className="font-bold font-display text-base text-emerald-400 mt-4 mb-2">{line.replace('###', '').trim()}</h4>;
                }
                if (line.startsWith('##')) {
                  return <h3 key={idx} className="font-bold font-display text-lg text-white border-b border-emerald-500/20 pb-1 mt-5 mb-3">{line.replace('##', '').trim()}</h3>;
                }
                if (line.startsWith('#')) {
                  return <h2 key={idx} className="font-extrabold font-display text-xl text-white mt-5 mb-3">{line.replace('#', '').trim()}</h2>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={idx} className="font-bold text-white mt-3 text-sm">{line.replace(/\*\*/g, '').trim()}</p>;
                }

                // Detect bold segments inline softly
                let content: React.ReactNode = line;
                if (line.includes('**')) {
                  const parts = line.split('**');
                  content = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part);
                }

                return (
                  <p key={idx} className="mb-2.5 text-xs md:text-sm text-slate-300">
                    {content}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-800/50 rounded-xl p-8 py-10 text-center">
            <Brain className="h-10 w-10 text-emerald-500/80 mx-auto mb-3" />
            <h4 className="text-white font-bold font-display text-base">Rancang Insight Ibadah Anda</h4>
            <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
              Asisten AI akan mendiagnosis konsistensi aktivitas Anda dalam 2 pekan terakhir dan menjabarkan tuntunan kualitatif personal.
            </p>
            <button
              onClick={fetchInsights}
              disabled={targets.length === 0}
              className="mt-5 inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              Mulai Konsultasi Progress
            </button>
            {targets.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-2 font-medium">⚠️ Silakan buat minimal 1 target ibadah harian terlebih dahulu.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
