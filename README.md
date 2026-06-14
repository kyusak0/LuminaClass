Инструкция по запуску проекта
1. Установка зависимостей
Backend (Laravel)
Откройте терминал в папке с Laravel

cd backend

и выполните:

composer install
npm install
Frontend (Next.js)
Откройте второй терминал в папке с Next.js

cd frontend

и выполните:

npm install
# или (в зависимости от ОС)
yarn install


2. Настройка окружения
Laravel
Скопируйте файл .env.example в .env:

cp .env.example .env

Сгенерируйте ключ приложения:

php artisan key:generate

В файле .env проверьте настройки для Reverb (WebSockets), должно быть примерно так:

BROADCAST_CONNECTION=reverb

REVERB_APP_ID=local
REVERB_APP_KEY=local
REVERB_APP_SECRET=local
REVERB_HOST=127.0.0.1
REVERB_PORT=8081
REVERB_SERVER_PORT=8081
REVERB_SCHEME=http

Next.js
В папке Next.js создайте файл .env.local:

env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REVERB_APP_KEY=your_app_key
NEXT_PUBLIC_REVERB_HOST=127.0.0.1
NEXT_PUBLIC_REVERB_PORT=8080

3. Миграции и сидеры (база данных)
Убедитесь, что в .env Laravel указаны правильные данные для подключения к БД, затем выполните:

php artisan migrate
php artisan db:seed --class=UserSeeder #это создаст только пользователей
php artisan db:seed --class=GroupSeeder #это создаст только группы
php artisan db:seed --class=SupportSeeder #это создаст чат техподдержки

!! Важно !! не запускать без --class

4. Запуск всех сервисов
Откройте три отдельных терминала (или используйте npm run dev с параллельными командами).

Терминал 1 — Laravel (API)

php artisan serve
# или на другом порту:
php artisan serve --port=8000

Терминал 2 — Reverb (WebSockets)

php artisan reverb:start

Терминал 3 — Next.js (фронтенд)

npm run dev
# или
yarn dev

в консоль должны выйти адреса по которым открылись сервисы

5. Проверка работы
Laravel API: http://localhost:8000

Next.js: http://localhost:3000

Reverb: ws://localhost:8080

Откройте браузер на http://localhost:3000

Быстрый вход (для тестирования)

# Администратор
Логин: admin1
Пароль: admin1

# Учитель (пример)
Логин: ekaterina_volkova
Пароль: teacher1

# Студент (пример)
Логин: ivan_petrov
Пароль: student1
