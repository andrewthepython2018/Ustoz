-- Remove untouched records created by the retired AF MISIS setup button.
-- Keep edited offers, independent accounts and all records with learning history.
CREATE TABLE `_ustoz_starter_cleanup` (`id` text PRIMARY KEY NOT NULL);
--> statement-breakpoint
INSERT INTO `_ustoz_starter_cleanup` (`id`)
SELECT l.id FROM listings l JOIN users u ON u.id=l.owner_id
WHERE EXISTS (
  SELECT 1 FROM workspace_templates t
  WHERE t.key='af-misis-v1:' || t.owner_id
    AND (u.id=t.owner_id OR u.managed_by=t.owner_id)
    AND l.created_at>=t.created_at
)
AND l.active=0 AND l.price=0 AND l.photo_key IS NULL
AND l.city='Алмалык' AND l.language='Русский' AND l.format='Очно'
AND l.level='Все уровни' AND l.experience=0
AND (
  (l.kind='course' AND l.duration=90 AND (l.title,l.subject,l.description) IN (
    VALUES
      ('Программирование: Python с нуля','Программирование','Основы Python, алгоритмы, работа с данными и практические проекты. Уточните программу, расписание и условия обучения перед публикацией.'),
      ('Английский язык','Английский язык','Разговорная практика, грамматика, чтение и аудирование. Уточните уровни подготовки, программу курса и условия обучения перед публикацией.'),
      ('Математика','Математика','Алгебра, геометрия и решение задач. Заполните программу, возрастную группу и формат занятий перед публикацией курса.'),
      ('Физика','Физика','Механика, электричество и практические задачи. Заполните программу, уровень подготовки и условия обучения перед публикацией курса.')
  ))
  OR
  (l.kind='tutor' AND l.duration=60
    AND l.description='Опишите опыт, методику и цели занятий. Добавьте имя преподавателя, фотографию и стоимость перед публикацией анкеты.'
    AND (l.title,l.subject) IN (
      VALUES
        ('Индивидуальные занятия: английский язык','Английский язык'),
        ('Индивидуальные занятия: программирование','Программирование'),
        ('Индивидуальные занятия: математика','Математика')
    ))
)
AND NOT EXISTS (SELECT 1 FROM slots WHERE listing_id=l.id)
AND NOT EXISTS (SELECT 1 FROM reviews WHERE listing_id=l.id);
--> statement-breakpoint
DELETE FROM favorites WHERE listing_id IN (SELECT id FROM `_ustoz_starter_cleanup`);
--> statement-breakpoint
DELETE FROM listings WHERE id IN (SELECT id FROM `_ustoz_starter_cleanup`);
--> statement-breakpoint
DROP TABLE `_ustoz_starter_cleanup`;
--> statement-breakpoint
DELETE FROM users
WHERE managed_by IS NOT NULL AND phone='' AND photo_key IS NULL AND city='Алмалык'
AND (
  (name IN ('Репетитор английского языка','Репетитор программирования','Репетитор математики')
    AND bio='Заполните имя преподавателя, опыт и подход к обучению.')
  OR (name='АФ МИСИС'
    AND bio='Алмалыкский филиал НИТУ МИСИС. Заполните информацию о курсах и условиях обучения.')
)
AND EXISTS (
  SELECT 1 FROM workspace_templates t
  WHERE t.key='af-misis-v1:' || t.owner_id AND t.owner_id=users.managed_by
    AND users.created_at>=t.created_at
    AND users.created_at<=strftime('%Y-%m-%dT%H:%M:%fZ',t.created_at,'+5 seconds')
)
AND NOT EXISTS (SELECT 1 FROM listings WHERE owner_id=users.id)
AND NOT EXISTS (SELECT 1 FROM users child WHERE child.managed_by=users.id)
AND NOT EXISTS (SELECT 1 FROM sessions WHERE user_id=users.id)
AND NOT EXISTS (SELECT 1 FROM bookings WHERE student_id=users.id)
AND NOT EXISTS (SELECT 1 FROM submissions WHERE student_id=users.id)
AND NOT EXISTS (SELECT 1 FROM messages WHERE sender_id=users.id OR recipient_id=users.id)
AND NOT EXISTS (SELECT 1 FROM favorites WHERE user_id=users.id)
AND NOT EXISTS (SELECT 1 FROM reviews WHERE student_id=users.id)
AND NOT EXISTS (SELECT 1 FROM media WHERE owner_id=users.id)
AND NOT EXISTS (SELECT 1 FROM workspace_templates WHERE owner_id=users.id);
--> statement-breakpoint
DROP TABLE `workspace_templates`;
