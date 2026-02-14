
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  loadError?: string | null;
  onRetry?: () => void;
  isLoading?: boolean;
}

type LoginTab = 'admin' | 'teacher';

const Login: React.FC<LoginProps> = ({ onLogin, users, loadError, onRetry, isLoading }) => {
  const [activeTab, setActiveTab] = useState<LoginTab>('teacher');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const logoUrl = "https://www.tajmedun.tj/bitrix/templates/tajmedun/images/logo_new2.png";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedUser && String(selectedUser.password) === password) {
      onLogin(selectedUser);
    } else {
      setError('Неверный пароль');
      const el = document.getElementById('password-input');
      el?.classList.add('animate-shake');
      setTimeout(() => el?.classList.remove('animate-shake'), 500);
    }
  };

  const getInitial = (name: any) => {
    const safeName = String(name || '');
    if (safeName.length === 0) return '?';
    return safeName.charAt(0).toUpperCase();
  };

  const usersByRole = activeTab === 'admin'
    ? users.filter(u => u.role === 'admin')
    : users.filter(u => u.role === 'listener');

  const filteredUsers = usersByRole.filter(u => {
    const name = String(u.name || '').toLowerCase();
    const login = String(u.login || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || login.includes(query);
  });

  const switchTab = (tab: LoginTab) => {
    setActiveTab(tab);
    setSelectedUser(null);
    setPassword('');
    setError('');
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setError('');
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const placeholderByTab = activeTab === 'admin' ? 'Выберите администратора...' : 'Выберите преподавателя...';

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6 sm:mb-8">
          <img src={logoUrl} alt="Logo" className="h-20 sm:h-24 mx-auto object-contain mb-4 sm:mb-6 drop-shadow-xl" />
          <h2 className="text-2xl sm:text-3xl font-black text-[#0E1C1C] dark:text-white tracking-tight">Личный кабинет</h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium mt-2 text-sm sm:text-base">Выберите свой профиль для входа</p>
        </div>

        {/* Вкладки Админ / Преподаватель */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 mb-6">
          <button
            type="button"
            onClick={() => switchTab('admin')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'admin' ? 'bg-white dark:bg-slate-700 text-[#10408A] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Админ
          </button>
          <button
            type="button"
            onClick={() => switchTab('teacher')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'teacher' ? 'bg-white dark:bg-slate-700 text-[#10408A] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Преподаватель
          </button>
        </div>

        {loadError && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-left">
            <p className="text-amber-800 font-bold text-sm">{loadError}</p>
            <p className="text-amber-600 text-xs mt-2">Убедитесь, что скрипт таблицы Google опубликован и URL в коде актуален.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isLoading}
                className="mt-4 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Загрузка...' : 'Повторить'}
              </button>
            )}
          </div>
        )}

        {!loadError && !isLoading && users.length === 0 && (
          <div className="mb-6 p-5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl text-left">
            <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">Список профилей пуст</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">В листе «Users» таблицы нет строк с пользователями или данные ещё не загрузились. Нажмите «Повторить».</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-4 px-5 py-2.5 bg-slate-600 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">
                Повторить
              </button>
            )}
          </div>
        )}

        {!loadError && !isLoading && users.length > 0 && usersByRole.length === 0 && (
<div className="mb-6 p-5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl text-left">
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">
            {activeTab === 'admin' ? 'Нет администраторов' : 'Нет преподавателей'}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">
              {activeTab === 'admin'
                ? 'В системе нет пользователей с ролью «Админ». Перейдите на вкладку «Преподаватель» или добавьте администратора в листе «Users».'
                : 'В системе нет преподавателей. Перейдите на вкладку «Админ» или добавьте пользователей с ролью «Преподаватель» в листе «Users».'}
            </p>
          </div>
        )}

        {usersByRole.length > 0 && (
        <div className="space-y-6">
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-[28px] border-2 transition-all text-left ${isDropdownOpen ? 'border-[#10408A] bg-white dark:bg-slate-800 ring-4 ring-[#10408A]/5' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedUser ? 'bg-[#10408A] text-white' : 'bg-slate-200 text-slate-400'}`}>
                {selectedUser ? getInitial(selectedUser.name) : '?'}
              </div>
              <div className="flex-1">
                <p className={`font-bold ${selectedUser ? 'text-[#0E1C1C] dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                  {selectedUser ? selectedUser.name : placeholderByTab}
                </p>
              </div>
              <svg className={`w-5 h-5 text-slate-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700">
                  <input 
                    type="text"
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-[#10408A] text-sm font-medium"
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#10408A]/5 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[#0E1C1C] group-hover:bg-[#10408A] group-hover:text-white transition-all">
                        {getInitial(user.name)}
                      </div>
                      <div>
                        <p className="font-bold text-[#0E1C1C] text-sm">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role === 'admin' ? 'Админ' : 'Преподаватель'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className={`space-y-6 transition-all duration-500 ${selectedUser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none h-0'}`}>
            <div className="space-y-2">
              <input 
                id="password-input"
                ref={passwordInputRef}
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent rounded-[28px] focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-[#10408A]/5 focus:border-[#10408A] outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-black text-2xl tracking-[0.2em] text-center"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold text-center animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-5 bg-[#10408A] text-white rounded-[28px] font-black shadow-2xl shadow-[#10408A]/20 hover:bg-[#0d336e] transition-all active:scale-95 uppercase tracking-widest text-sm"
            >
              Войти
            </button>
          </form>
        </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
          border-color: #ef4444 !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
