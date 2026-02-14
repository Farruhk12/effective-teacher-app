
import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';

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
  }, []);

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
    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1">
        <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 font-bold w-8 h-8 flex items-center justify-center text-slate-700">B</button>
        <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 italic w-8 h-8 flex items-center justify-center text-slate-700">I</button>
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 w-8 h-8 flex items-center justify-center text-slate-700">•</button>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full px-5 py-4 min-h-[250px] outline-none bg-white dark:bg-slate-800 prose dark:prose-invert prose-slate max-w-none"
      />
    </div>
  );
};

interface TaskFormProps {
  onSave: (task: Task) => void;
  onCancel: () => void;
  initialData?: Task;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSave, onCancel, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSave = () => {
    if (!title.trim()) {
      alert("Введите название задания");
      return;
    }
    const newTask: Task = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: description.trim(),
      createdAt: initialData?.createdAt || Date.now(),
    };
    onSave(newTask);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{initialData ? 'Редактировать задание' : 'Новое задание'}</h2>
          <p className="text-slate-500">Укажите требования и цели задания</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Название задания</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Разработка интерфейса на React"
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Подробное описание (поддерживает форматирование)</label>
          <RichTextEditor 
            value={description}
            onChange={setDescription}
            placeholder="Опишите, что именно должен сделать студент..."
          />
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
          <button onClick={onCancel} className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">Отмена</button>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
            {initialData ? 'Обновить' : 'Создать задание'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
