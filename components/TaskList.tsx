
import React from 'react';
import { Task, TaskResult } from '../types';

interface TaskListProps {
  tasks: Task[];
  isAdmin: boolean;
  currentUserId?: string;
  taskResults?: Record<string, Record<string, TaskResult>>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onSolveTask: (task: Task) => void;
  onCreateNew: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, isAdmin, currentUserId, taskResults, onEditTask, onDeleteTask, onSolveTask, onCreateNew }) => {
  const getUserResult = (taskId: string) => {
    if (!currentUserId || !taskResults) return null;
    return taskResults[currentUserId]?.[taskId] || null;
  };

  const getStatusLabel = (result: TaskResult | null) => {
    if (!result) return null;
    const hasReviews = (result.reviews || []).length > 0;
    return hasReviews ? 'Оценено' : 'Отправлено на проверку';
  };

  const getAverageGrade = (result: TaskResult | null) => {
    if (!result || !result.reviews || result.reviews.length === 0) return null;
    const sum = result.reviews.reduce((acc, curr) => acc + curr.grade, 0);
    return Math.round((sum / result.reviews.length) * 10) / 10;
  };
  const stripHtml = (val: string) => val.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Задания</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Список самостоятельных заданий для выполнения</p>
        </div>
        {isAdmin && (
          <button 
            onClick={onCreateNew}
            className="w-full sm:w-auto bg-[#10408A] text-white px-6 py-3 sm:py-2.5 rounded-xl font-semibold hover:bg-[#0d336e] transition-all shadow-md active:scale-95 min-h-[48px]"
          >
            + Создать задание
          </button>
        )}
      </div>

      {(!tasks || tasks.length === 0) ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Заданий пока нет</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Как только задания будут назначены, они появятся здесь</p>
          {isAdmin && (
            <button 
              onClick={onCreateNew}
              className="text-[#10408A] font-bold hover:underline"
            >
              Нажмите здесь, чтобы начать
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tasks.map((task) => (
            (() => {
              const res = getUserResult(task.id);
              const statusLabel = getStatusLabel(res);
              const avgGrade = getAverageGrade(res);
              return (
            <div key={task.id} className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all p-4 sm:p-6 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Задание</span>
                  {!isAdmin && statusLabel && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${avgGrade ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                      {statusLabel}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => onEditTask(task)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#10408A]" title="Редактировать">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => onDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-500" title="Удалить">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#10408A] transition-colors">{task.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-4 flex-1 mb-6">
                {stripHtml(task.description || '') || 'Описание отсутствует'}
              </p>

              {!isAdmin && avgGrade !== null && (
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                  Оценка: <span className="text-slate-900 dark:text-white">{avgGrade} из 5</span>
                </div>
              )}
              
              <div className="mt-auto space-y-4">
                <button 
                  onClick={() => onSolveTask(task)}
                  className="w-full py-2.5 bg-[#10408A]/10 dark:bg-[#10408A]/20 text-[#10408A] dark:text-[#6ba3f5] rounded-xl text-sm font-bold hover:bg-[#10408A] hover:text-white transition-all active:scale-95"
                >
                  {isAdmin ? 'Просмотреть →' : 'Выполнить →'}
                </button>
                <div className="pt-4 border-t border-slate-50 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Добавлено: {new Date(task.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
