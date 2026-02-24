import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lesson, LessonFile, TestResult, QuestionAnswer, TestAttempt } from '../types';

const ACTIVE_TEST_STORAGE_KEY = 'edugen_active_test';

interface SavedTestState {
  lessonId: string;
  startTime: number;
  testSeed: number;
  answerMap: Record<string, QuestionAnswer>;
  currentQuestionIndex: number;
  correctAnswersCount: number;
  totalQuestions: number;
}

function loadSavedTest(lessonId: string): SavedTestState | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_TEST_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedTestState;
    if (data.lessonId !== lessonId) return null;
    return data;
  } catch {
    return null;
  }
}

function clearSavedTest() {
  sessionStorage.removeItem(ACTIVE_TEST_STORAGE_KEY);
}

interface LessonDetailProps {
  lesson: Lesson;
  existingResult?: TestResult;
  onBack: () => void;
  onEdit?: () => void;
  onSaveResult: (lessonId: string, result: TestResult) => void;
  onTestInProgressChange?: (inProgress: boolean) => void;
}

const LessonDetail: React.FC<LessonDetailProps> = ({ lesson, existingResult, onBack, onEdit, onSaveResult, onTestInProgressChange }) => {
  const sessionUser = JSON.parse(localStorage.getItem('edugen_session') || '{}');
  const isAdmin = sessionUser.role === 'admin';

  const ensureArray = (val: any) => Array.isArray(val) ? val : [];

  const lessonFiles = useMemo(() => ensureArray(lesson.files), [lesson.files]);
  const lessonQuestions = useMemo(() => ensureArray(lesson.questions), [lesson.questions]);

  const [testSeed, setTestSeed] = useState(0);
  const activeQuestions = useMemo(() => {
    const allQuestions = lessonQuestions;
    if (allQuestions.length === 0) return [];
    if (isAdmin) return allQuestions;
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 20);
  }, [lesson.id, lessonQuestions, isAdmin, testSeed]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [testFinished, setTestFinished] = useState(!!existingResult);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [objectUrls, setObjectUrls] = useState<Record<number, string>>({});
  const [answerMap, setAnswerMap] = useState<Record<string, QuestionAnswer>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isRetake, setIsRetake] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const maxAttempts = 2;
  const [activeTab, setActiveTab] = useState<'description' | 'tests'>('description');
  const [testConfirmedStart, setTestConfirmedStart] = useState(false);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(20 * 60);
  const [showExitTestModal, setShowExitTestModal] = useState(false);
  const [showViolationWarningModal, setShowViolationWarningModal] = useState(false);
  const TEST_DURATION_SEC = 20 * 60;

  const existingHistory = useMemo<TestAttempt[]>(() => {
    if (!existingResult) return [];
    if (existingResult.attemptsHistory && existingResult.attemptsHistory.length > 0) {
      return existingResult.attemptsHistory;
    }
    return [{
      score: existingResult.score,
      total: existingResult.total,
      percentage: existingResult.percentage,
      passed: existingResult.passed,
      timestamp: existingResult.timestamp,
      answers: existingResult.answers,
      invalidated: existingResult.invalidated,
      invalidReason: existingResult.invalidReason
    }];
  }, [existingResult]);

  useEffect(() => {
    if (activePreviewIndex !== null && lessonFiles[activePreviewIndex] && !lessonFiles[activePreviewIndex].isLink && !objectUrls[activePreviewIndex]) {
      const file = lessonFiles[activePreviewIndex];
      try {
        const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: file.type });
        const url = URL.createObjectURL(blob);
        setObjectUrls(prev => ({ ...prev, [activePreviewIndex]: url }));
      } catch (e) { console.error(e); }
    }
  }, [activePreviewIndex, lessonFiles, objectUrls]);

  useEffect(() => {
    return () => { Object.values(objectUrls).forEach(URL.revokeObjectURL); };
  }, [objectUrls]);

  const didSwitchAwayRef = useRef(false);
  useEffect(() => {
    if (isAdmin || testFinished || !testConfirmedStart) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        didSwitchAwayRef.current = true;
        setTabSwitchCount(prev => prev + 1);
      } else {
        if (didSwitchAwayRef.current) {
          setShowViolationWarningModal(true);
          didSwitchAwayRef.current = false;
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isAdmin, testFinished, testConfirmedStart]);

  useEffect(() => {
    return () => {
      if (testConfirmedStart && !testFinished) onTestInProgressChange?.(false);
    };
  }, [testConfirmedStart, testFinished, onTestInProgressChange]);

  // Сохранение состояния теста при перезагрузке страницы
  useEffect(() => {
    if (isAdmin || !testConfirmedStart || testFinished || !testStartTime) return;
    const saved: SavedTestState = {
      lessonId: lesson.id,
      startTime: testStartTime,
      testSeed,
      answerMap,
      currentQuestionIndex,
      correctAnswersCount,
      totalQuestions: activeQuestions.length
    };
    sessionStorage.setItem(ACTIVE_TEST_STORAGE_KEY, JSON.stringify(saved));
  }, [isAdmin, testConfirmedStart, testFinished, testStartTime, lesson.id, testSeed, answerMap, currentQuestionIndex, correctAnswersCount, activeQuestions.length]);

  // Восстановление или аннулирование после перезагрузки
  const restoredForLessonRef = useRef<string | null>(null);
  useEffect(() => {
    if (isAdmin) return;
    const saved = loadSavedTest(lesson.id);
    if (!saved) {
      restoredForLessonRef.current = null;
      return;
    }
    const elapsed = (Date.now() - saved.startTime) / 1000;
    if (elapsed >= TEST_DURATION_SEC) {
      clearSavedTest();
      restoredForLessonRef.current = null;
      const attempt: TestAttempt = {
        score: 0,
        total: saved.totalQuestions || 20,
        percentage: 0,
        passed: false,
        timestamp: Date.now(),
        answers: [],
        invalidated: true,
        invalidReason: 'page-refresh'
      };
      const history = [...existingHistory, attempt];
      const result: TestResult = {
        score: 0,
        total: attempt.total,
        percentage: 0,
        passed: false,
        timestamp: attempt.timestamp,
        answers: [],
        attempts: history.length,
        invalidated: true,
        invalidReason: attempt.invalidReason,
        attemptsHistory: history
      };
      setLastResult(result);
      onSaveResult(lesson.id, result);
      setTestFinished(true);
      onTestInProgressChange?.(false);
      return;
    }
    if (restoredForLessonRef.current === lesson.id) return;
    restoredForLessonRef.current = lesson.id;
    setTestSeed(saved.testSeed);
    setTestStartTime(saved.startTime);
    setAnswerMap(saved.answerMap || {});
    setCurrentQuestionIndex(Math.min(saved.currentQuestionIndex ?? 0, 19));
    setCorrectAnswersCount(saved.correctAnswersCount ?? 0);
    setTestConfirmedStart(true);
    setTestFinished(false);
    setActiveTab('tests');
    onTestInProgressChange?.(true);
  }, [lesson.id, isAdmin, existingHistory, onSaveResult, onTestInProgressChange]);

  const handleSelect = (idx: number) => {
    if (isAnswered || testFinished || isAdmin) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);
    const currentQ = activeQuestions[currentQuestionIndex];
    if (currentQ && idx === currentQ.correctAnswerIndex) {
      setCorrectAnswersCount(prev => prev + 1);
    }
    if (currentQ) {
      setAnswerMap(prev => ({
        ...prev,
        [currentQ.id]: {
          questionId: currentQ.id,
          selectedIndex: idx,
          isCorrect: idx === currentQ.correctAnswerIndex
        }
      }));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    if (isAdmin) return;
    const finalScore = correctAnswersCount;
    const total = activeQuestions.length;
    const percentage = total > 0 ? Math.round((finalScore / total) * 100) : 0;
    const passed = percentage >= 50;
    // Fix: Explicitly cast Object.values result to QuestionAnswer[] to avoid 'unknown[]' error
    const answers = Object.values(answerMap) as QuestionAnswer[];
    const attempt: TestAttempt = { score: finalScore, total, percentage, passed, timestamp: Date.now(), answers };
    const history = [...existingHistory, attempt];
    const result: TestResult = {
      score: finalScore,
      total,
      percentage,
      passed,
      timestamp: attempt.timestamp,
      answers,
      attempts: history.length,
      attemptsHistory: history
    };
    setLastResult(result);
    onSaveResult(lesson.id, result);
    setTestFinished(true);
    onTestInProgressChange?.(false);
    clearSavedTest();
  };

  const invalidateTest = (reason: 'tab-switch' | 'user-exit' | 'page-refresh' = 'tab-switch') => {
    if (isAdmin || testFinished) return;
    setShowExitTestModal(false);
    const total = activeQuestions.length;
    // Fix: Explicitly cast Object.values result to QuestionAnswer[] to avoid 'unknown[]' error
    const answers = Object.values(answerMap) as QuestionAnswer[];
    const attempt: TestAttempt = {
      score: 0,
      total,
      percentage: 0,
      passed: false,
      timestamp: Date.now(),
      answers,
      invalidated: true,
      invalidReason: reason
    };
    const history = [...existingHistory, attempt];
    const result: TestResult = {
      score: attempt.score,
      total: attempt.total,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timestamp: attempt.timestamp,
      answers: attempt.answers,
      attempts: history.length,
      invalidated: attempt.invalidated,
      invalidReason: attempt.invalidReason,
      attemptsHistory: history
    };
    setLastResult(result);
    onSaveResult(lesson.id, result);
    setTestFinished(true);
    onTestInProgressChange?.(false);
    clearSavedTest();
  };

  useEffect(() => {
    if (tabSwitchCount > 3) {
      invalidateTest();
    }
  }, [tabSwitchCount]);

  useEffect(() => {
    if (!testStartTime || testFinished || isAdmin) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      const left = Math.max(0, TEST_DURATION_SEC - elapsed);
      setRemainingSeconds(left);
      if (left <= 0) {
        finishTest();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [testStartTime, testFinished, isAdmin]);

  const startRetake = () => {
    if (existingHistory.length >= maxAttempts) return;
    const ok = window.confirm('Повторная попытка доступна только один раз. Результат будет сохранен. Продолжить?');
    if (!ok) return;
    clearSavedTest();
    setIsRetake(true);
    setTestFinished(false);
    setTestConfirmedStart(false);
    setTestStartTime(null);
    setRemainingSeconds(TEST_DURATION_SEC);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectAnswersCount(0);
    setAnswerMap({});
    setTabSwitchCount(0);
    setLastResult(null);
    setTestSeed(prev => prev + 1);
  };

  const startTest = () => {
    setTestConfirmedStart(true);
    setTestStartTime(Date.now());
    setRemainingSeconds(TEST_DURATION_SEC);
    onTestInProgressChange?.(true);
  };

  const renderFilePreview = (file: LessonFile, index: number) => {
    if (file.isLink) {
       return (
         <div className="p-8 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl">
           <p className="font-bold text-lg text-slate-900 mb-4">{file.name}</p>
           <a href={file.data} target="_blank" rel="noopener noreferrer" className="inline-block px-10 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Перейти по ссылке →</a>
         </div>
       );
    }
    const { type, name, data } = file;
    const source = objectUrls[index] || data;
    if (type.startsWith('image/')) return <div className="flex justify-center bg-slate-100 rounded-xl overflow-hidden p-4"><img src={source} alt={name} className="max-w-full max-h-[500px] object-contain shadow-sm rounded-lg" /></div>;
    if (type === 'application/pdf') return <div className="h-[600px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200"><object data={source} type="application/pdf" className="w-full h-full" /></div>;
    if (type.startsWith('video/')) return <div className="bg-black rounded-xl overflow-hidden border border-slate-200"><video src={source} controls className="w-full max-h-[500px]" /></div>;
    return <div className="p-8 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl"><p className="font-bold">{name}</p><a href={source} download={name} className="mt-4 inline-block px-6 py-2 bg-[#10408A] text-white rounded-lg">Скачать</a></div>;
  };

  const displayResult = lastResult || existingResult;
  const currentHistory = (displayResult?.attemptsHistory && displayResult.attemptsHistory.length > 0) ? displayResult.attemptsHistory : existingHistory;
  const baseAttempts = currentHistory.length;
  const currentPercentage = displayResult ? displayResult.percentage : (activeQuestions.length > 0 ? Math.round((correctAnswersCount / activeQuestions.length) * 100) : 0);
  const currentQ = activeQuestions[currentQuestionIndex];
  const canRetry = baseAttempts < maxAttempts;
  const remainingSwitches = Math.max(0, 3 - tabSwitchCount);
  const currentAttemptNumber = Math.min(maxAttempts, baseAttempts + (testFinished ? 0 : 1));
  const testInProgress = testConfirmedStart && !testFinished && !isAdmin;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (testInProgress) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 pb-16 sm:pb-20 px-2 sm:px-0 animate-in fade-in duration-500">
        <div className="relative rounded-2xl sm:rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl border-2 sm:border-4 border-white bg-gradient-to-br from-[#10408A] to-[#0d336e] flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-10 md:px-12 py-5 sm:py-8 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight pr-4 min-w-0 flex-1">{lesson.title}</h2>
          <button
            type="button"
            onClick={() => setShowExitTestModal(true)}
            className="px-4 py-2.5 rounded-xl border-2 border-white/80 text-white text-sm font-bold hover:bg-white/20 transition-all whitespace-nowrap shrink-0"
          >
            Выйти из теста
          </button>
        </div>

        {/* Модалка: выход из теста — тест будет аннулирован */}
        {showExitTestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowExitTestModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-600 p-5 sm:p-8 max-w-md w-full text-center space-y-5 sm:space-y-6" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Если Вы выйдите, ваш тест будет аннулирован</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Результаты не сохранятся и попытка будет засчитана. Вы уверены?</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button onClick={() => setShowExitTestModal(false)} className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all min-h-[48px]">Остаться</button>
                <button onClick={() => invalidateTest('user-exit')} className="flex-1 py-4 px-6 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-rose-600 transition-all min-h-[48px]">Выйти</button>
              </div>
            </div>
          </div>
        )}

        {/* Модалка: предупреждение о нарушении (переключение вкладки) */}
        {showViolationWarningModal && tabSwitchCount >= 1 && tabSwitchCount <= 3 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowViolationWarningModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-600 p-5 sm:p-8 max-w-md w-full text-center space-y-5 sm:space-y-6" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Вы нарушили правила</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
                {3 - tabSwitchCount === 2 && 'Осталось 2 нарушения — после этого тест будет аннулирован.'}
                {3 - tabSwitchCount === 1 && 'Осталось 1 нарушение — при следующем переключении вкладки тест будет аннулирован.'}
                {3 - tabSwitchCount === 0 && 'При следующем переключении вкладки тест будет аннулирован.'}
              </p>
              <button onClick={() => setShowViolationWarningModal(false)} className="w-full py-4 px-6 bg-[#10408A] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-[#0d336e] transition-all min-h-[48px]">Понятно</button>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[32px] md:rounded-[40px] p-4 sm:p-10 border border-slate-200 dark:border-slate-600 shadow-sm">
          {(() => {
            const currentQ = activeQuestions[currentQuestionIndex];
            return (
              <>
                <div className="p-4 sm:p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black text-slate-900">Проверка усвоенного материала</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Вопрос {currentQuestionIndex + 1} из {activeQuestions.length}</p>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-10 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Баллы</p>
                      <p className="text-2xl sm:text-3xl font-black text-[#10408A]">{correctAnswersCount}</p>
                    </div>
                    <div className="w-px h-8 sm:h-10 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Время</p>
                      <p className="text-xl sm:text-2xl font-black text-slate-700 tabular-nums">{formatTime(remainingSeconds)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-8 md:p-12">
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold bg-amber-50 border-amber-200 text-amber-700">
                    Во время теста нельзя переключать вкладки или выходить из раздела. Нарушение приведёт к аннулированию теста.
                  </div>
                  <div className="space-y-6 sm:space-y-10">
                    <h4 className="text-lg sm:text-2xl font-black text-slate-900 flex items-start leading-snug sm:leading-tight">
                      <span className="bg-[#10408A] text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm mr-3 sm:mr-5 shrink-0 mt-0.5 sm:mt-1 shadow-lg shadow-[#10408A]/20">{currentQuestionIndex + 1}</span>
                      <span className="min-w-0">{currentQ?.text}</span>
                    </h4>
                    <div className="grid gap-3 sm:gap-4 pl-0 sm:pl-14">
                      {currentQ?.options.map((opt, oIdx) => {
                        const isSelected = selectedAnswer === oIdx;
                        const isCorrect = currentQ.correctAnswerIndex === oIdx;
                        let btnStyle = "bg-white border-slate-200 hover:border-[#10408A]/30 text-slate-700 shadow-sm";
                        if (isAnswered) {
                          if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-none";
                          else if (isSelected) btnStyle = "bg-rose-50 border-rose-500 text-rose-700 shadow-none";
                          else btnStyle = "bg-white opacity-40 border-slate-100";
                        }
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelect(oIdx)}
                            disabled={isAnswered}
                            className={`w-full text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all font-bold text-base sm:text-lg active:scale-[0.99] min-h-[48px] ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {isAnswered && (
                      <div className="pt-4 sm:pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {currentQuestionIndex === activeQuestions.length - 1 && (
                          <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-bold mb-3">Нажмите кнопку ниже, чтобы отправить ответы и завершить тест.</p>
                        )}
                        <button onClick={handleNext} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-[24px] font-black text-base sm:text-lg shadow-2xl transition-all active:scale-95 uppercase tracking-widest min-h-[48px]">
                          {currentQuestionIndex < activeQuestions.length - 1 ? 'Далее' : 'Завершить тест'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 pb-16 sm:pb-20 px-2 sm:px-0 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 sm:p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-[#10408A] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Вернуться к списку</span>
        </div>
        {isAdmin && onEdit && (
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#10408A] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#10408A]/20 hover:bg-[#0d336e] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Редактировать
          </button>
        )}
      </div>

      <div className="relative rounded-2xl sm:rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl border-2 sm:border-4 border-white bg-gradient-to-br from-[#10408A] to-[#0d336e] flex items-center px-4 sm:px-10 md:px-12 py-8 sm:py-12 md:py-16">
         <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">{lesson.title}</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[32px] md:rounded-[40px] p-4 sm:p-6 md:p-10 border border-slate-200 dark:border-slate-600 shadow-sm space-y-6 sm:space-y-10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('description')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'description' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Описание
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'tests' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Тесты
          </button>
        </div>

        {activeTab === 'description' && (
          <>
        <div className="prose prose-slate max-w-none">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Описание курса</h3>
          <div 
            className="text-slate-600 leading-relaxed text-lg prose prose-indigo max-w-none"
            dangerouslySetInnerHTML={{ __html: lesson.description || "Описание отсутствует." }}
          />
        </div>

        {lessonFiles.length > 0 && (
          <div className="pt-8 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Учебные материалы ({lessonFiles.length})</h4>
            <div className="grid gap-4">
              {lessonFiles.map((file, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-[24px] overflow-hidden transition-all hover:border-[#10408A]/30">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl text-white shadow-lg ${file.isLink ? 'bg-amber-500' : 'bg-[#10408A]'}`}>
                        {file.isLink ? (
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-base font-black truncate text-slate-900">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {file.isLink ? 'Внешний ресурс' : `${(file.size / 1024).toFixed(1)} KB • ${file.type}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setActivePreviewIndex(activePreviewIndex === idx ? null : idx)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm ${activePreviewIndex === idx ? 'bg-[#10408A] text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                      {activePreviewIndex === idx ? 'Закрыть' : (file.isLink ? 'Открыть' : 'Просмотр')}
                    </button>
                  </div>
                  {activePreviewIndex === idx && <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600 animate-in slide-in-from-top-4 duration-300">{renderFilePreview(file, idx)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
      
      {activeTab === 'tests' && activeQuestions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          {isAdmin ? (
            <div className="p-8 sm:p-12 space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Режим предварительного просмотра</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">Все вопросы ({activeQuestions.length} шт.) в исходном порядке. Правильные ответы отмечены зелёным. Преподавателям предлагаются случайные 20 вопросов.</p>
              </div>
              {(() => {
                const adminQ = activeQuestions[currentQuestionIndex];
                if (!adminQ) return null;
                return (
                  <div className="space-y-6">
                    <h4 className="text-xl font-black text-slate-900 flex items-start leading-tight">
                      <span className="bg-[#10408A] text-white w-10 h-10 rounded-xl flex items-center justify-center text-sm mr-4 shrink-0 mt-0.5">{currentQuestionIndex + 1}</span>
                      {adminQ.text}
                    </h4>
                    <div className="grid gap-3 pl-14">
                      {adminQ.options.map((opt, oIdx) => {
                        const isCorrect = adminQ.correctAnswerIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`w-full text-left p-5 rounded-2xl border-2 font-bold text-base ${isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                          >
                            {isCorrect && <span className="inline-block mr-2 text-emerald-600" aria-hidden>✓</span>}
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="pt-4 flex flex-wrap justify-center gap-2">
                {activeQuestions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border transition-all ${currentQuestionIndex === i ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-[#10408A]/50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : !testConfirmedStart && !testFinished ? (
            <div className="p-4 sm:p-8 md:p-12 max-w-2xl mx-auto">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl sm:rounded-[32px] p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                <h3 className="text-xl font-black text-slate-900">Перед началом теста</h3>
                <p className="text-slate-700 leading-relaxed">
                  Время на решение тестов — <strong>20 минут</strong> на 20 вопросов. Во время прохождения <strong>нельзя переключать вкладки</strong>, выходить из теста, отключать телефон или говорить по телефону. В этих случаях система зафиксирует нарушение и <strong>аннулирует ваш тест</strong>. Вы готовы решать тесты сейчас?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    onClick={startTest}
                    className="flex-1 py-4 px-6 bg-[#10408A] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-[#10408A]/20 hover:bg-[#0d336e] transition-all active:scale-95 min-h-[48px]"
                  >
                    Начать
                  </button>
                  <button
                    onClick={() => setActiveTab('description')}
                    className="flex-1 py-4 px-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest hover:border-slate-300 transition-all active:scale-95 min-h-[48px]"
                  >
                    Вернуться к теме
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 sm:p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-black text-slate-900">Проверка усвоенного материала</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Вопрос {testFinished ? activeQuestions.length : currentQuestionIndex + 1} из {activeQuestions.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Попытка: {currentAttemptNumber} из {maxAttempts}</p>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Баллы</p>
                    <p className="text-3xl font-black text-[#10408A]">{testFinished ? (existingResult ? existingResult.score : correctAnswersCount) : correctAnswersCount}</p>
                  </div>
                  <div className="w-[1px] h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Успех</p>
                    <p className={`text-3xl font-black ${currentPercentage >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>{currentPercentage}%</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-8 md:p-12">
                {!testFinished && (
                  <div className={`mb-4 sm:mb-6 p-3 sm:p-4 border rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold ${tabSwitchCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    {tabSwitchCount > 0
                      ? `Предупреждение: переключений вкладок ${tabSwitchCount}. Осталось ${remainingSwitches} до аннулирования.`
                      : 'Внимание: при переключении между вкладками более 3 раз тест будет аннулирован.'}
                  </div>
                )}
                {!testFinished ? (
                  <div className="space-y-6 sm:space-y-10">
                    <h4 className="text-lg sm:text-2xl font-black text-slate-900 flex items-start leading-snug sm:leading-tight">
                      <span className="bg-[#10408A] text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm mr-3 sm:mr-5 shrink-0 mt-0.5 sm:mt-1 shadow-lg shadow-[#10408A]/20">{currentQuestionIndex + 1}</span>
                      <span className="min-w-0">{currentQ?.text}</span>
                    </h4>
                    <div className="grid gap-3 sm:gap-4 pl-0 sm:pl-14">
                      {currentQ?.options.map((opt, oIdx) => {
                        const isSelected = selectedAnswer === oIdx;
                        const isCorrect = currentQ.correctAnswerIndex === oIdx;
                        let btnStyle = "bg-white border-slate-200 hover:border-[#10408A]/30 text-slate-700 shadow-sm";
                        if (isAnswered) {
                          if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-none";
                          else if (isSelected) btnStyle = "bg-rose-50 border-rose-500 text-rose-700 shadow-none";
                          else btnStyle = "bg-white opacity-40 border-slate-100";
                        }
                        return (
                          <button 
                            key={oIdx} 
                            onClick={() => handleSelect(oIdx)} 
                            disabled={isAnswered} 
                            className={`w-full text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all font-bold text-base sm:text-lg active:scale-[0.99] min-h-[48px] ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {isAnswered && (
                      <div className="pt-4 sm:pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {currentQuestionIndex === activeQuestions.length - 1 && (
                          <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-bold mb-3">Нажмите кнопку ниже, чтобы отправить ответы и завершить тест.</p>
                        )}
                        <button onClick={handleNext} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-[24px] font-black text-base sm:text-lg shadow-2xl transition-all active:scale-95 uppercase tracking-widest min-h-[48px]">
                          {currentQuestionIndex < activeQuestions.length - 1 ? 'Далее' : 'Завершить тест'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-10 space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-500">
                    <div className={`w-32 h-32 mx-auto rounded-[40px] flex items-center justify-center shadow-2xl ${currentPercentage >= 50 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={currentPercentage >= 50 ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">{currentPercentage >= 50 ? 'Поздравляем!' : 'Не совсем удачно'}</h3>
                      <p className="mt-4 text-slate-500 text-lg font-medium">Ваш итоговый результат: <span className="font-black text-[#10408A] text-2xl">{existingResult ? existingResult.score : correctAnswersCount}</span> из {activeQuestions.length}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 max-w-sm mx-auto space-y-2">
                      <p className="text-slate-500 text-sm font-bold leading-relaxed">Результат зафиксирован в системе.</p>
                      {canRetry ? (
                        <p className="text-slate-400 text-xs font-bold leading-relaxed">Доступна одна повторная попытка. Всего: {maxAttempts} попытки.</p>
                      ) : (
                        <p className="text-slate-400 text-xs font-bold leading-relaxed">Повторные попытки больше недоступны.</p>
                      )}
                      {displayResult?.invalidated && (
                        <p className="text-rose-500 text-xs font-black leading-relaxed">
                          {displayResult.invalidReason === 'page-refresh'
                            ? 'Попытка аннулирована из-за обновления страницы во время теста.'
                            : displayResult.invalidReason === 'user-exit'
                              ? 'Попытка аннулирована (вы вышли из теста).'
                              : 'Попытка аннулирована из-за переключения вкладок.'}
                        </p>
                      )}
                    </div>
                    {canRetry && (
                      <div className="pt-2">
                        <button onClick={startRetake} className="w-full sm:w-auto px-6 sm:px-10 py-4 bg-slate-900 text-white rounded-2xl sm:rounded-[24px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 min-h-[48px]">
                          Пройти повторно
                        </button>
                      </div>
                    )}
                    <div className="pt-4">
                      <button onClick={onBack} className="w-full sm:w-auto px-6 sm:px-12 py-4 sm:py-5 bg-[#10408A] text-white rounded-2xl sm:rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-[#10408A]/20 transition-all active:scale-95 min-h-[48px]">Вернуться в кабинет</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonDetail;