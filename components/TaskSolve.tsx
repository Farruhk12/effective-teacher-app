import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskResult, LessonFile } from '../types';

const RichTextEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current && !disabled) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string) => {
    if (disabled) return;
    document.execCommand(command, false);
    handleInput();
  };

  return (
    <div className={`border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#10408A] transition-all ${disabled ? 'opacity-80' : ''}`}>
      {!disabled && (
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1">
          <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 font-bold w-8 h-8 flex items-center justify-center text-slate-700">B</button>
          <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 italic w-8 h-8 flex items-center justify-center text-slate-700">I</button>
          <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 w-8 h-8 flex items-center justify-center text-slate-700">•</button>
        </div>
      )}
      <div 
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className={`w-full px-5 py-4 min-h-[250px] outline-none bg-white dark:bg-slate-800 prose dark:prose-invert prose-slate max-w-none ${disabled ? 'bg-slate-50/30' : ''}`}
      />
    </div>
  );
};

interface TaskSolveProps {
  task: Task;
  existingResult?: TaskResult;
  onCancel: () => void;
  onFinish: (taskId: string, result: TaskResult) => void;
}

const TaskSolve: React.FC<TaskSolveProps> = ({ task, existingResult, onCancel, onFinish }) => {
  const sessionUser = JSON.parse(localStorage.getItem('edugen_session') || '{}');
  const isAdmin = sessionUser.role === 'admin';

  const [response, setResponse] = useState(existingResult?.response || '');
  const [files, setFiles] = useState<LessonFile[]>(existingResult?.files || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activePreviewIndex !== null && files[activePreviewIndex]) {
      const file = files[activePreviewIndex];
      if (!fileUrls[activePreviewIndex]) {
        try {
          if (file.data.startsWith('data:')) {
            setFileUrls(prev => ({ ...prev, [activePreviewIndex]: file.data }));
          } else {
            const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: file.type });
            const url = URL.createObjectURL(blob);
            setFileUrls(prev => ({ ...prev, [activePreviewIndex]: url }));
          }
        } catch (e) { console.error(e); }
      }
    }
  }, [activePreviewIndex, files, fileUrls]);

  useEffect(() => {
    return () => { Object.values(fileUrls).forEach(URL.revokeObjectURL); };
  }, [fileUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdmin || existingResult) return;
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      // Fix: Add explicit File type to selectedFile in Array.from(selectedFiles).forEach
      Array.from(selectedFiles).forEach((selectedFile: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFiles(prev => [...prev, {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            data: event.target?.result as string
          }]);
        };
        reader.readAsDataURL(selectedFile);
      });
    }
  };

  const removeFile = (index: number) => {
    if (isAdmin || existingResult) return;
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIndex === index) setActivePreviewIndex(null);
  };

  const handleSubmit = () => {
    if (isAdmin || existingResult) return;
    if (!response.trim() && files.length === 0) {
      alert("Пожалуйста, напишите ответ или прикрепите хотя бы один файл.");
      return;
    }

    setIsSubmitting(true);
    const taskResult: TaskResult = {
      taskId: task.id,
      submitted: true,
      status: 'pending',
      reviews: [],
      response: response.trim(),
      files,
      timestamp: Date.now()
    };
    onFinish(task.id, taskResult);
    setIsSubmitting(false);
  };

  const renderFilePreview = (file: LessonFile, index: number) => {
    const source = fileUrls[index] || file.data;
    const { type, name } = file;
    if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center bg-slate-50 rounded-2xl overflow-hidden p-2">
          <img src={source} alt={name} className="max-w-full max-h-[400px] object-contain shadow-sm rounded-xl" />
        </div>
      );
    }
    if (type === 'application/pdf') {
      return <div className="h-[400px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200"><iframe src={source} className="w-full h-full" title={name} /></div>;
    }
    return <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl"><p className="text-sm font-bold mb-3 truncate w-full px-4">{name}</p><a href={source} download={name} className="inline-block px-4 py-2 bg-[#10408A] text-white rounded-lg text-xs font-bold">Скачать файл</a></div>;
  };

  const isSubmitted = !!existingResult;
  const reviews = existingResult?.reviews || [];
  const hasReviews = reviews.length > 0;
  const avgGrade = hasReviews ? Math.round((reviews.reduce((acc, curr) => acc + curr.grade, 0) / reviews.length) * 10) / 10 : null;
  const totalAdminsRequired = 5;
  const reviewedCount = reviews.length;
  const remainingCount = Math.max(0, totalAdminsRequired - reviewedCount);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onCancel}
          className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-[#10408A] transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-3xl font-black text-[#0E1C1C] tracking-tight truncate">
            {isAdmin ? 'Просмотр задания' : (isSubmitted ? 'Работа сдана' : 'Выполнение задания')}
          </h2>
        </div>
      </div>

      {/* Блок задания — условия сверху */}
      <div className="bg-[#10408A]/5 border-2 border-[#10408A]/20 rounded-3xl overflow-hidden shadow-lg">
        <div className="bg-[#10408A] px-6 py-4">
          <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">Задание</p>
          <h3 className="text-xl sm:text-2xl font-black text-white truncate mt-0.5">{task.title}</h3>
        </div>
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Описание задания</p>
            <div 
              className="text-slate-700 leading-relaxed prose prose-slate prose-sm max-w-none min-h-[80px] max-h-[400px] overflow-y-auto pr-2"
              dangerouslySetInnerHTML={{ __html: task.description || 'Описание отсутствует.' }}
            />
          </div>
        </div>
      </div>

      {/* Отправьте результат вашей работы — снизу */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-900">Отправьте результат вашей работы</h3>
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-600 shadow-sm space-y-8 relative overflow-hidden">
            {(isSubmitted || isAdmin) && !isAdmin && (
               <div className="absolute top-6 right-8 z-20">
                 {hasReviews ? (
                   <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">Оценено</span>
                 ) : (
                   <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">Отправлено на проверку</span>
                 )}
               </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Ваш ответ</label>
              <RichTextEditor 
                value={response}
                onChange={setResponse}
                disabled={isSubmitted || isAdmin}
                placeholder="Напишите решение или пояснение..."
              />
            </div>

            {isSubmitted && !isAdmin && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Статус проверки</p>
                  {hasReviews ? (
                    <span className="text-sm font-black text-indigo-600">
                      {reviewedCount >= totalAdminsRequired ? 'Итоговая оценка' : 'Предварительная оценка'}: {avgGrade} из 5
                    </span>
                  ) : (
                    <span className="text-sm font-black text-amber-600">Отправлено на проверку</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                    Проверили: {reviewedCount} из {totalAdminsRequired}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                    Осталось: {remainingCount}
                  </span>
                </div>
                {hasReviews && reviewedCount < totalAdminsRequired && (
                  <p className="text-xs text-slate-500 font-bold">
                    Итоговая оценка появится после {totalAdminsRequired} проверок.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Прикрепленные файлы ({files.length})</label>
              <div className="grid gap-3 overflow-hidden">
                {files.map((f, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-[24px] overflow-hidden w-full">
                    <div className="flex items-center justify-between p-4 min-w-0 gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 bg-[#10408A] rounded-xl text-white shrink-0 shadow-lg shadow-[#10408A]/10">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#0E1C1C] truncate pr-2" title={f.name}>{f.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{(f.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => setActivePreviewIndex(activePreviewIndex === index ? null : index)} 
                          className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${activePreviewIndex === index ? 'bg-[#0E1C1C] text-white border-[#0E1C1C]' : 'bg-white dark:bg-slate-700 text-[#10408A] dark:text-[#6ba3f5] border-slate-100 dark:border-slate-600 hover:border-[#10408A]'}`}
                        >
                          {activePreviewIndex === index ? 'Закрыть' : 'Просмотр'}
                        </button>
                        <a
                          href={fileUrls[index] || f.data}
                          download={f.name}
                          className="px-3 py-2 rounded-xl text-[10px] font-black border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#10408A] hover:border-[#10408A] transition-all"
                        >
                          Скачать
                        </a>
                        {!isSubmitted && !isAdmin && (
                          <button onClick={() => removeFile(index)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {activePreviewIndex === index && (
                      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-600 animate-in slide-in-from-top-2">
                        {renderFilePreview(f, index)}
                      </div>
                    )}
                  </div>
                ))}

                {!isSubmitted && !isAdmin && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-100 rounded-3xl p-8 text-center hover:border-[#10408A] hover:bg-[#10408A]/5 transition-all cursor-pointer group w-full"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <p className="text-slate-400 text-sm font-bold">Прикрепить файл</p>
                  </div>
                )}
              </div>
            </div>

            {!isSubmitted && !isAdmin && (
              <div className="flex items-center justify-end gap-6 pt-8 border-t border-slate-50">
                <button onClick={onCancel} className="text-sm font-bold text-slate-400 hover:text-[#0E1C1C] transition-colors">Отмена</button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#10408A] text-white px-12 py-4 rounded-2xl font-black shadow-2xl shadow-[#10408A]/20 hover:bg-[#0d336e] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Отправка...' : 'Сдать работу'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default TaskSolve;