
import React, { useMemo, useState } from 'react';
import { User, Lesson, Task, TestResult, TaskResult } from '../types';

interface AnalyticsViewProps {
  users: User[];
  lessons: Lesson[];
  tasks: Task[];
  lessonResults: Record<string, Record<string, TestResult>>;
  taskResults: Record<string, Record<string, TaskResult>>;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ users, lessons, tasks, lessonResults, taskResults }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');

  const listeners = useMemo(() => users.filter(u => u.role === 'listener'), [users]);
  const departments = useMemo(() => Array.from(new Set(listeners.map(u => u.department).filter(Boolean))).sort(), [listeners]);
  const streams = useMemo(() => Array.from(new Set(listeners.map(u => u.stream).filter(Boolean))).sort(), [listeners]);

  const getUserStats = (userId: string) => {
    const userLessonRes = lessonResults[userId] || {};
    const userTaskRes = taskResults[userId] || {};
    
    const lessonsWithTests = lessons.filter(l => (l.questions || []).length > 0);
    const totalPossibleItems = lessonsWithTests.length + tasks.length;
    
    let totalScore = 0;
    let completedItems = 0;

    lessonsWithTests.forEach(l => {
      const res = userLessonRes[l.id];
      if (res) {
        totalScore += res.percentage;
        completedItems++;
      }
    });

    tasks.forEach(t => {
      const res = userTaskRes[t.id];
      if (res && res.reviews && res.reviews.length > 0) {
        const sumGrades = res.reviews.reduce((acc, curr) => acc + curr.grade, 0);
        const avgPercentage = (sumGrades / res.reviews.length) * 20;
        totalScore += avgPercentage;
        completedItems++;
      }
    });

    // Средний балл по всем материалам (тесты + задания), невыполненные = 0%
    const average = totalPossibleItems > 0 ? Math.round(totalScore / totalPossibleItems) : 0;
    return {
      average,
      completionRate: totalPossibleItems > 0 ? Math.round((completedItems / totalPossibleItems) * 100) : 0,
      completedCount: completedItems,
      totalCount: totalPossibleItems
    };
  };

  const filteredListeners = useMemo(() => {
    return listeners.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'all' || u.department === deptFilter;
      const matchesStream = streamFilter === 'all' || u.stream === streamFilter;
      return matchesSearch && matchesDept && matchesStream;
    });
  }, [listeners, searchQuery, deptFilter, streamFilter]);

  const topUsers = useMemo(() => {
    return filteredListeners
      .map(u => ({ ...u, stats: getUserStats(u.id) }))
      .sort((a, b) => b.stats.average - a.stats.average || b.stats.completionRate - a.stats.completionRate)
      .slice(0, 10);
  }, [filteredListeners]);

  const deptStats = useMemo(() => {
    const stats: Record<string, { totalAvg: number, totalCompletion: number, userCount: number }> = {};
    listeners.forEach(u => {
      const dept = u.department || 'Не указана';
      if (!stats[dept]) stats[dept] = { totalAvg: 0, totalCompletion: 0, userCount: 0 };
      const s = getUserStats(u.id);
      stats[dept].totalAvg += s.average;
      stats[dept].totalCompletion += s.completionRate;
      stats[dept].userCount++;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        average: Math.round(data.totalAvg / data.userCount),
        completion: Math.round(data.totalCompletion / data.userCount),
        userCount: data.userCount
      }))
      .sort((a, b) => b.average - a.average);
  }, [listeners, lessons, tasks, lessonResults, taskResults]);

  const streamStats = useMemo(() => {
    const stats: Record<string, { totalAvg: number, totalCompletion: number, userCount: number }> = {};
    listeners.forEach(u => {
      const stream = u.stream || 'Не указан';
      if (!stats[stream]) stats[stream] = { totalAvg: 0, totalCompletion: 0, userCount: 0 };
      const s = getUserStats(u.id);
      stats[stream].totalAvg += s.average;
      stats[stream].totalCompletion += s.completionRate;
      stats[stream].userCount++;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        average: Math.round(data.totalAvg / data.userCount),
        completion: Math.round(data.totalCompletion / data.userCount),
        userCount: data.userCount
      }))
      .sort((a, b) => b.average - a.average);
  }, [listeners, lessons, tasks, lessonResults, taskResults]);

  const globalStats = useMemo(() => {
    if (listeners.length === 0) return { avgScore: 0, avgCompletion: 0 };
    const totals = listeners.reduce((acc, u) => {
      const s = getUserStats(u.id);
      return { score: acc.score + s.average, completion: acc.completion + s.completionRate };
    }, { score: 0, completion: 0 });
    return {
      avgScore: Math.round(totals.score / listeners.length),
      avgCompletion: Math.round(totals.completion / listeners.length)
    };
  }, [listeners, lessons, tasks, lessonResults, taskResults]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 px-1 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Аналитика</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Обзор успеваемости в разрезе подразделений</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Слушатели</p>
          <p className="text-xl sm:text-3xl font-black text-[#10408A]">{listeners.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Ср. балл</p>
          <p className="text-xl sm:text-3xl font-black text-emerald-600">{globalStats.avgScore}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Завершение</p>
          <p className="text-xl sm:text-3xl font-black text-[#10408A]">{globalStats.avgCompletion}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Кафедры</p>
          <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{departments.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4">
        <div className="relative w-full md:flex-1">
          <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 rounded-xl sm:rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-[#10408A] outline-none transition-all font-medium text-sm" />
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-600 border-none">
            <option value="all">Кафедры</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-600 border-none">
            <option value="all">Потоки</option>
            {streams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center text-sm">★</span>
            Топ преподавателей
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-600">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[8px] sm:text-[10px] font-black shrink-0 ${i < 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-300'}`}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{u.name}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-300 font-bold uppercase truncate">{u.department}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm sm:text-lg font-black text-[#10408A] dark:text-[#6ba3f5]">{u.stats.average}%</p>
                  <p className="text-[7px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tight">Прогресс: {u.stats.completionRate}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center text-sm">🏢</span>
            Рейтинг кафедр
          </h3>
          <div className="space-y-4 sm:space-y-6">
            {deptStats.slice(0, 8).map((dept) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{dept.name}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-300 font-bold uppercase">{dept.userCount} чел.</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-lg font-black text-[#10408A]">{dept.average}%</span>
                  </div>
                </div>
<div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-[#10408A]" style={{ width: `${dept.average}%` }}></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-sm">≋</span>
          Активность по потокам
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {streamStats.map(stream => {
            const radius = 30;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (stream.average / 100) * circumference;
            
            return (
              <div key={stream.name} className="p-4 sm:p-8 bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-[24px] sm:rounded-[32px] text-center space-y-3 sm:space-y-5 shadow-sm">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[0.2em] truncate">Поток {stream.name}</p>
                <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-600" />
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-[#10408A] transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs sm:text-lg font-black text-slate-900 dark:text-white">{stream.average}%</div>
                </div>
                <p className="text-[8px] sm:text-xs font-bold text-slate-500 dark:text-slate-300">{stream.userCount} чел.</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
