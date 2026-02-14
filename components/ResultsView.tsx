import React, { useMemo, useState } from 'react';
import { Lesson, Task, TestResult, TaskResult, User, TestAttempt, LessonFile } from '../types';

interface ResultsViewProps {
  lessons: Lesson[];
  tasks: Task[];
  users: User[];
  isAdmin: boolean;
  allLessonResults: Record<string, Record<string, TestResult>>;
  allTaskResults: Record<string, Record<string, TaskResult>>;
  onNavigateToLesson: (lesson: Lesson) => void;
  onNavigateToTask: (task: Task) => void;
  onResetProgress: (userId: string, itemId: string, type: 'lesson' | 'task') => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ lessons, tasks, users, isAdmin, allLessonResults, allTaskResults, onNavigateToLesson, onNavigateToTask, onResetProgress }) => {
  const sessionUser = JSON.parse(localStorage.getItem('edugen_session') || '{}') as User;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(isAdmin ? null : sessionUser.id);
  const [selectedTest, setSelectedTest] = useState<{ lesson: Lesson; result?: TestResult; attemptIndex?: number } | null>(null);
  const [selectedTaskResult, setSelectedTaskResult] = useState<{ task: Task; result: TaskResult } | null>(null);
  const [resultsTab, setResultsTab] = useState<'lesson' | 'task'>('lesson');
  const [taskResultPreviewFileIndex, setTaskResultPreviewFileIndex] = useState<number | null>(null);
  const [taskResultFileUrls, setTaskResultFileUrls] = useState<Record<number, string>>({});

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const uniqueStreams = Array.from(new Set(users.map(u => u.stream).filter(Boolean))).sort();
  const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean))).sort();

  const getUserStats = (userId: string) => {
    const lessonRes = allLessonResults[userId] || {};
    const taskRes = allTaskResults[userId] || {};
    
    const lessonsWithTests = lessons.filter(l => (l.questions || []).length > 0);
    const totalItems = lessonsWithTests.length + tasks.length;
    
    if (totalItems === 0) return { average: 0, completion: 0, itemsDone: 0, total: 0 };
    
    let totalScore = 0;
    let itemsDone = 0;
    
    // Балл по каждому занятию с тестом (не сдан = 0)
    lessonsWithTests.forEach(l => {
      const res = lessonRes[l.id];
      if (res) {
        totalScore += res.percentage;
        itemsDone++;
      } else {
        totalScore += 0;
      }
    });
    
    // Балл по каждому заданию (не сдано = 0). Оценка 1–5 переводится в проценты: grade * 20
    tasks.forEach(t => {
      const res = taskRes[t.id];
      if (res && res.reviews && res.reviews.length > 0) {
        const sumGrades = res.reviews.reduce((acc, curr) => acc + curr.grade, 0);
        const avgGrade = (sumGrades / res.reviews.length) * 20;
        totalScore += avgGrade;
        itemsDone++;
      } else {
        totalScore += 0;
      }
    });
    
    // Средний балл по ВСЕМ материалам (тесты + задания), невыполненные = 0%
    const average = totalItems > 0 ? Math.round(totalScore / totalItems) : 0;
    return {
      average,
      completion: Math.round((itemsDone / totalItems) * 100),
      itemsDone,
      total: totalItems
    };
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (user.role === 'admin') return false;
      const userName = String(user.name || '');
      const userLogin = String(user.login || '');
      const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            userLogin.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDateFrom = !filterDateFrom || user.courseStartDate >= new Date(filterDateFrom).getTime();
      const matchesDateTo = !filterDateTo || user.courseEndDate <= new Date(filterDateTo).getTime();
      const matchesStream = streamFilter === 'all' || user.stream === streamFilter;
      const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;

      return matchesSearch && matchesDateFrom && matchesDateTo && matchesStream && matchesDepartment;
    });
  }, [users, searchQuery, filterDateFrom, filterDateTo, streamFilter, departmentFilter]);

  const exportToWord = async () => {
    try {
      const { Document, Packer, Table, TableRow, TableCell, Paragraph } = await import('docx');
      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph('ФИО')] }),
          new TableCell({ children: [new Paragraph('Кафедра')] }),
          new TableCell({ children: [new Paragraph('Прогресс')] }),
          new TableCell({ children: [new Paragraph('Ср. балл')] }),
        ],
      });
      const dataRows = filteredUsers.map(user => {
        const s = getUserStats(user.id);
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(user.name || '—')] }),
            new TableCell({ children: [new Paragraph(user.department || '—')] }),
            new TableCell({ children: [new Paragraph(`${s.completion}%`)] }),
            new TableCell({ children: [new Paragraph(`${s.average}%`)] }),
          ],
        });
      });
      const table = new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: 'PERCENTAGE' },
      });
      const doc = new Document({
        sections: [{ children: [table] }],
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Успеваемость_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export to Word failed:', e);
      alert('Не удалось выгрузить документ. Попробуйте позже.');
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const userDetailedStats = selectedUserId ? getUserStats(selectedUserId) : null;
  const lessonsWithTests = lessons.filter(l => (l.questions || []).length > 0);
  const selectedLessonResults = selectedUserId ? (allLessonResults[selectedUserId] || {}) : {};
  const selectedTaskResults = selectedUserId ? (allTaskResults[selectedUserId] || {}) : {};
  const completedLessonsCount = lessonsWithTests.filter(l => !!selectedLessonResults[l.id]).length;
  const completedTasksCount = tasks.filter(t => {
    const res = selectedTaskResults[t.id];
    return !!res && res.reviews && res.reviews.length > 0;
  }).length;

  const getInitial = (name: any) => {
    if (typeof name !== 'string' || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getAnswerText = (lesson: Lesson, questionId: string, idx: number | null) => {
    const q = (lesson.questions || []).find(item => item.id === questionId);
    if (!q || idx === null || idx === undefined) return '—';
    return q.options[idx] || '—';
  };

  const getAttemptsList = (result?: TestResult): TestAttempt[] => {
    if (!result) return [];
    if (result.attemptsHistory && result.attemptsHistory.length > 0) return result.attemptsHistory;
    return [{
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      passed: result.passed,
      timestamp: result.timestamp,
      answers: result.answers,
      invalidated: result.invalidated,
      invalidReason: result.invalidReason
    }];
  };

  const attemptsList = selectedTest ? getAttemptsList(selectedTest.result) : [];
  const activeAttemptIndex = selectedTest?.attemptIndex ?? Math.max(0, attemptsList.length - 1);
  const activeAttempt = attemptsList[activeAttemptIndex];

  const handleTaskResultPreviewFile = (idx: number) => {
    if (taskResultPreviewFileIndex === idx) {
      setTaskResultPreviewFileIndex(null);
      return;
    }
    setTaskResultPreviewFileIndex(idx);
    const file = selectedTaskResult?.result.files?.[idx];
    if (!file || file.isLink) return;
    if (taskResultFileUrls[idx]) return;
    const base64 = file.data.startsWith('data:') ? file.data.split(',')[1] : file.data;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: file.type });
      const url = URL.createObjectURL(blob);
      setTaskResultFileUrls(prev => ({ ...prev, [idx]: url }));
    } catch (e) {
      console.error(e);
    }
  };

  const getTaskResultFileSource = (file: LessonFile, idx: number): string => {
    if (file.isLink) return file.data;
    return taskResultFileUrls[idx] || (file.data.startsWith('data:') ? file.data : `data:${file.type};base64,${file.data}`);
  };

  const renderTaskResultFileContent = (file: LessonFile, idx: number) => {
    const source = getTaskResultFileSource(file, idx);
    const { type, name } = file;
    if (file.isLink) {
      return (
        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl">
          <p className="text-sm font-bold text-slate-600 mb-3">Внешняя ссылка</p>
          <a href={file.data} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[#10408A] text-white rounded-xl text-xs font-bold">
            Открыть в новой вкладке
          </a>
        </div>
      );
    }
    if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center bg-slate-100 rounded-2xl overflow-hidden p-2">
          <img src={source} alt={name} className="max-w-full max-h-[50vh] object-contain shadow-md rounded-xl" />
        </div>
      );
    }
    if (type === 'application/pdf') {
      return <div className="h-[60vh] bg-slate-200 rounded-2xl overflow-hidden border border-slate-300"><iframe src={source} className="w-full h-full" title={name} /></div>;
    }
    return (
      <div className="p-6 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl">
        <p className="text-sm font-bold text-slate-600 mb-3">Предпросмотр недоступен для этого типа файла</p>
        <a href={source} download={file.name} className="inline-flex items-center gap-2 px-4 py-2 bg-[#10408A] text-white rounded-xl text-xs font-bold">Скачать файл</a>
      </div>
    );
  };

  const closeTaskResultModal = () => {
    Object.values(taskResultFileUrls).forEach(URL.revokeObjectURL);
    setTaskResultFileUrls({});
    setTaskResultPreviewFileIndex(null);
    setSelectedTaskResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 pb-20 animate-in fade-in duration-500 px-1 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAdmin && !selectedUserId ? 'Успеваемость' : selectedUser?.name || 'Мой прогресс'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {isAdmin && !selectedUserId ? 'Обзор результатов всех преподавателей' : 'Ваши оценки и отзывы'}
          </p>
        </div>
        {isAdmin && selectedUserId && (
          <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-[#10408A] font-bold hover:bg-[#10408A]/5 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Назад к списку
          </button>
        )}
      </div>

      {isAdmin && !selectedUserId ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl sm:rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-[#10408A] outline-none transition-all font-medium text-sm" />
              <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select 
                value={streamFilter} 
                onChange={(e) => setStreamFilter(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 border border-transparent outline-none focus:bg-white"
              >
                <option value="all">Все потоки</option>
                {uniqueStreams.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select 
                value={departmentFilter} 
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="flex-1 md:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 border border-transparent outline-none focus:bg-white"
              >
                <option value="all">Все кафедры</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="flex-1 md:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 border border-transparent outline-none focus:bg-white" />
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="flex-1 md:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 border border-transparent outline-none focus:bg-white" />
              <button
                type="button"
                onClick={exportToWord}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#10408A] text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-[#0d336e] transition-all whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Выгрузить в Word
              </button>
            </div>
          </div>

          {filterDateFrom && filterDateTo && new Date(filterDateFrom).getTime() > new Date(filterDateTo).getTime() && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold">
              Дата «от» позже даты «до». Выберите период заново: начало курса — в поле «от», окончание — в поле «до».
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-[24px] sm:rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-300 text-[9px] sm:text-[10px]">
                  <th className="px-4 sm:px-8 py-4 sm:py-6 font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-600">Преподаватель</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6 font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-600">Прогресс</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6 font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-600 text-center">Ср. Балл</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6 font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-600">Действие</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const s = getUserStats(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:bg-slate-700/50 transition-colors">
                      <td className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 dark:border-slate-700">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#10408A]/10 dark:bg-[#10408A]/20 text-[#10408A] dark:text-[#6ba3f5] rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs sm:text-base">{getInitial(user.name)}</div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[150px]">{user.name}</p>
                            <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-300 font-bold uppercase tracking-tight">Поток: {user.stream || '—'}</p>
                            <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-300 font-bold uppercase tracking-tight">Кафедра: {user.department || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 dark:border-slate-700">
                        <div className="w-24 sm:w-32">
                          <div className="flex justify-between items-center mb-1"><span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-300">{s.completion}%</span></div>
                          <div className="w-full h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10408A]" style={{ width: `${s.completion}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 dark:border-slate-700 text-center"><span className={`text-sm sm:text-lg font-black ${s.average >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>{s.average}%</span></td>
                      <td className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-50 dark:border-slate-700"><button onClick={() => setSelectedUserId(user.id)} className="px-3 py-1.5 bg-[#10408A]/10 dark:bg-[#10408A]/20 text-[#10408A] dark:text-[#6ba3f5] rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold hover:bg-[#10408A] hover:text-white transition-all whitespace-nowrap">Детали</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-100 dark:border-slate-600 shadow-sm text-center space-y-4 sm:space-y-6">
               <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#10408A] rounded-[28px] sm:rounded-[32px] mx-auto flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl shadow-[#10408A]/10">{getInitial(selectedUser?.name)}</div>
               <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{selectedUser?.name}</h3>
                <p className="text-slate-400 dark:text-slate-300 text-[10px] sm:text-sm font-bold uppercase tracking-widest mt-1">Поток: {selectedUser?.stream || '—'}</p>
                <p className="text-slate-400 dark:text-slate-300 text-[10px] sm:text-sm font-bold uppercase tracking-widest mt-1">Кафедра: {selectedUser?.department || '—'}</p>
               </div>
               <div className="pt-4 sm:pt-6 border-t border-slate-50 flex justify-center gap-6 sm:gap-8">
                 <div className="text-center">
                   <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">{selectedUserId === sessionUser.id ? 'Ваш средний балл' : 'Средний балл'}</p>
                   <p className={`text-xl sm:text-2xl font-black ${(userDetailedStats?.average ?? 0) >= 50 ? 'text-[#10408A]' : 'text-amber-500'}`}>{userDetailedStats?.average}%</p>
                 </div>
                 <div className="w-[1px] h-8 sm:h-10 bg-slate-100"></div>
                 <div className="text-center">
                   <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Курс пройден на</p>
                   <p className="text-xl sm:text-2xl font-black text-emerald-500">{userDetailedStats?.completion}%</p>
                 </div>
               </div>
               {(userDetailedStats && userDetailedStats.average < 50) && (
                 <p className="text-sm font-bold text-amber-600 bg-amber-50 rounded-xl py-2 px-4">
                   {selectedUserId === sessionUser.id ? 'Вы еще не набрали проходной балл' : 'Слушатель еще не набрал проходной балл'} (проходной — 50% и выше).
                 </p>
               )}
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 text-center border border-slate-100 dark:border-slate-600">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Занятий прошел</p>
                  <p className="text-lg sm:text-xl font-black text-[#10408A] mt-1">{completedLessonsCount}</p>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 text-center border border-slate-100 dark:border-slate-600">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Занятий осталось</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">{Math.max(0, lessonsWithTests.length - completedLessonsCount)}</p>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 text-center border border-slate-100 dark:border-slate-600">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Заданий завершил</p>
                  <p className="text-lg sm:text-xl font-black text-emerald-600 mt-1">{completedTasksCount}</p>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 text-center border border-slate-100 dark:border-slate-600">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Заданий осталось</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">{Math.max(0, tasks.length - completedTasksCount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResultsTab('lesson')}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${resultsTab === 'lesson' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Занятие
              </button>
              <button
                type="button"
                onClick={() => setResultsTab('task')}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${resultsTab === 'task' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Задание
              </button>
            </div>

            {resultsTab === 'lesson' && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:gap-3">
                {lessons.filter(l => (l.questions || []).length > 0).map(lesson => {
                  const res = (allLessonResults[selectedUserId!] || {})[lesson.id];
                  return (
                    <div
                      key={lesson.id}
                      className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-3xl border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{lesson.title}</h4>
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase mt-1">
                          {res ? `Пройдено: ${new Date(res.timestamp).toLocaleDateString()} • попыток: ${res.attempts ?? 1}` : 'Не пройдено'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {res?.invalidated && (
                          <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600">Аннулирован</span>
                        )}
                        {res && <span className={`text-base sm:text-xl font-black ${res.passed ? 'text-emerald-600' : 'text-rose-500'}`}>{res.percentage}%</span>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToLesson(lesson)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-slate-200 transition-all whitespace-nowrap"
                          >
                            Перейти
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const attemptsList = getAttemptsList(res);
                              setSelectedTest({ lesson, result: res, attemptIndex: Math.max(0, attemptsList.length - 1) });
                            }}
                            disabled={!res}
                            className="px-3 py-1.5 bg-[#10408A]/10 text-[#10408A] rounded-lg text-[10px] sm:text-xs font-bold hover:bg-[#10408A]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                          >
                            Результаты
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {resultsTab === 'task' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {tasks.map(task => {
                  const res = (allTaskResults[selectedUserId!] || {})[task.id];
                  const reviews = res?.reviews || [];
                  const sumGrades = reviews.reduce((acc, curr) => acc + curr.grade, 0);
                  const avgGrade = reviews.length > 0 ? (sumGrades / reviews.length).toFixed(1) : null;
                  const isSubmitted = !!res?.submitted;
                  const statusLabel = reviews.length > 0 ? 'Оценено' : (isSubmitted ? 'Отправлено на проверку' : 'Не отправлено');
                  return (
                    <div key={task.id} className="bg-white dark:bg-slate-800 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-lg truncate">{task.title}</h4>
                          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-1">
                            <span className={reviews.length > 0 ? 'text-[#10408A]' : (isSubmitted ? 'text-amber-600' : 'text-slate-300')}>
                              {statusLabel}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                          {avgGrade && (
                            <span className={`text-lg sm:text-2xl font-black ${Number(avgGrade) >= 3 ? 'text-emerald-600' : 'text-amber-500'}`}>{avgGrade}/5</span>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => onNavigateToTask(task)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-slate-200 transition-all whitespace-nowrap"
                            >
                              Перейти
                            </button>
                            <button
                              type="button"
                              onClick={() => res && reviews.length > 0 && setSelectedTaskResult({ task, result: res })}
                              disabled={!res || reviews.length === 0}
                              className="px-3 py-1.5 bg-[#10408A]/10 text-[#10408A] rounded-lg text-[10px] sm:text-xs font-bold hover:bg-[#10408A]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                            >
                              Результаты
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {selectedTest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">Ответы по тесту</h3>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{selectedTest.lesson.title}</p>
              </div>
              <button type="button" onClick={() => setSelectedTest(null)} className="text-slate-400 p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-4 overflow-y-auto">
              {!selectedTest.result ? (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl p-6 text-center text-slate-500 text-sm font-bold">
                  Пользователь еще не проходил этот тест.
                </div>
              ) : (
                <div className="space-y-4">
                  {attemptsList.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl p-6 text-center text-slate-500 text-sm font-bold">
                      Нет сохраненных попыток по этому тесту.
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl p-4 text-xs sm:text-sm font-bold text-slate-600 flex flex-wrap gap-2 justify-between items-center">
                        <span>Попыток: {attemptsList.length}</span>
                        {activeAttempt?.invalidated && <span className="text-rose-600">Попытка аннулирована (переключение вкладок)</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attemptsList.map((attempt, idx) => (
                          <button
                            key={`${attempt.timestamp}-${idx}`}
                            onClick={() => setSelectedTest(prev => prev ? { ...prev, attemptIndex: idx } : prev)}
                            className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border transition-all ${idx === activeAttemptIndex ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#10408A]/40'}`}
                          >
                            Попытка {idx + 1} • {attempt.percentage}%
                          </button>
                        ))}
                      </div>
                      {!activeAttempt?.answers || activeAttempt.answers.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-2xl p-6 text-center text-slate-500 text-sm font-bold">
                          Нет сохраненных ответов по выбранной попытке.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {activeAttempt.answers.map((ans, idx) => {
                            const question = (selectedTest.lesson.questions || []).find(q => q.id === ans.questionId);
                            return (
                              <div key={`${ans.questionId}-${idx}`} className="bg-white border border-slate-200 dark:border-slate-600 rounded-2xl p-5 sm:p-6">
                                <div className="flex items-start gap-3">
                                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${ans.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{question?.text || 'Вопрос'}</p>
                                    <div className="mt-3 grid gap-2">
                                      <div className="text-xs sm:text-sm text-slate-600">
                                        <span className="font-black text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] block mb-1">Ответ пользователя</span>
                                        <span className={`${ans.isCorrect ? 'text-emerald-700' : 'text-rose-700'} font-bold`}>
                                          {getAnswerText(selectedTest.lesson, ans.questionId, ans.selectedIndex)}
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm text-slate-600">
                                        <span className="font-black text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] block mb-1">Правильный ответ</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          {getAnswerText(selectedTest.lesson, ans.questionId, question?.correctAnswerIndex ?? null)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-700/50 flex justify-end">
              <button type="button" onClick={() => setSelectedTest(null)} className="px-8 py-3 bg-[#10408A] text-white rounded-2xl font-black shadow-lg text-sm">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-black text-slate-900 truncate">{selectedTaskResult.task.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Результат задания</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              {/* Выполненное задание */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Выполненное задание</h4>
                {selectedTaskResult.result.response ? (
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-600 text-slate-800 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedTaskResult.result.response }} />
                ) : (
                  <p className="text-sm text-slate-400 italic">Текстовый ответ не приложен.</p>
                )}
                {selectedTaskResult.result.files && selectedTaskResult.result.files.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Прикреплённые файлы</p>
                    <div className="space-y-2">
                      {selectedTaskResult.result.files.map((file, idx) => {
                        const downloadHref = file.isLink ? file.data : (file.data.startsWith('data:') ? file.data : `data:${file.type};base64,${file.data}`);
                        return (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 dark:border-slate-600 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                                {!file.isLink && file.size > 0 && <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTaskResultPreviewFile(idx)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${taskResultPreviewFileIndex === idx ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-white dark:bg-slate-800 text-[#10408A] dark:text-[#6ba3f5] border-slate-200 dark:border-slate-600 hover:border-[#10408A]'}`}
                              >
                                {taskResultPreviewFileIndex === idx ? 'Скрыть' : 'Просмотр'}
                              </button>
                              <a
                                href={downloadHref}
                                target={file.isLink ? '_blank' : undefined}
                                rel={file.isLink ? 'noopener noreferrer' : undefined}
                                download={file.isLink ? undefined : file.name}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Скачать
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {taskResultPreviewFileIndex !== null && selectedTaskResult.result.files?.[taskResultPreviewFileIndex] && (
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-600">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Просмотр</p>
                        {renderTaskResultFileContent(selectedTaskResult.result.files[taskResultPreviewFileIndex], taskResultPreviewFileIndex)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Оценки */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Оценки и отзывы</h4>
                {selectedTaskResult.result.reviews.length > 0 ? (
                  selectedTaskResult.result.reviews.map((r, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-600">
                      <p className="text-2xl font-black text-[#10408A]">{r.grade}/5</p>
                      {r.comment && <p className="text-sm text-slate-600 mt-2">{r.comment}</p>}
                      <p className="text-[10px] text-slate-400 mt-2">Проверил: {r.adminName}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">Пока нет оценок.</p>
                )}
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-700/50 flex justify-end shrink-0 border-t border-slate-100">
              <button type="button" onClick={closeTaskResultModal} className="px-8 py-3 bg-[#10408A] text-white rounded-2xl font-black shadow-lg text-sm">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
