export const subjects = ['Английский язык', 'Математика', 'Программирование', 'Русский язык', 'Узбекский язык', 'Корейский язык', 'Физика', 'Химия', 'Дизайн'];
export const cities = ['Ташкент', 'Алмалык', 'Самарканд', 'Бухара', 'Андижан', 'Наманган', 'Фергана', 'Нукус', 'Карши', 'Ургенч', 'Джизак', 'Навои', 'Термез', 'Гулистан'];
export const languages = ['Русский', 'O‘zbekcha', 'English'];
export type Listing = {
  id: string; owner_id: string; name: string; role: string; kind: string; title: string;
  subject: string; language: string; city: string; format: string; price: number; duration: number;
  description: string; level: string; experience: number; created_at: string;
  rating: number; review_count: number; image?: string; accent?: string; active?: number; editable?: boolean; photo_key?: string|null;
};
export const money = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
export const dateTime = (v: string, locale='ru') => new Date(v).toLocaleString(locale === 'uz' ? 'uz-UZ' : 'ru-RU', {timeZone:'Asia/Tashkent',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
