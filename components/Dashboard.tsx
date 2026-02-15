
import React from 'react';
import { Lesson } from '../types';

interface DashboardProps {
  lessons: Lesson[];
  isAdmin: boolean;
  daysLeft?: number | null;
  totalDays?: number;
  completedLessons?: number;
  totalLessons?: number;
  onViewLesson: (lesson: Lesson) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onCreateNew: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ lessons, isAdmin, daysLeft, totalDays, completedLessons = 0, totalLessons = 0, onViewLesson, onEditLesson, onDeleteLesson, onCreateNew }) => {
  const cleanText = (val: string) => {
    return val
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Ваши занятия</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Доступные учебные материалы и тесты</p>
        </div>
        {isAdmin && (
          <button 
            onClick={onCreateNew}
            className="bg-[#10408A] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#0d336e] transition-all shadow-md active:scale-95 text-sm sm:text-base"
          >
            Создать занятие
          </button>
        )}
      </div>

      {!isAdmin && (typeof daysLeft === 'number' || (totalLessons > 0 && typeof completedLessons === 'number')) && (
        <div className="mx-2 sm:mx-0 space-y-4">
          {totalLessons > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Прогресс по занятиям</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#10408A] rounded-full transition-all duration-500" 
                    style={{ width: `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%` }} 
                  />
                </div>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {completedLessons}/{totalLessons}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {completedLessons === totalLessons ? 'Все занятия пройдены' : `Осталось пройти ${totalLessons - completedLessons} ${totalLessons - completedLessons === 1 ? 'занятие' : 'занятий'}`}
              </p>
            </div>
          )}
          {typeof daysLeft === 'number' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">До завершения цикла</p>
                <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalDays != null ? `${totalDays}/${daysLeft} дн. осталось` : (daysLeft > 0 ? `${daysLeft} дн.` : 'Сегодня последний день')}
                </p>
              </div>
              <div className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest ${daysLeft <= 7 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                {daysLeft <= 7 ? 'Срочно' : 'Время есть'}
              </div>
            </div>
          )}
        </div>
      )}

      {(!lessons || lessons.length === 0) ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-8 sm:p-12 text-center mx-2 sm:mx-0">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Нет доступных занятий</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Как только занятия появятся, они отобразятся здесь</p>
          {isAdmin && (
            <button 
              onClick={onCreateNew}
              className="bg-[#10408A] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#0d336e] transition-all shadow-md active:scale-95"
            >
              Создать занятие
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
          {lessons.map((lesson) => (
            <div 
              key={lesson.id} 
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden"
            >
              <div className="relative h-40 sm:h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                {lesson.coverImage ? (
                  <>
                    <img src={lesson.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-slate-900/10 to-transparent"></div>
                    <img src={lesson.coverImage} alt={lesson.title} className="relative z-10 w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#10408A]/20 to-[#10408A]/5 flex items-center justify-center">
                    <svg className="w-12 h-12 text-[#10408A]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2 py-1 rounded-lg bg-[#10408A]/10 dark:bg-[#10408A]/20 text-[#10408A] dark:text-[#6ba3f5] text-[10px] font-bold uppercase tracking-wider">Занятие</span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditLesson(lesson); }} 
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#10408A] dark:hover:text-[#6ba3f5] rounded-lg transition-colors" 
                        title="Редактировать"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteLesson(lesson.id); }} 
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors" 
                        title="Удалить"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-[#10408A] transition-colors">
                  {lesson.title || 'Без названия'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 mb-4">
                  {cleanText(String(lesson.description || '')) || 'Описание отсутствует'}
                </p>
                <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {(lesson.questions || []).length} вопросов
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {(lesson.files || []).length} вложений
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
                <button 
                  onClick={() => onViewLesson(lesson)}
                  className="w-full text-center py-3 sm:py-2 text-xs sm:text-sm font-semibold text-[#10408A] hover:text-[#0d336e] dark:text-[#6ba3f5] dark:hover:text-[#a8c8f5] transition-colors min-h-[48px] flex items-center justify-center"
                >
                  Открыть занятие →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
