
import React, { useState } from 'react';
import { User, UserRole, Lesson, Task, TaskResult, TestResult } from '../types';

interface UsersViewProps {
  users: User[];
  onUpdateUsers: (newUsers: User[]) => void;
  lessons: Lesson[];
  tasks: Task[];
  lessonResults: Record<string, Record<string, TestResult>>;
  taskResults: Record<string, Record<string, TaskResult>>;
  onResetProgress: (userId: string, itemId: string, type: 'lesson' | 'task') => void;
  onDeleteUser: (userId: string) => void;
}

const UsersView: React.FC<UsersViewProps> = ({ users, onUpdateUsers, lessons, tasks, lessonResults, taskResults, onResetProgress, onDeleteUser }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [stream, setStream] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('listener');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
  
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);
  const [streamFilter, setStreamFilter] = useState('all');

  const uniqueStreams = Array.from(new Set(users.map(u => u.stream).filter(Boolean))).sort();

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !login || !password || (role === 'listener' && (!startDate || !endDate || !stream || !department))) {
      alert("Заполните все поля");
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: String(name),
      login: String(login),
      password: String(password),
      role,
      stream: String(stream),
      department: String(department),
      courseStartDate: new Date(startDate).getTime(),
      courseEndDate: new Date(endDate).getTime()
    };

    onUpdateUsers([...users, newUser]);
    setShowAdd(false);
    setName(''); setLogin(''); setPassword(''); setStream(''); setDepartment('');
  };

  const filteredUsers = streamFilter === 'all' 
    ? users 
    : users.filter(u => u.stream === streamFilter);

  const lessonsWithTests = lessons.filter(l => (l.questions || []).length > 0);

  const getInitial = (name: any) => {
    if (typeof name !== 'string' || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
  };

  const inspectingUser = inspectingUserId ? users.find(u => u.id === inspectingUserId) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Пользователи</h2>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={streamFilter} 
            onChange={(e) => setStreamFilter(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#10408A]"
          >
            <option value="all">Все потоки</option>
            {uniqueStreams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex-1 sm:flex-none bg-[#10408A] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0d336e] transition-all shadow-md text-[10px] sm:text-sm whitespace-nowrap"
          >
            + Добавить
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[20px] sm:rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-between group hover:border-[#10408A]/30 transition-all">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${user.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-[#10408A]/10 text-[#10408A]'}`}>
                {getInitial(user.name)}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-base flex items-center gap-2 truncate">
                  {user.name}
                  <span className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[9px] font-bold uppercase ${user.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-[#10408A]/10 text-[#10408A]'}`}>
                    {user.role === 'admin' ? 'Админ' : 'Преп'}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                  {user.stream && <span className="px-1.5 py-0.5 rounded text-[7px] sm:text-[9px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">Поток: {user.stream}</span>}
                  {user.department && <span className="px-1.5 py-0.5 rounded text-[7px] sm:text-[9px] font-bold bg-indigo-50 text-indigo-600 truncate max-w-[120px]">Кафедра: {user.department}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
              <button onClick={() => setInspectingUserId(user.id)} className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-bold hover:bg-[#10408A]/10 hover:text-[#10408A] transition-all">Детали</button>
              <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          </div>
        ))}
      </div>

      {inspectingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] sm:rounded-[40px] w-full max-w-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Детали тестов</h3>
                <p className="text-xs sm:text-sm text-slate-500">{inspectingUser.name}</p>
              </div>
              <button type="button" onClick={() => setInspectingUserId(null)} className="text-slate-400 p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-4 overflow-y-auto">
              {lessonsWithTests.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm font-bold">
                  Нет занятий с тестами.
                </div>
              ) : (
                lessonsWithTests.map(lesson => {
                  const res = lessonResults[inspectingUser.id]?.[lesson.id];
                  const status = res ? (res.passed ? 'Сдан' : 'Не сдан') : 'Не проходил';
                  const scoreText = res ? `${res.score}/${res.total} • ${res.percentage}%` : '—';
                  return (
                    <div key={lesson.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Занятие</p>
                        <p className="text-sm sm:text-base font-black text-slate-900 mt-1 break-words">{lesson.title}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${res ? (res.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') : 'bg-slate-100 text-slate-600'}`}>
                          {status}
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                          {scoreText}
                        </span>
                        {res?.timestamp && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400">
                            {new Date(res.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 sm:p-8 bg-slate-50/50 flex justify-end">
              <button type="button" onClick={() => setInspectingUserId(null)} className="px-8 py-3 bg-[#10408A] text-white rounded-2xl font-black shadow-lg text-sm">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] sm:rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <form onSubmit={handleAddUser} className="flex flex-col h-full">
              <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Новый пользователь</h3>
                <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 p-2"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-6 sm:p-8 space-y-4 overflow-y-auto">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" className="px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                </div>
                {role === 'listener' && (
                  <>
                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Кафедра" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                    <input type="text" value={stream} onChange={(e) => setStream(e.target.value)} placeholder="Поток" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                  </>
                )}
                {role === 'listener' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Начало цикла</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Конец цикла</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRole('listener')} className={`flex-1 py-3 rounded-xl font-bold text-xs border-2 ${role === 'listener' ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-slate-50 text-slate-400 border-transparent'}`}>Преп</button>
                  <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-3 rounded-xl font-bold text-xs border-2 ${role === 'admin' ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-slate-50 text-slate-400 border-transparent'}`}>Админ</button>
                </div>
              </div>
              <div className="p-6 sm:p-8 bg-slate-50/50 flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 font-bold text-slate-400 text-sm">Отмена</button>
                <button type="submit" className="flex-1 py-4 bg-[#10408A] text-white rounded-2xl font-black shadow-lg text-sm">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
