-- migrate:up

-- Rename the "work" landing-page section to "projects" (key + label).
UPDATE sections SET key = 'projects', label = 'Projects' WHERE key = 'work';

-- migrate:down

UPDATE sections SET key = 'work', label = 'Projects' WHERE key = 'projects';
