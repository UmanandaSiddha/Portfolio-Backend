-- migrate:up

-- Realign sections.sort_order to the canonical landing-page order. The
-- experience/education + work→projects migrations left a collision
-- (projects and experience both at 3) and education after contact.
-- This makes the admin sections list match the live site order.
UPDATE sections SET sort_order = 1  WHERE key = 'intro';
UPDATE sections SET sort_order = 2  WHERE key = 'about';
UPDATE sections SET sort_order = 3  WHERE key = 'experience';
UPDATE sections SET sort_order = 4  WHERE key = 'projects';
UPDATE sections SET sort_order = 5  WHERE key = 'oss';
UPDATE sections SET sort_order = 6  WHERE key = 'blog';
UPDATE sections SET sort_order = 7  WHERE key = 'diary';
UPDATE sections SET sort_order = 8  WHERE key = 'term';
UPDATE sections SET sort_order = 9  WHERE key = 'talks';
UPDATE sections SET sort_order = 10 WHERE key = 'reading';
UPDATE sections SET sort_order = 11 WHERE key = 'uses';
UPDATE sections SET sort_order = 12 WHERE key = 'education';
UPDATE sections SET sort_order = 13 WHERE key = 'contact';

-- migrate:down

-- No-op: previous sort_order values were inconsistent; nothing meaningful to restore.
