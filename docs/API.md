# API первой версии

Все пути начинаются с `/api/`. JSON-запросы используют `Content-Type: application/json`. Авторизация — cookie `ustoz_session`, которую сервер возвращает при регистрации и входе; браузер отправляет её через `credentials: same-origin`. Для нативного мобильного клиента нужна cookie jar. Не сохраняйте пароль на устройстве.

Ошибка: `{ "error": "Описание" }`, HTTP 400/401/403/404/409/429/500. Проверки доступа выполняются для каждой операции. Межсайтовый CORS не включён.

| Метод | Путь | Назначение / поля |
| --- | --- | --- |
| GET | `/health` | Версия и доступность процесса |
| GET | `/catalog` | `{ listings: [...] }`, реальные и отмеченные демо-предложения |
| GET | `/listing/:id` | Предложение, свободные слоты с `seats_left`, отзывы |
| GET | `/me` | Текущий пользователь, доступность Sites identity |
| POST | `/auth/register` | `name,email,password,role` (`student`, `tutor`, `center`) |
| POST | `/auth/login` | `email,password` |
| POST | `/auth/logout` | Удаление сессии |
| POST | `/profile` | Создание профиля на основе доверенной Sites identity |
| PATCH | `/profile` | `name,phone,city,bio` |
| GET | `/workspace` | Свои `lessons,assignments,listings,available,contacts,favorites` |
| POST | `/listings` | `title,subject,language,city,format,price,duration,description,level,experience` |
| PATCH | `/listings/:id` | Те же поля; только владелец |
| DELETE | `/listings/:id` | Архивирование предложения без удаления учебной истории |
| POST | `/slots` | `listingId,startsAt` (UTC ISO), `capacity` для центра (1–30) |
| DELETE | `/slots/:id` | Удаление своего слота, на который никогда не записывались |
| POST | `/bookings` | `slotId` |
| PATCH | `/bookings/:id` | `status: cancelled/completed` или `meetingUrl` (HTTPS) |
| POST | `/assignments` | `bookingId,title,body,dueAt` |
| POST | `/submissions` | `assignmentId,body,fileKey?,fileName?` |
| PATCH | `/submissions/:id` | `grade` (0–100), `feedback` |
| POST | `/files` | `multipart/form-data`, поле `file`, до 10 МБ; возвращает `key,name` |
| GET | `/files?key=…` | Приватное скачивание файла задания |
| GET | `/messages?peer=:userId` | До 200 последних сообщений, отмечает полученные прочитанными |
| POST | `/messages` | `recipientId,body` |
| POST | `/favorites` | `listingId,saved` (boolean) |
| POST | `/reviews` | `listingId,rating` (1–5), `body`; после завершённого урока |
| GET | `/admin` | Пользователи и предложения; только admin |
| PATCH | `/admin` | `listingId,active` (0/1); только admin |

Примеры допустимых значений: предметы и города — `lib/catalog.ts`; язык обучения `Русский`, `O‘zbekcha`, `English`; формат `Онлайн`, `Очно`, `Гибрид`. Цена — целое число UZS. Для репетитора цена за занятие, для курса — заявленная стоимость месяца. Оплата в API отсутствует.
