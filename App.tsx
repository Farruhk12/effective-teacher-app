import React, { useState, useEffect, useRef } from 'react';
import { View, Lesson, Task, TaskResult, TestResult, User, Review, Question, ApiFetchResponse, ScheduleItem, Recommendation } from './types';
import { apiService } from './services/apiService';
import Dashboard from './components/Dashboard';
import LessonForm from './components/LessonForm';
import LessonDetail from './components/LessonDetail';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TaskSolve from './components/TaskSolve';
import ResultsView from './components/ResultsView';
import ReviewView from './components/ReviewView';
import UsersView from './components/UsersView';
import AnalyticsView from './components/AnalyticsView';
import ValidationView from './components/ValidationView';
import ScheduleView from './components/ScheduleView';
import ProgressView from './components/ProgressView';
import RecommendationsView from './components/RecommendationsView';
import Login from './components/Login';
import Landing from './components/Landing';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLanding, setIsLanding] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('schedule');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('edugen_theme') === 'dark'; } catch { return false; }
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [taskResults, setTaskResults] = useState<Record<string, Record<string, TaskResult>>>({});
  const [lessonResults, setLessonResults] = useState<Record<string, Record<string, TestResult>>>({});
  
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [testInProgress, setTestInProgress] = useState(false);
  const [blockReason, setBlockReason] = useState<'nav' | 'logout' | null>(null);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const logoUrl = "https://www.tajmedun.tj/bitrix/templates/tajmedun/images/logo_new2.png";

  const safeParseArray = (val: unknown) => (Array.isArray(val) ? val : []);

  /** Приводит время из таблицы (ISO, серийная дата или "HH:MM") к формату "HH:MM". Для ISO используем локальное время. */
  const normalizeStartTime = (val: unknown): string => {
    if (val == null) return '09:00';
    if (typeof val === 'string') {
      if (/^\d{1,2}:\d{2}$/.test(val.trim())) return val.trim();
      if (val.includes('T')) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const h = d.getHours();
          const m = d.getMinutes();
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      }
    }
    if (typeof val === 'number') {
      const day = Math.floor(val);
      let fraction = val - day;
      if (fraction < 0 || fraction >= 1) fraction = fraction - Math.floor(fraction);
      const totalM = Math.round(fraction * 24 * 60);
      const h = Math.floor(totalM / 60) % 24;
      const m = totalM % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '09:00';
  };

  useEffect(() => {
    const session = localStorage.getItem('edugen_session');
    if (session) {
      setCurrentUser(JSON.parse(session) as User);
      setIsLanding(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('edugen_theme', darkMode ? 'dark' : 'light'); } catch { /* noop */ }
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // После обновления страницы — один раз вернуться в занятие с активным тестом
  const hasRestoredTestViewRef = useRef(false);
  useEffect(() => {
    if (isLoading || lessons.length === 0 || !currentUser || hasRestoredTestViewRef.current) return;
    try {
      const raw = sessionStorage.getItem('edugen_active_test');
      if (!raw) return;
      const data = JSON.parse(raw) as { lessonId?: string };
      const lessonId = data?.lessonId;
      if (!lessonId) return;
      const lesson = lessons.find((l: Lesson) => l.id === lessonId);
      if (!lesson) return;
      hasRestoredTestViewRef.current = true;
      setActiveLesson(lesson);
      setCurrentView('view-lesson');
    } catch {
      // ignore
    }
  }, [lessons, isLoading, currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'admin' && currentView === 'progress') {
      setCurrentView('schedule');
    }
  }, [currentUser?.role, currentView]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await apiService.fetchAll() as ApiFetchResponse | null;
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const usersList = safeParseArray(result.users ?? (result as Record<string, unknown>).Users);
      const lessonsList = safeParseArray(result.lessons ?? (result as Record<string, unknown>).Lessons);
      const tasksList = safeParseArray(result.tasks ?? (result as Record<string, unknown>).Tasks);
      const resultsList = safeParseArray(result.results ?? (result as Record<string, unknown>).Results);
      const submissionsList = safeParseArray(result.submissions ?? (result as Record<string, unknown>).Submissions);
      const reviewsList = safeParseArray(result.reviews ?? (result as Record<string, unknown>).Reviews);

      setUsers(usersList);
      setLessons(lessonsList);
      setTasks(tasksList);
      const scheduleList = safeParseArray(result.schedule ?? (result as Record<string, unknown>).Schedule);
      setSchedule(scheduleList.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? ''),
        dayOfWeek: Number(s.dayOfWeek ?? 1),
        lessonId: String(s.lessonId ?? ''),
        durationHours: Number(s.durationHours ?? 1),
        startTime: normalizeStartTime(s.startTime),
        curators: Array.isArray(s.curators) ? s.curators.map(String) : (typeof s.curators === 'string' ? (() => { try { const a = JSON.parse(s.curators as string); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } })() : []),
      })));
      setLoadError(null);

      const lResults: Record<string, Record<string, TestResult>> = {};
      resultsList.forEach((r: ApiFetchResponse['results'] extends Array<infer U> ? U : Record<string, unknown>) => {
        const row = r as { userId?: string; lessonId?: string };
        if (!row?.userId || !row?.lessonId) return;
        if (!lResults[row.userId]) lResults[row.userId] = {};
        lResults[row.userId][row.lessonId] = r as unknown as TestResult;
      });
      setLessonResults(lResults);

      const tResults: Record<string, Record<string, TaskResult>> = {};
      submissionsList.forEach((s: ApiFetchResponse['submissions'] extends Array<infer U> ? U : Record<string, unknown>) => {
        const row = s as { userId?: string; taskId?: string };
        if (!row?.userId || !row?.taskId) return;
        if (!tResults[row.userId]) tResults[row.userId] = {};
        const reviews = reviewsList.filter((rev: { userId?: string; taskId?: string }) => rev.userId === row.userId && rev.taskId === row.taskId);
        tResults[row.userId][row.taskId] = { ...s, reviews } as unknown as TaskResult;
      });
      setTaskResults(tResults);

      const recList = safeParseArray(result.recommendations ?? (result as Record<string, unknown>).Recommendations);
      setRecommendations(recList.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ''),
        title: String(r.title ?? ''),
        content: String(r.content ?? ''),
        authorName: r.authorName != null ? String(r.authorName) : undefined,
        createdAt: typeof r.createdAt === 'number' ? r.createdAt : Number(r.createdAt) || Date.now(),
      })));
    } else {
      setLoadError('Связь с таблицей недоступна. Проверьте интернет или нажмите «Повторить».');
    }
    setIsLoading(false);
  };

  const syncData = async (action: string, data: any) => {
    await apiService.post(action, data);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLanding(false);
    localStorage.setItem('edugen_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    if (testInProgress) {
      setBlockReason('logout');
      setIsSidebarOpen(false);
      return;
    }
    setCurrentUser(null);
    setIsLanding(true);
    localStorage.removeItem('edugen_session');
    setCurrentView('dashboard');
    setIsSidebarOpen(false);
  };

  const navigateTo = (view: View) => {
    if (testInProgress) {
      setBlockReason('nav');
      setIsSidebarOpen(false);
      return;
    }
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const PAYLOAD_SIZE_THRESHOLD = 80000;
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const handleSaveLesson = async (lesson: Lesson) => {
    if (isSavingLesson) return;
    setIsSavingLesson(true);
    try {
      const payloadStr = JSON.stringify({ action: 'saveLesson', data: lesson });
      if (payloadStr.length > PAYLOAD_SIZE_THRESHOLD) {
        const lightLesson = {
          id: lesson.id,
          title: lesson.title,
          files: lesson.files || [],
          questions: lesson.questions || [],
          createdAt: lesson.createdAt,
        } as Lesson;
        await syncData('saveLesson', lightLesson);
        await syncData('patchLessonContent', {
          id: lesson.id,
          description: lesson.description ?? '',
          coverImage: lesson.coverImage ?? '',
        });
      } else {
        await syncData('saveLesson', lesson);
      }
      const updated = lessons.find(l => l.id === lesson.id)
        ? lessons.map(l => (l.id === lesson.id ? lesson : l))
        : [...lessons, lesson];
      setLessons(updated);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Ошибка сохранения занятия:', err);
      alert('Не удалось сохранить занятие. Проверьте интернет и попробуйте снова.');
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleDeleteLesson = (id: string) => {
    if (window.confirm('Удалить это занятие?')) {
      const updated = lessons.filter(l => l.id !== id);
      setLessons(updated);
      syncData('deleteItem', { sheet: 'Lessons', id });
    }
  };

  const handleSaveTask = (task: Task) => {
    const updated = tasks.find(t => t.id === task.id)
      ? tasks.map(t => (t.id === task.id ? task : t))
      : [...tasks, task];
    setTasks(updated);
    syncData('saveTask', task);
    setCurrentView('tasks');
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Удалить это задание?')) {
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);
      syncData('deleteItem', { sheet: 'Tasks', id });
    }
  };

  const handleSaveScheduleItem = (item: ScheduleItem) => {
    const hasId = item.id && !item.id.startsWith('new_');
    const toSave: ScheduleItem = {
      ...item,
      id: hasId ? item.id : 'sched_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
    };
    const updated = schedule.find(s => s.id === toSave.id)
      ? schedule.map(s => (s.id === toSave.id ? toSave : s))
      : [...schedule, toSave];
    setSchedule(updated);
    syncData('saveScheduleItem', toSave);
  };

  const handleDeleteScheduleItem = (id: string) => {
    if (window.confirm('Удалить эту запись из расписания?')) {
      setSchedule(schedule.filter(s => s.id !== id));
      syncData('deleteItem', { sheet: 'Schedule', id });
    }
  };

  const handleSaveLessonResult = (lessonId: string, result: TestResult) => {
    if (!currentUser) return;
    const updated = {
      ...lessonResults,
      [currentUser.id]: {
        ...(lessonResults[currentUser.id] || {}),
        [lessonId]: result
      }
    };
    setLessonResults(updated);
    syncData('saveLessonResult', { ...result, userId: currentUser.id, lessonId });
  };

  const handleSaveTaskResult = (taskId: string, result: TaskResult) => {
    if (!currentUser) return;
    const updated = {
      ...taskResults,
      [currentUser.id]: {
        ...(taskResults[currentUser.id] || {}),
        [taskId]: result
      }
    };
    setTaskResults(updated);
    syncData('submitTask', { ...result, userId: currentUser.id, taskId });
    setCurrentView('tasks');
  };

  const handleSaveReview = (taskId: string, result: TaskResult, userId: string) => {
    const updated = {
      ...taskResults,
      [userId]: {
        ...(taskResults[userId] || {}),
        [taskId]: result
      }
    };
    setTaskResults(updated);
    if (result.reviews && result.reviews.length > 0) {
      const myReview = result.reviews.find(r => r.adminId === currentUser?.id);
      if (myReview) {
        syncData('saveReview', { ...myReview, userId, taskId });
      }
    }
  };

  const handleResetProgress = (userId: string, itemId: string, type: 'lesson' | 'task') => {
    if (type === 'lesson') {
      const userRes = { ...(lessonResults[userId] || {}) };
      delete userRes[itemId];
      setLessonResults({ ...lessonResults, [userId]: userRes });
    } else {
      const userRes = { ...(taskResults[userId] || {}) };
      delete userRes[itemId];
      setTaskResults({ ...taskResults, [userId]: userRes });
    }
    syncData('resetProgress', { userId, itemId, type });
  };

  const handleAddRecommendation = (title: string, content: string, authorName: string) => {
    const rec: Recommendation = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      title,
      content,
      authorName: authorName || undefined,
      createdAt: Date.now(),
    };
    setRecommendations((prev) => [rec, ...prev]);
    syncData('saveRecommendation', rec);
  };

  const handleDeleteRecommendation = (id: string) => {
    if (window.confirm('Удалить эту рекомендацию?')) {
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      syncData('deleteItem', { sheet: 'Recommendations', id });
    }
  };

  const handleUpdateUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    const lastUser = newUsers[newUsers.length - 1];
    syncData('saveUser', lastUser);
  };

  const handleUpdateQuestion = (lessonId: string, updatedQuestion: Question) => {
    setLessons(prev => {
      const updatedLessons = prev.map(lesson => {
        if (lesson.id !== lessonId) return lesson;
        const updatedQuestions = (lesson.questions || []).map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
        return { ...lesson, questions: updatedQuestions };
      });
      const updatedLesson = updatedLessons.find(l => l.id === lessonId);
      if (updatedLesson) syncData('saveLesson', updatedLesson);
      return updatedLessons;
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Удалить пользователя?')) {
      const updated = users.filter(u => u.id !== userId);
      setUsers(updated);
      syncData('deleteItem', { sheet: 'Users', id: userId });
    }
  };

  if (isLanding) return <Landing onEnter={() => setIsLanding(false)} />;
  if (!currentUser) return <Login onLogin={handleLogin} users={users} loadError={loadError} onRetry={loadData} isLoading={isLoading} />;

  const isAdmin = currentUser.role === 'admin';

  const NavItem = ({ view, label, icon, badgeCount }: { view: View, label: string, icon: React.ReactNode, badgeCount?: number }) => {
    const isActive = currentView === view || (view === 'dashboard' && currentView.includes('lesson')) || (view === 'tasks' && currentView.includes('task'));
    return (
      <button 
        onClick={() => navigateTo(view)} 
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/20' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`}
      >
        {icon}
        <span className="truncate">{label}</span>
        {badgeCount && badgeCount > 0 && (
          <span className="ml-auto min-w-[28px] h-6 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-rose-500 text-rose-600 bg-white dark:bg-slate-800 dark:text-rose-400">
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  const pendingReviewCount = (isAdmin
    ? Object.values(taskResults).reduce((count: number, userTasks: Record<string, TaskResult>) => {
        const userPending = Object.values(userTasks).filter(tr => !tr.reviews || tr.reviews.length === 0).length;
        return count + userPending;
      }, 0)
    : 0) as number;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Модалка: предупреждение во время теста (навигация или выход из профиля) */}
      {blockReason && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setBlockReason(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-600 p-5 sm:p-8 max-w-md w-full text-center space-y-5 sm:space-y-6" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            {blockReason === 'nav' ? (
              <>
                <p className="text-lg font-black text-slate-900 dark:text-white">Переключение невозможно во время тестирования</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Завершите тест или дождитесь окончания времени. Переход в другие разделы заблокирован.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-black text-slate-900 dark:text-white">Выйти из профиля невозможно во время тестирования</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Завершите тест или дождитесь окончания времени, после этого вы сможете выйти из системы.</p>
              </>
            )}
            <button onClick={() => setBlockReason(null)} className="w-full py-4 px-6 bg-[#10408A] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-[#0d336e] transition-all min-h-[48px]">Понятно</button>
          </div>
        </div>
      )}

      {/* Mobile Top Bar: меню слева (открывает навигацию), логотип по центру, тема справа */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 px-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Меню">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
        <div className="flex items-center justify-center min-w-0 flex-1">
          <img src={logoUrl} alt="" className="h-9 w-9 object-contain" />
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0" aria-label={darkMode ? 'Светлая тема' : 'Тёмная тема'}>
          {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-[min(288px,90vw)] md:w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-[70] transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 flex items-center gap-3 mb-4 shrink-0">
          <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
          <div className="min-w-0">
            <h1 className="font-black text-slate-900 dark:text-white tracking-tight uppercase text-sm leading-tight">Эффективный преподаватель</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Личный кабинет</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pb-6">
          <NavItem view="schedule" label="Расписание занятий" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <NavItem view="dashboard" label="Занятия" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
          <NavItem view="tasks" label="Задания" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
          <NavItem view="results" label="Результаты" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
          {!isAdmin && <NavItem view="progress" label="Мой прогресс" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />}
          <NavItem view="recommendations" label="Рекомендации" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Администрирование</p>
              </div>
              <NavItem view="analytics" label="Аналитика" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
              <NavItem view="validation" label="Валидация тестов" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>} />
              <NavItem view="review" label="Проверка работ" badgeCount={pendingReviewCount} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <NavItem view="users" label="Пользователи" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all mb-2">
            {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            <span>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-3">
            <div className="w-10 h-10 bg-[#10408A] text-white rounded-xl flex items-center justify-center font-black">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{isAdmin ? 'Администратор' : 'Преподаватель'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:text-rose-400 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Выйти из системы
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#10408A]/20 border-t-[#10408A] rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard 
                  lessons={lessons} 
                  isAdmin={isAdmin} 
                  daysLeft={currentUser ? Math.max(0, Math.ceil(((currentUser.courseEndDate as number) - Date.now()) / (1000 * 60 * 60 * 24))) : null}
                  totalDays={currentUser && currentUser.courseStartDate != null && currentUser.courseEndDate != null ? Math.max(1, Math.ceil(((currentUser.courseEndDate as number) - (currentUser.courseStartDate as number)) / (1000 * 60 * 60 * 24))) : undefined}
                  completedLessons={!currentUser || isAdmin ? undefined : lessons.filter(l => (l.questions || []).length > 0).filter(l => lessonResults[currentUser.id]?.[l.id]).length}
                  totalLessons={lessons.length}
                  onViewLesson={(l) => { setActiveLesson(l); setCurrentView('view-lesson'); }}
                  onEditLesson={(l) => { setActiveLesson(l); setCurrentView('edit-lesson'); }}
                  onDeleteLesson={handleDeleteLesson}
                  onCreateNew={() => setCurrentView('create-lesson')}
                />
              )}

              {currentView === 'create-lesson' && <LessonForm onSave={handleSaveLesson} onCancel={() => setCurrentView('dashboard')} isSaving={isSavingLesson} />}
              {currentView === 'edit-lesson' && activeLesson && <LessonForm initialData={activeLesson} onSave={handleSaveLesson} onCancel={() => setCurrentView('dashboard')} isSaving={isSavingLesson} />}
              
              {currentView === 'view-lesson' && activeLesson && (
                <LessonDetail 
                  lesson={activeLesson} 
                  existingResult={lessonResults[currentUser.id]?.[activeLesson.id]}
                  onBack={() => setCurrentView('dashboard')} 
                  onEdit={() => setCurrentView('edit-lesson')}
                  onSaveResult={handleSaveLessonResult}
                  onTestInProgressChange={setTestInProgress}
                />
              )}

              {currentView === 'tasks' && (
                <TaskList 
                  tasks={tasks} 
                  isAdmin={isAdmin} 
                  currentUserId={currentUser?.id}
                  taskResults={taskResults}
                  onEditTask={(t) => { setActiveTask(t); setCurrentView('edit-task'); }}
                  onDeleteTask={handleDeleteTask}
                  onSolveTask={(t) => { setActiveTask(t); setCurrentView('solve-task'); }}
                  onCreateNew={() => setCurrentView('create-task')}
                />
              )}

              {currentView === 'create-task' && <TaskForm onSave={handleSaveTask} onCancel={() => setCurrentView('tasks')} />}
              {currentView === 'edit-task' && activeTask && <TaskForm initialData={activeTask} onSave={handleSaveTask} onCancel={() => setCurrentView('tasks')} />}
              
              {currentView === 'solve-task' && activeTask && (
                <TaskSolve 
                  task={activeTask} 
                  existingResult={taskResults[currentUser.id]?.[activeTask.id]}
                  onCancel={() => setCurrentView('tasks')}
                  onFinish={handleSaveTaskResult}
                />
              )}

              {currentView === 'results' && (
                <ResultsView 
                  lessons={lessons} 
                  tasks={tasks} 
                  users={users} 
                  isAdmin={isAdmin} 
                  allLessonResults={lessonResults}
                  allTaskResults={taskResults}
                  onNavigateToLesson={(l) => { setActiveLesson(l); setCurrentView('view-lesson'); }}
                  onNavigateToTask={(t) => { setActiveTask(t); setCurrentView('solve-task'); }}
                  onResetProgress={handleResetProgress}
                />
              )}

              {currentView === 'progress' && currentUser && !isAdmin && (
                <ProgressView
                  currentUser={currentUser}
                  lessons={lessons}
                  tasks={tasks}
                  lessonResults={lessonResults}
                  taskResults={taskResults}
                  onNavigateToLessons={() => setCurrentView('dashboard')}
                  onNavigateToTasks={() => setCurrentView('tasks')}
                />
              )}

              {currentView === 'recommendations' && (
                <RecommendationsView
                  recommendations={recommendations}
                  isAdmin={isAdmin}
                  currentUserName={currentUser?.name ?? ''}
                  onAddRecommendation={handleAddRecommendation}
                  onDeleteRecommendation={handleDeleteRecommendation}
                />
              )}

              {isAdmin && currentView === 'analytics' && (
                <AnalyticsView 
                  users={users} 
                  lessons={lessons} 
                  tasks={tasks} 
                  lessonResults={lessonResults} 
                  taskResults={taskResults} 
                />
              )}

              {isAdmin && currentView === 'validation' && (
                <ValidationView
                  lessons={lessons}
                  lessonResults={lessonResults}
                  onUpdateQuestion={handleUpdateQuestion}
                />
              )}

              {isAdmin && currentView === 'review' && (
                <ReviewView 
                  tasks={tasks} 
                  submissions={taskResults} 
                  onSaveGrade={handleSaveReview}
                  users={users}
                />
              )}

              {isAdmin && currentView === 'users' && (
                <UsersView 
                  users={users} 
                  onUpdateUsers={handleUpdateUsers}
                  lessons={lessons}
                  tasks={tasks}
                  lessonResults={lessonResults}
                  taskResults={taskResults}
                  onResetProgress={handleResetProgress}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {currentView === 'schedule' && (
                <ScheduleView
                  schedule={schedule}
                  lessons={lessons}
                  users={users}
                  isAdmin={isAdmin}
                  onSave={handleSaveScheduleItem}
                  onDelete={handleDeleteScheduleItem}
                  onNavigateToLesson={(l) => { setActiveLesson(l); setCurrentView('view-lesson'); }}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;