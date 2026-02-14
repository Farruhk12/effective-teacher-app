import React, { useState, useRef, useEffect } from 'react';
import { Lesson, Question, LessonFile } from '../types';
import { generateTests } from '../services/geminiService';
import TestBuilder from './TestBuilder';

const RichTextEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    handleInput();
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#10408A] transition-all">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1">
        <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 font-bold w-8 h-8 flex items-center justify-center text-slate-700">B</button>
        <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 italic w-8 h-8 flex items-center justify-center text-slate-700">I</button>
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 w-8 h-8 flex items-center justify-center text-slate-700">•</button>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full px-4 py-3 min-h-[200px] outline-none bg-white dark:bg-slate-800 prose dark:prose-invert prose-slate max-w-none"
        data-placeholder={placeholder}
      />
    </div>
  );
};

interface LessonFormProps {
  onSave: (lesson: Lesson) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Lesson;
  isSaving?: boolean;
}

const LessonForm: React.FC<LessonFormProps> = ({ onSave, onCancel, initialData, isSaving }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [coverImage, setCoverImage] = useState<string | undefined>(initialData?.coverImage);
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
  const [files, setFiles] = useState<LessonFile[]>(initialData?.files || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTestCount, setAiTestCount] = useState(5);
  const [linkInput, setLinkInput] = useState({ name: '', url: '' });
  const [testBuilderData, setTestBuilderData] = useState<{ show: boolean, question?: Question }>({ show: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Сжимаем до 70% качества
      };
    });
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const compressed = await compressImage(event.target?.result as string);
        setCoverImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            data: event.target?.result as string,
            isLink: false
          }]);
        };
        reader.readAsDataURL(selectedFile);
      });
    }
  };

  const addExternalLink = () => {
    if (!linkInput.name || !linkInput.url) {
      alert("Заполните название и URL ссылки");
      return;
    }
    setFiles(prev => [...prev, {
      name: linkInput.name,
      size: 0,
      type: 'text/url',
      data: linkInput.url,
      isLink: true
    }]);
    setLinkInput({ name: '', url: '' });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAI = async () => {
    if (!title || !description) {
      alert("Пожалуйста, заполните название и описание для генерации теста.");
      return;
    }
    
    const plainDescription = description.replace(/<[^>]*>?/gm, '');
    setIsGenerating(true);
    try {
      const aiQuestions = await generateTests(title, plainDescription, aiTestCount);
      setQuestions(prev => [...prev, ...aiQuestions]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка при генерации теста. Проверьте API ключ или соединение.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuestion = (q: Question) => {
    setQuestions(prev => {
      const exists = prev.find(item => item.id === q.id);
      if (exists) {
        return prev.map(item => item.id === q.id ? q : item);
      }
      return [...prev, q];
    });
    setTestBuilderData({ show: false });
  };

  const handleSave = async () => {
    if (!title) {
      alert("Название обязательно!");
      return;
    }
    const newLesson: Lesson = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title,
      description,
      coverImage,
      questions,
      files,
      createdAt: initialData?.createdAt || Date.now(),
    };
    await onSave(newLesson);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-black text-[#0E1C1C]">{initialData ? 'Редактирование занятия' : 'Создание нового занятия'}</h2>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-rose-500 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-8 space-y-12">
        {/* Секция: Обложка */}
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Обложка занятия</label>
          <div 
            onClick={() => coverInputRef.current?.click()}
            className={`relative h-64 w-full rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center group ${coverImage ? 'border-transparent' : 'border-slate-200 hover:border-[#10408A] hover:bg-slate-50'}`}
          >
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
            {coverImage && typeof coverImage === 'string' && coverImage.startsWith('data:image') ? (
              <>
                <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-slate-900/10 to-transparent"></div>
                <img src={coverImage} alt="Cover" className="relative z-10 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">Изменить обложку</div>
              </>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 group-hover:text-[#10408A]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-slate-400 text-sm font-bold">Загрузить фоновое изображение</p>
              </div>
            )}
          </div>
        </div>

        {/* Секция: Основная инфо */}
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Название темы</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Основы андрогогики..."
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 focus:bg-white focus:ring-4 focus:ring-[#10408A]/5 focus:border-[#10408A] outline-none transition-all placeholder:text-slate-300 font-bold text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Материалы занятия (Текст)</label>
            <RichTextEditor 
              value={description}
              onChange={setDescription}
              placeholder="Опишите основные тезисы занятия..."
            />
          </div>
        </div>

        {/* Секция: Файлы и Ссылки */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Прикрепленные материалы ({files.length})</label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center hover:border-[#10408A] hover:bg-slate-50 cursor-pointer transition-all group flex flex-col justify-center"
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-[#10408A] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Загрузить файлы</p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Добавить ссылку</p>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Название ссылки (напр. Видео)" 
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none" 
                  value={linkInput.name}
                  onChange={e => setLinkInput({...linkInput, name: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="https://..." 
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none" 
                  value={linkInput.url}
                  onChange={e => setLinkInput({...linkInput, url: e.target.value})}
                />
              </div>
              <button onClick={addExternalLink} className="mt-4 w-full py-2 bg-[#10408A] text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform">Добавить</button>
            </div>
          </div>

          <div className="grid gap-3">
            {files.map((f, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg text-white shrink-0 ${f.isLink ? 'bg-amber-500' : 'bg-[#10408A]'}`}>
                    {f.isLink ? (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0E1C1C] truncate pr-2" title={f.name}>{f.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {f.isLink ? 'Внешняя ссылка' : `${(f.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>
                <button onClick={() => removeFile(index)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Секция: Тестирование */}
        <div className="pt-8 border-t border-slate-100 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Банк вопросов ({questions.length})</label>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Создайте вручную или с помощью ИИ</p>
              </div>
           </div>

           <div className="p-8 bg-[#10408A]/5 rounded-[32px] border border-[#10408A]/10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-3">
                <h4 className="font-bold text-[#10408A]">Умная генерация ИИ</h4>
                <p className="text-sm text-slate-500 leading-relaxed">ИИ проанализирует название и описание вашего занятия и подготовит качественные вопросы с вариантами ответов.</p>
                <div className="flex items-center gap-4 pt-2">
                  <span className="text-xs font-bold text-slate-400">Количество вопросов:</span>
                  <input 
                    type="range" min="1" max="20" 
                    value={aiTestCount} 
                    onChange={e => setAiTestCount(parseInt(e.target.value))}
                    className="accent-[#10408A] cursor-pointer" 
                  />
                  <span className="w-8 h-8 rounded-lg bg-[#10408A] text-white flex items-center justify-center font-black text-xs">{aiTestCount}</span>
                </div>
              </div>
              <button 
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className={`px-8 py-4 bg-[#10408A] text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#10408A]/20 transition-all active:scale-95 shrink-0 ${isGenerating ? 'opacity-50' : 'hover:bg-[#0d336e]'}`}
              >
                {isGenerating ? 'Генерация...' : 'Сгенерировать'}
              </button>
           </div>

           <div className="grid gap-3">
             {questions.map((q, i) => (
                <div key={q.id} className="group flex items-start justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-[#10408A]/30 transition-all">
                   <div className="flex items-start gap-4 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i+1}</span>
                      <p className="font-bold text-sm text-slate-800 break-words flex-1 pr-4 leading-relaxed">{q.text}</p>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setTestBuilderData({ show: true, question: q })} className="p-2 text-slate-400 hover:text-[#10408A] transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => setQuestions(prev => prev.filter(item => item.id !== q.id))} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                   </div>
                </div>
             ))}
             <button 
                onClick={() => setTestBuilderData({ show: true })}
                className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-[#10408A] hover:text-[#10408A] transition-all"
             >
                + Добавить вопрос вручную
             </button>
           </div>
        </div>

        {/* Финальные кнопки */}
        <div className="flex items-center justify-end gap-6 pt-10 border-t border-slate-50">
          <button onClick={onCancel} className="text-sm font-bold text-slate-400 hover:text-[#0E1C1C]">Отмена</button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="px-12 py-4 bg-[#10408A] text-white rounded-2xl font-black shadow-2xl shadow-[#10408A]/20 hover:bg-[#0d336e] transition-all active:scale-95 uppercase text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed">
            {isSaving ? 'Сохранение...' : (initialData ? 'Сохранить изменения' : 'Создать занятие')}
          </button>
        </div>
      </div>

      {testBuilderData.show && (
        <TestBuilder 
          initialData={testBuilderData.question}
          onAdd={handleSaveQuestion}
          onClose={() => setTestBuilderData({ show: false })}
        />
      )}
    </div>
  );
};

export default LessonForm;