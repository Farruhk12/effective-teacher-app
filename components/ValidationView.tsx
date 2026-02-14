import React, { useMemo, useState } from 'react';
import { Lesson, Question, TestResult } from '../types';
import TestBuilder from './TestBuilder';

type ValidationLevel = 'easy' | 'good' | 'hard';

interface ValidationItem {
  key: string;
  lessonId: string;
  lessonTitle: string;
  question: Question;
  total: number;
  correct: number;
  accuracy: number;
  level: ValidationLevel;
  needsMoreData: boolean;
}

interface ValidationViewProps {
  lessons: Lesson[];
  lessonResults: Record<string, Record<string, TestResult>>;
  onUpdateQuestion: (lessonId: string, question: Question) => void;
}

const ValidationView: React.FC<ValidationViewProps> = ({ lessons, lessonResults, onUpdateQuestion }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [editor, setEditor] = useState<{ lessonId: string; question: Question } | null>(null);

  const lessonsWithTests = useMemo(() => lessons.filter(l => (l.questions || []).length > 0), [lessons]);

  const items = useMemo<ValidationItem[]>(() => {
    const questionMap = new Map<string, { lessonId: string; lessonTitle: string; question: Question }>();
    lessonsWithTests.forEach(lesson => {
      (lesson.questions || []).forEach(q => {
        questionMap.set(`${lesson.id}:${q.id}`, { lessonId: lesson.id, lessonTitle: lesson.title, question: q });
      });
    });

    const stats: Record<string, { total: number; correct: number }> = {};
    Object.values(lessonResults).forEach(userResults => {
      Object.entries(userResults || {}).forEach(([lessonId, result]) => {
        if (result?.invalidated) return;
        if (!result?.answers || result.answers.length === 0) return;
        result.answers.forEach(ans => {
          const key = `${lessonId}:${ans.questionId}`;
          if (!questionMap.has(key)) return;
          if (!stats[key]) stats[key] = { total: 0, correct: 0 };
          stats[key].total += 1;
          if (ans.isCorrect) stats[key].correct += 1;
        });
      });
    });

    return Array.from(questionMap.entries()).map(([key, info]) => {
      const total = stats[key]?.total || 0;
      const correct = stats[key]?.correct || 0;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const needsMoreData = total < 10;
      let level: ValidationLevel = 'good';
      if (total >= 10 && correct === total) level = 'easy';
      else if (total >= 10 && correct === 0) level = 'hard';
      return {
        key,
        lessonId: info.lessonId,
        lessonTitle: info.lessonTitle,
        question: info.question,
        total,
        correct,
        accuracy,
        level,
        needsMoreData
      };
    });
  }, [lessonsWithTests, lessonResults]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesLesson = lessonFilter === 'all' || item.lessonId === lessonFilter;
      const matchesSearch = item.question.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLesson && matchesSearch;
    });
  }, [items, lessonFilter, searchQuery]);

  const easyItems = useMemo(() => filteredItems.filter(i => i.level === 'easy'), [filteredItems]);
  const goodItems = useMemo(() => filteredItems.filter(i => i.level === 'good'), [filteredItems]);
  const hardItems = useMemo(() => filteredItems.filter(i => i.level === 'hard'), [filteredItems]);

  const levelBadge = (level: ValidationLevel) => {
    if (level === 'easy') return 'bg-emerald-100 text-emerald-700';
    if (level === 'hard') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const levelLabel = (level: ValidationLevel) => {
    if (level === 'easy') return 'Легкие';
    if (level === 'hard') return 'Сложные';
    return 'Хорошие';
  };

  const renderSection = (title: string, list: ValidationItem[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{title}</h3>
        <span className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">{list.length} шт.</span>
      </div>
      {list.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-600 text-slate-400 dark:text-slate-300 text-sm font-bold">
          Нет вопросов по выбранным фильтрам.
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map(item => (
            <div key={item.key} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">{item.lessonTitle}</p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1 break-words">{item.question.text}</p>
                </div>
                <button
                  onClick={() => setEditor({ lessonId: item.lessonId, question: item.question })}
                  className="shrink-0 px-3 py-2 text-xs font-black uppercase tracking-widest bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                >
                  Редактировать
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${levelBadge(item.level)}`}>
                  {levelLabel(item.level)}
                </span>
                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
                  Точность {item.accuracy}%
                </span>
                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
                  Попытки {item.total}
                </span>
                {item.needsMoreData && (
                  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300">
                    Недостаточно данных
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Валидация тестов</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Легкие — 10/10 правильных, сложные — 0/10, остальные в категории хорошие.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Легкие</p>
          <p className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{easyItems.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Хорошие</p>
          <p className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{goodItems.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Сложные</p>
          <p className="text-xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{hardItems.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4">
        <div className="relative w-full md:flex-1">
          <input
            type="text"
            placeholder="Поиск по тексту вопроса..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 rounded-xl sm:rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-[#10408A] outline-none transition-all font-medium text-sm"
          />
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={lessonFilter}
            onChange={(e) => setLessonFilter(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-600 border-none"
          >
            <option value="all">Все занятия</option>
            {lessonsWithTests.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      </div>

      {renderSection('Легкие тесты', easyItems)}
      {renderSection('Хорошие тесты', goodItems)}
      {renderSection('Сложные тесты', hardItems)}

      {editor && (
        <TestBuilder
          initialData={editor.question}
          onAdd={(q) => {
            onUpdateQuestion(editor.lessonId, q);
            setEditor(null);
          }}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
};

export default ValidationView;
