
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskResult, LessonFile, Review, User } from '../types';

interface ReviewViewProps {
  tasks: Task[];
  submissions: Record<string, Record<string, TaskResult>>;
  onSaveGrade: (taskId: string, result: TaskResult, userId: string) => void;
  users: User[]; // Добавлено для получения информации о потоках
}

const ReviewView: React.FC<ReviewViewProps & { users: User[] }> = ({ tasks, submissions, onSaveGrade, users }) => {
  const sessionUser = JSON.parse(localStorage.getItem('edugen_session') || '{}') as User;
  
  const [selectedSubKey, setSelectedSubKey] = useState<string | null>(null);
  const [grade, setGrade] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<number, string>>({});
  
  // Новые состояния для фильтрации и вкладок
  const [streamFilter, setStreamFilter] = useState('all');
  const [viewTab, setViewTab] = useState<'pending' | 'all'>('pending');

  const uniqueStreams = useMemo(() => {
    return Array.from(new Set(users.map(u => u.stream).filter(Boolean))).sort();
  }, [users]);

  const allSubmissionsFlat = useMemo(() => {
    const flat: (TaskResult & { userId: string, userName: string, userStream: string, userDept: string })[] = [];
    Object.entries(submissions).forEach(([userId, userSubmissions]) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      Object.values(userSubmissions).forEach(sub => {
        flat.push({ 
          ...sub, 
          userId, 
          userName: user.name, 
          userStream: user.stream,
          userDept: user.department
        });
      });
    });
    return flat;
  }, [submissions, users]);

  const filteredSubmissions = useMemo(() => {
    return allSubmissionsFlat.filter(sub => {
      // Фильтр по потоку
      const matchesStream = streamFilter === 'all' || sub.userStream === streamFilter;
      if (!matchesStream) return false;

      // Фильтр по вкладке
      if (viewTab === 'pending') {
        const alreadyReviewedByMe = sub.reviews?.some(r => r.adminId === sessionUser.id);
        return !alreadyReviewedByMe;
      }
      return true;
    });
  }, [allSubmissionsFlat, streamFilter, viewTab, sessionUser.id]);

  // Fix: use allSubmissionsFlat to include userName and userStream in selectedSubmission
  const selectedSubmission = useMemo(() => {
    if (!selectedSubKey) return null;
    const [userId, taskId] = selectedSubKey.split('_');
    return allSubmissionsFlat.find(s => s.userId === userId && s.taskId === taskId) || null;
  }, [selectedSubKey, allSubmissionsFlat]);

  const selectedTask = useMemo(() => {
    if (!selectedSubKey) return null;
    const taskId = selectedSubKey.split('_')[1];
    return tasks.find(t => t.id === taskId);
  }, [selectedSubKey, tasks]);

  useEffect(() => {
    setActiveFileIndex(null);
    Object.values(fileUrls).forEach(URL.revokeObjectURL);
    setFileUrls({});
    
    const myReview = selectedSubmission?.reviews?.find(r => r.adminId === sessionUser.id);
    if (myReview) {
      setGrade(myReview.grade);
      setComment(myReview.comment || '');
    } else {
      setGrade(5);
      setComment('');
    }
  }, [selectedSubKey, selectedSubmission, sessionUser.id]);

  useEffect(() => {
    if (activeFileIndex !== null && selectedSubmission?.files?.[activeFileIndex]) {
      const file = selectedSubmission.files[activeFileIndex];
      if (!fileUrls[activeFileIndex]) {
        try {
          const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
          const binaryString = window.atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: file.type });
          const url = URL.createObjectURL(blob);
          setFileUrls(prev => ({ ...prev, [activeFileIndex]: url }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [activeFileIndex, selectedSubmission, fileUrls]);

  const handleGrade = () => {
    if (!selectedSubKey || !selectedSubmission) return;
    const [userId, taskId] = selectedSubKey.split('_');
    
    const newReview: Review = {
      adminId: sessionUser.id,
      adminName: sessionUser.name,
      grade: grade,
      comment: comment,
      timestamp: Date.now()
    };

    const existingReviews = selectedSubmission.reviews || [];
    const otherReviews = existingReviews.filter(r => r.adminId !== sessionUser.id);
    const updatedReviews = [...otherReviews, newReview];

    // Fix: Remove joined UI properties before creating TaskResult
    const { userName: _, userStream: __, userId: ___, userDept: ____, ...pureTaskResult } = selectedSubmission;

    const updatedSubmission: TaskResult = {
      ...pureTaskResult,
      reviews: updatedReviews,
      status: updatedReviews.length >= 5 ? 'graded' : 'pending',
      timestamp: Date.now()
    };

    onSaveGrade(taskId, updatedSubmission, userId);
    
    // ИСПРАВЛЕНО: Закрываем окно после сохранения
    alert(existingReviews.some(r => r.adminId === sessionUser.id) ? "Оценка обновлена!" : "Оценка сохранена!");
    setSelectedSubKey(null);
  };

  const renderFileContent = (file: LessonFile, index: number) => {
    const source = fileUrls[index] || file.data;
    const { type, name } = file;
    if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center bg-slate-100 rounded-2xl overflow-hidden p-2">
          <img src={source} alt={name} className="max-w-full max-h-[70vh] object-contain shadow-md rounded-xl cursor-zoom-in" onClick={() => window.open(source, '_blank')} />
        </div>
      );
    }
    if (type === 'application/pdf') {
      return <div className="h-[600px] bg-slate-200 rounded-2xl overflow-hidden border border-slate-300"><iframe src={source} className="w-full h-full" title={name} /></div>;
    }
    return <div className="p-10 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl"><p className="text-slate-600 font-bold mb-4">Предпросмотр недоступен для "{name}"</p><a href={source} download={name} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#10408A] text-white rounded-xl font-bold">Скачать</a></div>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Проверка заданий</h2>
          <p className="text-slate-500 dark:text-slate-400">Для итоговой оценки требуется минимум 5 отзывов от разных администраторов</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm w-full md:w-auto overflow-x-auto">
          <select 
            value={streamFilter} 
            onChange={(e) => setStreamFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700 dark:text-white border-none rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#10408A] min-w-[120px]"
          >
            <option value="all">Все потоки</option>
            {uniqueStreams.map(s => (
              <option key={s} value={s}>Поток: {s}</option>
            ))}
          </select>
          <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-600 hidden md:block"></div>
          <button 
            onClick={() => setViewTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${viewTab === 'pending' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/10' : 'text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            К проверке
          </button>
          <button 
            onClick={() => setViewTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${viewTab === 'all' ? 'bg-[#10408A] text-white shadow-lg shadow-[#10408A]/10' : 'text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Все работы
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest px-2 flex items-center justify-between">
            <span>{viewTab === 'pending' ? 'Ваша очередь' : 'Список работ'} ({filteredSubmissions.length})</span>
          </h3>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredSubmissions.map(sub => {
              const task = tasks.find(t => t.id === sub.taskId);
              const subKey = `${sub.userId}_${sub.taskId}`;
              const reviewCount = sub.reviews?.length || 0;
              const myReview = sub.reviews?.find(r => r.adminId === sessionUser.id);
              
              return (
                <button
                  key={subKey}
                  onClick={() => setSelectedSubKey(subKey)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all relative ${selectedSubKey === subKey ? 'bg-[#10408A] text-white border-[#10408A] shadow-xl scale-[1.02]' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600 hover:border-[#10408A]/30'}`}
                >
                  {myReview && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">ОЦЕНЕНО: {myReview.grade}</div>
                    </div>
                  )}
                  <p className="font-bold truncate pr-16">{task?.title || 'Задание удалено'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold truncate ${selectedSubKey === subKey ? 'text-[#FFFFFF]/70' : 'text-slate-900 dark:text-white'}`}>{sub.userName}</p>
                      <p className={`text-[9px] font-medium ${selectedSubKey === subKey ? 'text-[#FFFFFF]/50' : 'text-slate-400 dark:text-slate-300'}`}>Кафедра: {sub.userDept}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ml-2 ${selectedSubKey === subKey ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                       {reviewCount} / 5
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredSubmissions.length === 0 && (
              <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-[32px] p-12 text-center text-slate-400 dark:text-slate-300 font-bold">Работ не найдено</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedSubKey && selectedSubmission && selectedTask ? (
            <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{selectedTask.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">Всего отзывов: {selectedSubmission.reviews?.length || 0}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedSubKey(null)} className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-white">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="p-8 space-y-10">
                <div className="p-6 bg-[#10408A]/5 rounded-3xl border border-[#10408A]/10">
                   <p className="text-[10px] font-black text-[#10408A] dark:text-[#6ba3f5] uppercase tracking-widest mb-2">Автор работы</p>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-[#10408A] text-white rounded-xl flex items-center justify-center font-bold">
                       {selectedSubmission.userName?.charAt(0)}
                     </div>
                     <div>
                       <p className="font-bold text-slate-900 dark:text-white">{selectedSubmission.userName}</p>
                       <p className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase">{selectedSubmission.userDept} • Поток {selectedSubmission.userStream}</p>
                     </div>
                   </div>
                </div>

                {selectedSubmission.response && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Ответ преподавателя</label>
                    <div className="p-6 bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded-3xl border border-slate-100 dark:border-slate-600 text-slate-800 leading-relaxed prose dark:prose-invert max-w-none shadow-sm" dangerouslySetInnerHTML={{ __html: selectedSubmission.response }} />
                  </div>
                )}

                {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1 block">Прикрепленные файлы ({selectedSubmission.files.length})</label>
                    <div className="grid gap-4">
                      {selectedSubmission.files.map((file, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-[24px] overflow-hidden shadow-sm transition-all hover:border-[#10408A]/30">
                          <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 min-w-0 gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 bg-[#10408A] rounded-xl text-white shadow-lg shadow-[#10408A]/10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                              <div className="min-w-0">
                                <span className="text-sm font-black block truncate text-slate-900 dark:text-white">{file.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-bold uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => setActiveFileIndex(activeFileIndex === idx ? null : idx)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${activeFileIndex === idx ? 'bg-[#10408A] text-white border-[#10408A]' : 'bg-white dark:bg-slate-700 text-[#10408A] dark:text-[#6ba3f5] border-slate-100 dark:border-slate-600 hover:border-[#10408A]'}`}>{activeFileIndex === idx ? 'Закрыть' : 'Просмотр'}</button>
                              <a href={fileUrls[idx] || file.data} download={file.name} className="px-4 py-2 rounded-xl text-xs font-black transition-all border bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-100 dark:border-slate-600 hover:border-[#10408A] hover:text-[#10408A] dark:hover:text-[#6ba3f5]">
                                Скачать
                              </a>
                            </div>
                          </div>
                          {activeFileIndex === idx && <div className="p-4 border-t border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-800 animate-in slide-in-from-top-4 duration-300">{renderFileContent(file, idx)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-10 border-t border-slate-100 dark:border-slate-600 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest block ml-1">Ваша оценка (1-5)</label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button key={num} onClick={() => setGrade(num)} className={`w-14 h-14 rounded-2xl text-xl font-black transition-all ${grade === num ? 'bg-[#10408A] text-white shadow-xl shadow-[#10408A]/10 scale-110 ring-4 ring-[#10408A]/5' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>{num}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1 block">Ваш комментарий (анонимно)</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Напишите конструктивный отзыв..." rows={4} className="w-full px-6 py-5 rounded-[24px] border border-slate-200 dark:border-slate-600 focus:ring-4 focus:ring-[#10408A]/5 focus:border-[#10408A] outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 resize-none font-medium text-slate-700 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-700 dark:placeholder:text-slate-400" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setSelectedSubKey(null)} className="px-8 py-3.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">Отмена</button>
                    <button onClick={handleGrade} className="bg-[#10408A] text-white px-12 py-3.5 rounded-[20px] font-black hover:bg-[#0d336e] transition-all shadow-2xl shadow-[#10408A]/20 active:scale-95">
                      {selectedSubmission.reviews?.some(r => r.adminId === sessionUser.id) ? 'Обновить мою оценку' : 'Сохранить мой отзыв'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-white rounded-[48px] border-2 border-dashed border-slate-100 text-center animate-in fade-in duration-700">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 text-slate-200"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
              <h4 className="text-xl font-black text-slate-300">Выберите работу из списка</h4>
              <p className="text-slate-300 text-sm max-w-xs mt-2 font-medium">Здесь вы сможете оставить свой отзыв или изменить ранее выставленную оценку. Итоговая оценка сформируется автоматически после 5 проверок.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewView;
