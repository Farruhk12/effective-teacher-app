<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1I1BbbPs4x5z-9oSZjN5GbFXLRo20IUdU

## Run Locally

**Нужно:** Node.js

1. Установите зависимости: `npm install`
2. Создайте файл `.env.local` и укажите `GEMINI_API_KEY=ваш_ключ` (см. `.env.example`)
3. Запустите приложение одной командой: **`npm start`** — откроется браузер с приложением.  
   (Или `npm run dev`, затем откройте вручную http://localhost:3000)

**Сайт на GitHub Pages:** https://atsmu.github.io/effective-teacher-app/

### Почему нельзя просто открыть index.html?

В `index.html` подключены **исходники** (`index.tsx`, `index.css`): это TypeScript и React, их браузер сам не собирает. Нужен **сборщик (Vite)** — он превращает их в обычный JS и отдаёт по адресу (localhost). Поэтому запуск идёт через команду `npm start` или `npm run dev`, а не двойной клик по файлу.
