import React, { useState } from 'react';
import { ScheduleItem, Lesson, User } from '../types';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

/** Показывает время в формате HH:MM (как в таблице; для ISO — локальное время) */
function formatStartTime(val: string | undefined | null): string {
  if (val == null) return '09:00';
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      const m = d.getMinutes();
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    let fraction = n >= 1 ? n - Math.floor(n) : n;
    if (fraction < 0 || fraction >= 1) fraction = fraction - Math.floor(fraction);
    const totalM = Math.round(fraction * 24 * 60);
    const h = Math.floor(totalM / 60) % 24;
    const m = totalM % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '09:00';
}

interface ScheduleViewProps {
  schedule: ScheduleItem[];
  lessons: Lesson[];
  users: User[];
  isAdmin?: boolean;
  onSave: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onNavigateToLesson?: (lesson: Lesson) => void;
}

const emptyItem = (): ScheduleItem => ({
  id: 'new_' + Date.now(),
  dayOfWeek: 1,
  lessonId: '',
  durationHours: 1,
  startTime: '09:00',
  curators: [],
});

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, lessons, users, isAdmin = false, onSave, onDelete, onNavigateToLesson }) => {
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<ScheduleItem>(emptyItem());

  const startEdit = (item: ScheduleItem) => {
    setEditing(item);
    setForm({ ...item, startTime: formatStartTime(item.startTime) });
    setFormVisible(true);
  };

  const startNew = () => {
    setEditing(null);
    setForm(emptyItem());
    setFormVisible(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormVisible(false);
  };

  const saveItem = () => {
    if (!form.lessonId) {
      alert('Выберите занятие');
      return;
    }
    onSave(form);
    cancelEdit();
  };

  const toggleCurator = (userId: string) => {
    const name = users.find(u => u.id === userId)?.name ?? userId;
    setForm(prev => ({
      ...prev,
      curators: prev.curators.includes(name)
        ? prev.curators.filter(c => c !== name)
        : [...prev.curators, name],
    }));
  };

  const scheduleByDay = (day: number) => schedule
    .filter(s => s.dayOfWeek === day)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-0">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Расписание занятий</h2>
        {isAdmin && !formVisible && (
          <button
            onClick={startNew}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            + Добавить в расписание
          </button>
        )}
      </div>

      {/* Форма добавления/редактирования */}
      {isAdmin && formVisible && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editing ? 'Редактировать запись' : 'Новая запись в расписании'}
            </h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">День недели</label>
              <select
                value={form.dayOfWeek}
                onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#10408A] focus:ring-indigo-500 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <option key={d} value={d}>{DAY_NAMES[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Занятие</label>
              <select
                value={form.lessonId}
                onChange={e => setForm(f => ({ ...f, lessonId: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#10408A] focus:ring-indigo-500 outline-none"
              >
                <option value="">— Выберите занятие —</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Продолжительность (часов)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={form.durationHours}
                onChange={e => setForm(f => ({ ...f, durationHours: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#10408A] focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Время начала</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value || '09:00' }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#10408A] focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Кураторы (только администраторы)</label>
              <div className="flex flex-wrap gap-2">
                {users.filter(u => u.role === 'admin').map(u => (
                  <label key={u.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600">
                    <input
                      type="checkbox"
                      checked={form.curators.includes(u.name)}
                      onChange={() => toggleCurator(u.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                  </label>
                ))}
                {users.filter(u => u.role === 'admin').length === 0 && <span className="text-slate-500 text-sm">Нет администраторов для выбора кураторов</span>}
              </div>
            </div>
          </div>
          <div className="p-6 pt-0 flex items-center justify-end gap-3">
            <button onClick={cancelEdit} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Отмена
            </button>
            <button onClick={saveItem} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Мобильная версия: компактные карточки по дням */}
      <div className="space-y-4 sm:hidden">
        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const items = scheduleByDay(day);
          if (items.length === 0 && schedule.length > 0) return null;
          return (
            <div key={day} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 font-bold text-slate-800 dark:text-slate-200 text-sm">
                {DAY_NAMES[day]}
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.length === 0 ? (
                  <li className="px-3 py-4 text-slate-500 dark:text-slate-400 text-sm">Нет занятий</li>
                ) : (
                  items.map(item => {
                    const lesson = lessons.find(l => l.id === item.lessonId);
                    const title = lesson?.title ?? item.lessonId;
                    const curatorsStr = item.curators.length ? item.curators.join(', ') : '—';
                    return (
                      <li key={item.id} className="px-3 py-2.5 flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {lesson && onNavigateToLesson && !isAdmin ? (
                            <button type="button" onClick={() => onNavigateToLesson(lesson)} className="text-left text-[#10408A] dark:text-[#6ba3f5] font-bold text-sm leading-tight line-clamp-2">
                              {title}
                            </button>
                          ) : (
                            <span className="text-slate-900 dark:text-white font-medium text-sm leading-tight line-clamp-2">{title}</span>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatStartTime(item.startTime)}</span>
                            <span>·</span>
                            <span>{item.durationHours} ч</span>
                            {curatorsStr !== '—' && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[180px]" title={curatorsStr}>{curatorsStr}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-[#6ba3f5] rounded-lg" title="Изменить">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg" title="Удалить">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Таблица по дням (планшеты и десктоп) */}
      <div className="hidden sm:block space-y-6">
        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const items = scheduleByDay(day);
          if (items.length === 0 && schedule.length > 0) return null;
          return (
            <div key={day} className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                {DAY_NAMES[day]}
              </div>
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full text-left table-fixed text-sm sm:text-base" style={{ minWidth: '720px' }}>
                  <colgroup>
                    <col />
                    <col style={{ width: '5.5rem' }} />
                    <col style={{ width: '8rem' }} />
                    <col />
                    {isAdmin && <col style={{ width: '6rem' }} />}
                  </colgroup>
                  <thead>
                    <tr className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-600">
                      <th className="px-4 py-3 text-left align-bottom">Занятие</th>
                      <th className="px-4 py-3 text-center align-bottom whitespace-nowrap">Начало</th>
                      <th className="px-4 py-3 text-center align-bottom whitespace-nowrap" style={{ minWidth: '8rem' }}>Длительность</th>
                      <th className="px-4 py-3 text-left align-bottom">Кураторы</th>
                      {isAdmin && <th className="px-4 py-3 text-center align-bottom whitespace-nowrap w-24">Действия</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-slate-500 dark:text-slate-400 text-sm">
                          Нет занятий в этот день
                        </td>
                      </tr>
                    ) : (
                      items.map(item => {
                        const lesson = lessons.find(l => l.id === item.lessonId);
                        return (
                          <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white align-top">
                              {lesson && onNavigateToLesson && !isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToLesson(lesson)}
                                  className="text-left text-[#10408A] hover:underline font-bold"
                                >
                                  {lesson.title}
                                </button>
                              ) : (
                                <span>{lesson?.title ?? item.lessonId}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-center align-top whitespace-nowrap w-[5.5rem]">{formatStartTime(item.startTime)}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-center align-top whitespace-nowrap" style={{ minWidth: '8rem' }}>{item.durationHours} ч</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm align-top">
                              {item.curators.length ? item.curators.join(', ') : '—'}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-center align-top">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-[#6ba3f5] hover:bg-indigo-50 dark:hover:bg-[#10408A]/20 rounded-lg transition-colors"
                                    title="Изменить"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Удалить"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {schedule.length === 0 && !(isAdmin && formVisible) && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Расписание пусто. Нажмите «Добавить в расписание», чтобы создать первую запись.
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
