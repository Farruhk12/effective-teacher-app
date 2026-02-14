
import React, { useState, useEffect } from 'react';

interface LandingProps {
  onEnter: () => void;
}

const LOGO_URL = 'https://www.tajmedun.tj/bitrix/templates/tajmedun/images/logo_new2.png';
const BUILDING_URL = 'https://www.tajmedun.tj/upload/iblock/05d/52326262333_ab3dba849e_o.jpg';

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [timelineModal, setTimelineModal] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('[data-landing-section]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number((e.target as HTMLElement).dataset.landingSection);
          setVisible((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
        });
      },
      { rootMargin: '-60px 0px -80px 0px', threshold: 0.1 }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollToProgram = () => {
    document.getElementById('structure')?.scrollIntoView({ behavior: 'smooth' });
  };

  const timelineSteps = [
    { title: 'Очная часть', hours: 20, desc: 'Пять дней интенсивной работы с кураторами: лекции, воркшопы, разбор кейсов и отработка активных методов обучения в аудитории.' },
    { title: 'Онлайн-обучение', hours: 40, desc: 'Три недели работы на цифровой платформе: изучение материалов, тесты, просмотр вебинаров и выполнение заданий в удобном темпе.' },
    { title: 'Самостоятельная работа', hours: 72, desc: 'Внедрение в практику: перепроектирование занятий, разработка оценочных материалов, проведение занятий по новым методикам с отчётами и обратной связью.' },
    { title: 'Итоговая аттестация', hours: 12, desc: 'Защита портфолио, итоговое тестирование и экспертная оценка. Минимум 50% для получения диплома о повышении квалификации.' },
  ];

  const modules = [
    { title: 'Андрагогика', short: 'Принципы обучения взрослых: мотивация, самостоятельность, связь с практикой и опыт слушателей как ресурс.' },
    { title: 'Активные методы обучения', short: 'TBL, кейсы, мозговой штурм, ролевые игры и другие форматы вовлечения студентов в процесс.' },
    { title: 'Эффективная презентация', short: 'Структура, визуал, тайминг и техники удержания внимания аудитории на лекциях и семинарах.' },
    { title: 'Искусственный интеллект в образовании', short: 'Использование ИИ для подготовки материалов, проверки работ и персонализации обучения в рамках этических норм.' },
    { title: 'Методы оценки', short: 'Рубрики, оценочные листы, критерии и обратная связь как инструмент развития, а не контроля.' },
    { title: 'Лидерство и рефлексия', short: 'Самоанализ преподавательской практики, работа с обратной связью и развитие лидерских качеств в учебной группе.' },
    { title: 'Soft и Hard навыки', short: 'Баланс предметных компетенций и надпрофессиональных навыков: коммуникация, работа в команде, тайм-менеджмент.' },
    { title: 'Компетентностный подход', short: 'От «знать» к «уметь»: формулирование результатов обучения и выравнивание программ под стандарты.' },
    { title: 'Проектирование силлабуса', short: 'Структура курса, цели по таксономии Блума, согласование с работодателями и актуализация содержания.' },
  ];

  const tasks = [
    'Разработка оценочного листа',
    'Проведение занятия TBL',
    'Мозговой штурм',
    'Перепроектирование занятия',
    'Использование ИИ в подготовке',
    'Самодиагностика компетенций',
    'Разработка силлабуса',
    'Проведение занятия с активными методами',
    'Обратная связь студентам по критериям',
    'Портфолио внедрённых изменений',
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans antialiased overflow-x-hidden scroll-smooth">
      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="" className="w-9 h-9 object-contain" />
            <span className="font-bold text-sm sm:text-base tracking-tight text-white">Эффективный преподаватель</span>
          </div>
          <button onClick={onEnter} className="px-4 py-2.5 rounded-xl bg-[#10408A] hover:bg-[#0d3270] text-white text-sm font-bold transition-all shadow-lg shadow-[#10408A]/30 active:scale-95">
            Войти
          </button>
        </div>
      </nav>

      {/* Block 1 — Hero: картинка на весь фон, текст поверх */}
      <section
        data-landing-section={0}
        data-anim="slide-up"
        className={`relative min-h-[90vh] flex flex-col justify-center pt-24 sm:pt-28 pb-20 transition-all duration-700 ${visible.has(0) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ backgroundImage: `url(${BUILDING_URL})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-900/75 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1.5 rounded-full bg-[#10408A]/20 text-[#6ba3f5] text-xs font-bold uppercase tracking-wider border border-[#10408A]/40">Повышение квалификации — 144 часа</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/20">Смешанный формат</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/20">Цифровая платформа</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.1] tracking-tight text-white drop-shadow-lg uppercase">
              Эффективный преподаватель
            </h1>
            <p className="mt-6 text-slate-200 text-lg sm:text-xl max-w-xl leading-relaxed drop-shadow-md">
              Современная программа повышения квалификации для преподавателей медицинских вузов.
              Очное обучение + цифровая платформа + практическое внедрение.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button onClick={onEnter} className="px-8 py-4 rounded-2xl bg-[#10408A] hover:bg-[#0d3270] text-white font-black text-lg shadow-xl shadow-[#10408A]/30 hover:shadow-2xl transition-all active:scale-95">
                Начать обучение
              </button>
              <button onClick={scrollToProgram} className="px-8 py-4 rounded-2xl border-2 border-white/40 text-white hover:bg-white/10 font-bold transition-all flex items-center justify-center gap-2">
                Программа курса
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </button>
            </div>
          </div>
          <div className="absolute right-4 bottom-20 hidden xl:block w-[220px] bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="h-1.5 bg-slate-700" />
            <div className="p-3 space-y-2">
              <div className="h-1.5 w-3/4 bg-slate-600 rounded" />
              <div className="h-1.5 w-full bg-slate-600 rounded" />
              <div className="h-1.5 w-5/6 bg-slate-600 rounded" />
              <div className="pt-2 flex gap-2">
                <span className="px-2 py-0.5 rounded bg-[#10408A]/30 text-[#a8c8f5] text-[10px] font-bold">Занятия</span>
                <span className="px-2 py-0.5 rounded bg-slate-600 text-slate-300 text-[10px] font-bold">Тесты</span>
              </div>
            </div>
            <p className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-700">Платформа обучения</p>
          </div>
        </div>
      </section>

      {/* Block 2 — О программе */}
      <section data-landing-section={1} data-anim="slide-up" className={`py-20 sm:py-28 bg-slate-800/50 transition-all duration-700 ${visible.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">
            Почему это не просто курс, а новая модель преподавания
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-16">
            Комбинация очной работы, онлайн-платформы и внедрения в практику с экспертной поддержкой.
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16 max-w-4xl mx-auto">
            {['5 дней очной работы с кураторами', '3 недели внедрения в реальной практике', '10 практических заданий', 'Цифровая платформа с аналитикой', 'Экспертная оценка 5 кураторами'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200">
                <span className="w-8 h-8 rounded-lg bg-[#10408A]/20 text-[#6ba3f5] flex items-center justify-center text-sm font-black shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-600/50 p-8 sm:p-10 max-w-3xl mx-auto">
            <p className="text-center text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">Формула курса</p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-center">
              <span className="px-4 py-2 rounded-xl bg-slate-700/80 text-white font-bold">5 дней очно</span>
              <span className="text-slate-500">+</span>
              <span className="px-4 py-2 rounded-xl bg-slate-700/80 text-white font-bold">3 недели онлайн</span>
              <span className="text-slate-500">+</span>
              <span className="px-4 py-2 rounded-xl bg-slate-700/80 text-white font-bold">10 заданий</span>
              <span className="text-slate-500">+</span>
              <span className="px-4 py-2 rounded-xl bg-slate-700/80 text-white font-bold">тестовая система</span>
              <span className="text-slate-500">=</span>
              <span className="px-5 py-3 rounded-2xl bg-[#10408A]/20 text-[#6ba3f5] font-black text-lg border border-[#10408A]/40">144 часа развития</span>
            </div>
          </div>
        </div>
      </section>

      {/* Block 3 — Для кого */}
      <section data-landing-section={2} data-anim="slide-side" className={`py-20 sm:py-28 bg-slate-900 transition-all duration-700 ${visible.has(2) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">Для кого программа</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-16">Конкретные результаты для каждой категории слушателей</p>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { title: 'Преподаватели медицинских дисциплин', text: 'Готовые инструменты оценки и активные методы под ваши лекции и семинары. Силлабус и оценочные листы, которые можно внедрить уже в текущем семестре.', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { title: 'Кураторы и наставники', text: 'Система проверки заданий и комментариев на платформе, аналитика по группам и рейтинг преподавателей для точечной поддержки и развития.', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              { title: 'Заведующие кафедрами и методисты', text: 'Единые стандарты оценки и компетентностный подход для выравнивания программ кафедры и отчётности по результатам повышения квалификации.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            ].map((card, i) => (
              <div key={i} className={`rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6 sm:p-8 hover:border-[#10408A]/40 transition-all duration-600 ${visible.has(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: visible.has(2) ? `${i * 120}ms` : '0ms' }}>
                <div className="w-12 h-12 rounded-xl bg-[#10408A]/20 text-[#6ba3f5] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
                </div>
                <h3 className="text-xl font-black text-white mb-3">{card.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 4 — Структура (таймлайн) */}
      <section id="structure" data-landing-section={3} data-anim="slide-side" className={`py-20 sm:py-28 bg-slate-800/50 scroll-mt-20 transition-all duration-700 ${visible.has(3) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">Структура программы</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-16">Четыре этапа от очной части до итоговой аттестации</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {timelineSteps.map((step, i) => (
              <button
                key={i}
                onClick={() => setTimelineModal(i)}
                className="text-left p-6 rounded-2xl bg-slate-800/80 border border-slate-700/50 hover:border-[#10408A]/40 transition-all group"
              >
                <span className="text-xs font-bold text-[#6ba3f5] uppercase tracking-wider">Этап {i + 1}</span>
                <h3 className="text-lg font-black text-white mt-2 group-hover:text-[#6ba3f5] transition-colors">{step.title}</h3>
                <p className="text-2xl font-black text-[#6ba3f5]/90 mt-2">{step.hours} ч</p>
                <p className="text-slate-500 text-sm mt-2">Нажмите, чтобы подробнее →</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline modal */}
      {timelineModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setTimelineModal(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-[#6ba3f5] uppercase tracking-wider">Этап {timelineModal + 1}</span>
                <h3 className="text-xl font-black text-white mt-1">{timelineSteps[timelineModal].title}</h3>
                <p className="text-[#6ba3f5] font-black text-lg mt-1">{timelineSteps[timelineModal].hours} часов</p>
              </div>
              <button onClick={() => setTimelineModal(null)} className="p-2 text-slate-400 hover:text-white rounded-lg">✕</button>
            </div>
            <p className="text-slate-300 leading-relaxed">{timelineSteps[timelineModal].desc}</p>
          </div>
        </div>
      )}

      {/* Block 5 — Модули */}
      <section data-landing-section={4} data-anim="zoom" className={`py-20 sm:py-28 bg-slate-900 transition-all duration-700 ${visible.has(4) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">Модули обучения</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-16">Ключевые темы программы с практической направленностью</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m, i) => (
              <div
                key={i}
                className={`relative p-6 rounded-2xl bg-slate-800/80 border border-slate-700/50 hover:border-[#10408A]/40 transition-all duration-500 ${visible.has(4) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: visible.has(4) ? `${i * 60}ms` : '0ms' }}
              >
                <h3 className="text-base font-bold text-white mb-2">{m.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{m.short}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 6 — Практические задания */}
      <section data-landing-section={5} data-anim="slide-up" className={`py-20 sm:py-28 bg-slate-800/50 transition-all duration-700 ${visible.has(5) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">Преподаватель не слушает — он внедряет</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-16">10 практических заданий в формате портфолио</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task, i) => (
              <div key={i} className={`p-5 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center gap-4 transition-all duration-500 ${visible.has(5) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: visible.has(5) ? `${i * 40}ms` : '0ms' }}>
                <span className="w-10 h-10 rounded-xl bg-[#10408A]/20 text-[#6ba3f5] flex items-center justify-center text-sm font-black shrink-0">{i + 1}</span>
                <span className="text-slate-200 font-medium">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 7 — Платформа */}
      <section data-landing-section={6} data-anim="slide-side" className={`py-20 sm:py-28 bg-slate-900 transition-all duration-700 ${visible.has(6) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-4">Цифровая система обучения и аналитики</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-16">Единая платформа для слушателей и кураторов</p>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6 sm:p-8">
              <h3 className="text-lg font-black text-[#6ba3f5] mb-6">Для слушателя</h3>
              <ul className="space-y-3 text-slate-300">
                {['Личный кабинет с прогрессом', 'Тесты: случайная генерация 20 из 1000 вопросов', 'Загрузка заданий и портфолио', 'Просмотр оценок и комментариев кураторов'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#6ba3f5] shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6 sm:p-8">
              <h3 className="text-lg font-black text-[#6ba3f5] mb-6">Для кураторов</h3>
              <ul className="space-y-3 text-slate-300">
                {['Редактирование банка тестов', 'Проверка заданий и комментарии', 'Аналитика по кафедрам и потокам', 'Рейтинг преподавателей'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#6ba3f5] shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 rounded-2xl bg-slate-800 border border-slate-600 overflow-hidden shadow-2xl max-w-4xl mx-auto">
            <div className="h-2 bg-slate-700 flex gap-1 px-2 pt-2">
              <span className="w-3 h-1.5 rounded-full bg-red-500/60" /><span className="w-3 h-1.5 rounded-full bg-amber-500/60" /><span className="w-3 h-1.5 rounded-full bg-emerald-500/60" />
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {['Занятия', 'Тесты', 'Задания', 'Результаты'].map((tab, i) => (
                  <div key={i} className="py-3 rounded-xl bg-slate-700/50 text-slate-300 text-sm font-bold">{tab}</div>
                ))}
              </div>
              <div className="mt-6 h-32 rounded-xl bg-slate-700/30 border border-slate-600/50 flex items-center justify-center text-slate-500 text-sm">Mockup интерфейса платформы</div>
            </div>
          </div>
        </div>
      </section>

      {/* Block 8 — Система оценки */}
      <section data-landing-section={7} data-anim="zoom" className={`py-20 sm:py-28 bg-slate-800/50 transition-all duration-700 ${visible.has(7) ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-6">Система оценки</h2>
          <ul className="space-y-4 text-slate-300 mb-10">
            <li>Каждое задание оценивают <strong className="text-white">5 кураторов</strong></li>
            <li>Формируется <strong className="text-white">средний балл</strong></li>
            <li><strong className="text-white">Минимум 50%</strong> для получения диплома</li>
            <li>Возможность <strong className="text-white">повторного прохождения</strong> тестов и заданий</li>
          </ul>
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-3">Пример прогресса</p>
            <div className="h-4 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#10408A] to-[#2563eb] transition-all" />
            </div>
            <p className="text-white font-black mt-2">72% — достаточно для диплома</p>
          </div>
        </div>
      </section>

      {/* Block 9 — Где проходит */}
      <section data-landing-section={8} data-anim="slide-up" className={`py-20 sm:py-28 bg-slate-900 transition-all duration-700 ${visible.has(8) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Программа реализуется на базе ТГМУ им. Абуали ибни Сино</h2>
          <p className="text-slate-400 leading-relaxed">
            Курс проводится в аудиториях университета с использованием современной цифровой образовательной платформы.
          </p>
          <div className="mt-8 flex justify-center">
            <img src={LOGO_URL} alt="ТГМУ" className="w-20 h-20 object-contain opacity-90" />
          </div>
        </div>
      </section>

      {/* Block 10 — Итоговый результат */}
      <section data-landing-section={9} data-anim="slide-side" className={`py-20 sm:py-28 bg-slate-800/50 transition-all duration-700 ${visible.has(9) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white text-center mb-16">Итоговый результат</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Диплом о повышении квалификации (144 часа)', 'Обновлённый силлабус', 'Готовые инструменты оценки', 'Внедрённые активные методы', 'Цифровая грамотность в образовании'].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-slate-200 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 11 — CTA */}
      <section data-landing-section={10} data-anim="slide-up" className={`py-20 sm:py-28 bg-slate-900 transition-all duration-700 ${visible.has(10) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-6">Готовы модернизировать своё преподавание?</h2>
          <button
            onClick={onEnter}
            className="px-10 py-5 rounded-2xl bg-[#10408A] hover:bg-[#0d3270] text-white font-black text-lg shadow-xl shadow-[#10408A]/30 hover:shadow-2xl transition-all active:scale-95"
          >
            Присоединиться к программе
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-slate-500 text-sm">
          <img src={LOGO_URL} alt="" className="w-8 h-8 object-contain opacity-70" />
          <span>ТГМУ им. Абуали ибни Сино · Программа «Эффективный преподаватель» (144 ч)</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
