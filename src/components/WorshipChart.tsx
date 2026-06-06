import React, { useState, useMemo } from 'react';
import { ActivityLog, WorshipTarget } from '../types';
import { Calendar, Layers, TrendingUp, CheckCircle, Award } from 'lucide-react';

interface WorshipChartProps {
  activities: ActivityLog[];
  targets: WorshipTarget[];
}

export default function WorshipChart({ activities, targets }: WorshipChartProps) {
  const [range, setRange] = useState<'7days' | '30days'>('7days');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group activity values by date
  const processedData = useMemo(() => {
    const daysToTake = range === '7days' ? 7 : 30;
    const result: { date: string; displayDate: string; completionRate: number; logs: ActivityLog[] }[] = [];

    for (let i = daysToTake - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      // Find logs for this specific date
      const daysLogs = activities.filter(act => act.date === dateStr);

      let filteredLogs = daysLogs;
      if (selectedTargetId !== 'all') {
        filteredLogs = daysLogs.filter(act => act.targetId === selectedTargetId);
      }

      // Calculate aggregate completion rate
      let rate = 0;
      if (filteredLogs.length > 0) {
        const totalPct = filteredLogs.reduce((acc, log) => {
          const ratio = log.targetValue > 0 ? (log.value / log.targetValue) : 0;
          return acc + Math.min(ratio, 1); // Cap at 100% per target
        }, 0);
        rate = Math.round((totalPct / filteredLogs.length) * 100);
      } else {
        // If there are no logs but user has targets, rate is 0%. If they have no targets, mock 0
        rate = 0;
      }

      result.push({
        date: dateStr,
        displayDate: formattedDate,
        completionRate: rate,
        logs: filteredLogs
      });
    }

    return result;
  }, [activities, range, selectedTargetId, targets]);

  // Overall statistics
  const stats = useMemo(() => {
    if (processedData.length === 0) return { avg: 0, streak: 0, totalCompleted: 0 };
    const totalRate = processedData.reduce((acc, item) => acc + item.completionRate, 0);
    const avg = Math.round(totalRate / processedData.length);

    // Calculate current running streak
    let streak = 0;
    // Iterate from today (last element) backwards
    for (let i = processedData.length - 1; i >= 0; i--) {
      if (processedData[i].completionRate >= 80) {
        streak++;
      } else if (i < processedData.length - 1) {
        // Streak broken (allow ignoring today if they still have hours to log)
        break;
      }
    }

    // Total tasks fully logged and completed
    const totalCompleted = activities.filter(act => act.completed).length;

    return { avg, streak, totalCompleted };
  }, [processedData, activities]);

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingX = 50;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate coordinates for the line chart
  const points = useMemo(() => {
    if (processedData.length <= 1) return [];

    return processedData.map((item, index) => {
      const x = paddingX + (index / (processedData.length - 1)) * chartWidth;
      // Invert Y because SVG coordinates starts from top-left
      const y = paddingY + chartHeight - (item.completionRate / 100) * chartHeight;
      return { x, y, rate: item.completionRate, date: item.displayDate };
    });
  }, [processedData, chartWidth, chartHeight]);

  // SVG Line path definition string
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  // SVG Gradient fill path string
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    return `${linePath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`;
  }, [points, linePath, chartHeight]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Grafik Histori Perkembangan Ibadah
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Memonitor persentase pencapaian target harian Anda secara visual
          </p>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Selector */}
          <select
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200.5 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Semua Ibadah</option>
            {targets.map(tar => (
              <option key={tar.id} value={tar.id}>{tar.name}</option>
            ))}
          </select>

          {/* Range Selector */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setRange('7days')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                range === '7days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setRange('30days')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                range === '30days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>
      </div>

      {/* Grid Quick Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/30 flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Rerata Capaian</span>
            <span className="text-xl font-bold text-slate-800 font-display">{stats.avg}%</span>
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/30 flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Konsistensi Beruntun</span>
            <span className="text-xl font-bold text-slate-800 font-display">{stats.streak} Hari</span>
          </div>
        </div>

        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/30 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Terpenuhi</span>
            <span className="text-xl font-bold text-slate-800 font-display">{stats.totalCompleted} Kali</span>
          </div>
        </div>
      </div>

      {/* SVG Container wrapping */}
      <div className="relative bg-slate-50 border border-slate-100 p-3 rounded-xl overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full min-w-[500px] h-auto select-none overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = paddingY + chartHeight - (level / 100) * chartHeight;
            return (
              <g key={level} className="opacity-40">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Area under the path */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#chartGradient)"
            />
          )}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#strokeGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover indicator line vertical */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingY}
              x2={points[hoveredIndex].x}
              y2={paddingY + chartHeight}
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              className="opacity-75"
            />
          )}

          {/* Nodes */}
          {points.map((p, index) => {
            const isHovered = hoveredIndex === index;
            const is7Days = range === '7days';

            // Scale down nodes density on 30days view unless hovered
            if (!is7Days && index % 3 !== 0 && !isHovered && index !== points.length - 1) {
              return null;
            }

            return (
              <circle
                key={index}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6.5 : 4}
                fill={isHovered ? '#047857' : '#10b981'}
                stroke="white"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="cursor-pointer transition-all duration-150 shadow-sm"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Bottom Labels x-axis */}
          {processedData.map((item, index) => {
            const x = paddingX + (index / (processedData.length - 1)) * chartWidth;
            const is7Days = range === '7days';

            // Filter columns to avoid clutter on 30days view
            if (!is7Days && index % 5 !== 0 && index !== processedData.length - 1) {
              return null;
            }

            return (
              <text
                key={index}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 font-medium text-[9.5px] font-display"
              >
                {item.displayDate}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredIndex !== null && processedData[hoveredIndex] && (
          <div 
            className="absolute bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700/50 shadow-md pointer-events-none select-none text-xs transition-opacity duration-150"
            style={{
              left: `${Math.min(
                Math.max((hoveredIndex / (processedData.length - 1)) * 100 - 10, 5),
                80
              )}%`,
              top: '5px',
            }}
          >
            <p className="font-bold text-slate-300 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              {processedData[hoveredIndex].displayDate}
            </p>
            <p className="text-sm font-extrabold text-emerald-400 mt-1">
              Capaian: {processedData[hoveredIndex].completionRate}%
            </p>

            <div className="border-t border-slate-700/50 my-1 pb-1"></div>
            {processedData[hoveredIndex].logs.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">Belum ada riwayat tercatat</p>
            ) : (
              <div className="space-y-1">
                {processedData[hoveredIndex].logs.map((log, lidx) => (
                  <p key={lidx} className="text-[10.5px] text-slate-200">
                    <span className="font-semibold text-slate-300">{log.targetName}: </span>
                    {log.value}/{log.targetValue} {log.metric}
                    <span className={`inline-block w-2 h-2 rounded-full ml-1.5 ${log.completed ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-slate-400 border-t border-slate-100 pt-4 select-none">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> Ibadah Terpanjat</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-200 rounded-full inline-block"></span> Belum Tercapai</span>
        <span className="text-slate-500 border-l border-slate-100 pl-4">Indikator konsistensi dihitung beruntun jika pencapaian &ge; 80% per hari</span>
      </div>
    </div>
  );
}
