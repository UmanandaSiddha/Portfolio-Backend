-- migrate:up

-- Seed from client/lib/data.ts. Idempotent: re-runs replace singletons + skip existing collection rows by natural key.

-- Site identity
INSERT INTO site_identity (id, name, role, email, phone, location, github, linkedin, site_url)
VALUES (
    1,
    'Umananda Siddha',
    'Software Engineer · Backend-leaning full-stack',
    'umanandasiddha243@gmail.com',
    '+91 7086400395',
    'Assam, India',
    'UmanandaSiddha',
    'umananda-siddha-399b95217',
    'umananda.vercel.app'
)
ON CONFLICT (id) DO UPDATE SET
    name=EXCLUDED.name, role=EXCLUDED.role, email=EXCLUDED.email,
    phone=EXCLUDED.phone, location=EXCLUDED.location, github=EXCLUDED.github,
    linkedin=EXCLUDED.linkedin, site_url=EXCLUDED.site_url;

-- Status
INSERT INTO site_status (id, available, currently_at)
VALUES (1, 'Open to collaborations', 'Ovlox (Learn With Stack)')
ON CONFLICT (id) DO UPDATE SET available=EXCLUDED.available, currently_at=EXCLUDED.currently_at;

-- Hero
INSERT INTO hero (id, eyebrow, headline, lede, current_card, stack_pills)
VALUES (
    1,
    'Portfolio · 2026 · Vol. 04',
    ARRAY['Notes from a','backend that','mostly stays up.'],
    'I''m Umananda — I build *quiet* backends and the glue that holds product teams together. Lately: a project-tracking platform for non-technical founders, a RAG layer over GitHub/Slack/Linear chaos, and caching wins that shaved 40% off p95. This site is half portfolio, half field journal — there''s a terminal you can actually type in, and a diary where I sometimes admit Docker beat me.',
    '{"label":"// currently","body":"Building Ovlox at Learn With Stack.","badge":"●  live"}'::jsonb,
    ARRAY['TypeScript','NestJS','PostgreSQL','Redis','Next.js','Docker','AWS','GraphQL','WebRTC','PostGIS','BullMQ','Prisma']
)
ON CONFLICT (id) DO UPDATE SET
    eyebrow=EXCLUDED.eyebrow, headline=EXCLUDED.headline, lede=EXCLUDED.lede,
    current_card=EXCLUDED.current_card, stack_pills=EXCLUDED.stack_pills;

-- About
INSERT INTO about (id, prose, footnote)
VALUES (
    1,
    ARRAY[
      'I started writing code because I wanted to build things that worked the way I thought they should — which, as it turns out, is the entire job description of ''software engineer.'' I''m currently at Ovlox (part of Learn With Stack), where I''m wiring up a modular NestJS + Postgres backend so non-technical founders can see what their engineering teams are actually shipping.',
      'Before that, I spent a year at Savora Eats making a food-discovery API feel fast — Redis, async jobs, PostGIS for the geo bits. I like the middle-of-the-stack problems: the ones where a query plan, a cache key, and a business requirement all have opinions and you''re the one holding the pen.',
      'Outside the day job: WebRTC experiments, a medical-OCR hackathon project that won a Special Mention at NIT Silchar, and running the dev group at Tezpur University where I''m currently finishing B.Tech ECE.'
    ],
    '// TL;DR — TypeScript, NestJS, Postgres, Redis, Docker. Will argue about indexes at parties.'
)
ON CONFLICT (id) DO UPDATE SET prose=EXCLUDED.prose, footnote=EXCLUDED.footnote;

-- Side facts (insert only if table is empty)
INSERT INTO side_facts (k, v, sort_order)
SELECT * FROM (VALUES
    ('Based in',   'Assam, IN · GMT+5:30',         0),
    ('Currently',  'Ovlox · SWE',                  1),
    ('Specialty',  'Backends, APIs, data plumbing',2),
    ('Stack',      'NestJS · PG · Redis',          3),
    ('Studying',   'B.Tech ECE ''26',              4),
    ('Coffee',     'Black, no ceremony',           5)
) AS v(k, v, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM side_facts);

-- Projects (insert by slug only if not present)
INSERT INTO projects (slug, name, sub, summary, tags, sort_order)
SELECT * FROM (VALUES
    ('ovlox',   'Ovlox',           'nestjs · postgres · nextjs · rag · 2025–present',
     'Project-tracking platform that translates engineering chaos into something a non-technical founder can read over coffee.',
     ARRAY['NestJS','PostgreSQL','Next.js','RAG'], 0),
    ('upesto',  'Upesto',          'savora eats · redis · postgis · aws · 2024–25',
     'Made a food-discovery API 40% faster and taught it where the nearest biryani actually is.',
     ARRAY['NestJS','Redis','PostGIS','AWS S3'], 1),
    ('vrixaa',  'Vrixaa Labs LMS', 'graphql · docker · ffmpeg · monaco · intern · 2024',
     'GraphQL backend for an LMS, plus a code-execution sandbox that didn''t catch fire.',
     ARRAY['GraphQL','Docker','FFmpeg'], 2),
    ('voolata', 'Voolata',         'evool foundation · razorpay · qr · freelance · 2023–24',
     'Donations platform for a non-profit — one-time and recurring, with webhooks that actually reconcile.',
     ARRAY['Razorpay','Node.js','QR'], 3)
) AS v(slug, name, sub, summary, tags, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE projects.slug = v.slug);

-- Project metrics
WITH p AS (SELECT id, slug FROM projects)
INSERT INTO project_metrics (project_id, k, v, sort_order)
SELECT p.id, m.k, m.v, m.idx FROM p
JOIN LATERAL (
    SELECT * FROM (VALUES
        ('ovlox',   'integrations',   '5',       0),
        ('ovlox',   'contract',       '1 API',   1),
        ('ovlox',   'Q&A layer',      'RAG',     2),
        ('upesto',  'p95 drop',       '40%',     0),
        ('upesto',  'geo search',     'PostGIS', 1),
        ('upesto',  'presigned',      'S3',      2),
        ('vrixaa',  'API',            'GraphQL', 0),
        ('vrixaa',  'sandbox',        'Docker',  1),
        ('vrixaa',  'pipeline',       'FFmpeg',  2),
        ('voolata', 'payment modes',  '2',       0),
        ('voolata', 'campaign links', 'QR',      1),
        ('voolata', 'signed',         'Webhooks',2)
    ) AS x(slug, k, v, idx) WHERE x.slug = p.slug
) m ON true
WHERE NOT EXISTS (SELECT 1 FROM project_metrics WHERE project_metrics.project_id = p.id);

-- Project bullets
WITH p AS (SELECT id, slug FROM projects)
INSERT INTO project_bullets (project_id, body, sort_order)
SELECT p.id, b.body, b.idx FROM p
JOIN LATERAL (
    SELECT * FROM (VALUES
        ('ovlox',   'Modular NestJS + PostgreSQL backend with clean API contracts.', 0),
        ('ovlox',   'Integrations: GitHub, Slack, Discord, Jira, Linear.', 1),
        ('ovlox',   'RAG-based Q&A layer over unified project context.', 2),
        ('ovlox',   'Next.js app for the founder-facing reporting surface.', 3),
        ('upesto',  'Redis caching + async background jobs for non-critical workloads.', 0),
        ('upesto',  'Geo-search + location features on NestJS + PostgreSQL + PostGIS.', 1),
        ('upesto',  'Google Maps integration for distance, matrix, and directions.', 2),
        ('upesto',  'AWS S3 presigned URLs for media — reduced backend load, improved reliability.', 3),
        ('vrixaa',  'GraphQL backend with secure multi-device auth + refresh-token rotation.', 0),
        ('vrixaa',  'Dockerized code-execution service wired to a Monaco Editor integration.', 1),
        ('vrixaa',  'FFmpeg-based video pipeline for course content.', 2),
        ('voolata', 'One-time + subscription donations via Razorpay with secure webhooks.', 0),
        ('voolata', 'QR-based campaign pages and tracking workflows.', 1),
        ('voolata', 'End-to-end freelance delivery — requirements to deploy.', 2)
    ) AS x(slug, body, idx) WHERE x.slug = p.slug
) b ON true
WHERE NOT EXISTS (SELECT 1 FROM project_bullets WHERE project_bullets.project_id = p.id);

-- OSS repos
INSERT INTO oss_repos (name, repo, description, lang, stars, updated_label, sort_order)
SELECT * FROM (VALUES
    ('Media-Server-WebRTC', 'UmanandaSiddha/Media-Server-WebRTC',
     'Multi-user video conferencing with a mediasoup SFU, WebSocket signaling, room handling, and reconnection flows.',
     'TypeScript', 42, '2 weeks ago', 0),
    ('MediCode', 'UmanandaSiddha/MediCode',
     'OCR-to-LLM pipeline for extracting and summarizing medical text. Special Mention, NIT Silchar Hackathon ''24.',
     'Python', 28, '3 months ago', 1),
    ('nest-rate-limiter', 'UmanandaSiddha/nest-rate-limiter',
     'Small NestJS decorator I use everywhere — sliding-window limiter backed by Redis, because express-rate-limit doesn''t spark joy.',
     'TypeScript', 14, '5 weeks ago', 2),
    ('pg-geojson-helpers', 'UmanandaSiddha/pg-geojson-helpers',
     'A handful of SQL helpers for PostGIS-in-production: sane indexes, bounding-box search, and a distance sort that won''t scan.',
     'SQL', 9, '2 months ago', 3)
) AS v(name, repo, description, lang, stars, updated_label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM oss_repos);

-- Talks
INSERT INTO talks (when_label, title, where_label, sort_order)
SELECT * FROM (VALUES
    ('OCT·2025', 'Caching for people who have been burned by caching.', 'GDG Tezpur · 60 attendees', 0),
    ('AUG·2025', 'PostGIS in production: three functions and a GIST.',  'BackendIndia meetup · online', 1),
    ('MAR·2025', 'Intro to WebRTC, for the reluctant backend engineer.', 'Tezpur University · ECE Dept', 2),
    ('JAN·2024', 'OCR + LLMs for medical text extraction.',              'NIT Silchar Hackathon · Special Mention', 3)
) AS v(when_label, title, where_label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM talks);

-- Books
INSERT INTO books (title, author, status, pct, sort_order)
SELECT * FROM (VALUES
    ('Designing Data-Intensive Applications', 'Kleppmann',         'done',    100, 0),
    ('The Practice of Programming',           'Kernighan & Pike',  'done',    100, 1),
    ('Database Internals',                    'Petrov',            'reading',  62, 2),
    ('Crafting Interpreters',                 'Nystrom',           'reading',  38, 3),
    ('Four Thousand Weeks',                   'Burkeman',          'reading',  80, 4),
    ('The Mythical Man-Month',                'Brooks',            'queued',    0, 5),
    ('A Philosophy of Software Design',       'Ousterhout',        'queued',    0, 6),
    ('Gödel, Escher, Bach',                   'Hofstadter',        'reading',  14, 7)
) AS v(title, author, status, pct, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM books);

-- Uses groups + items
INSERT INTO uses_groups (key, label, sort_order)
SELECT * FROM (VALUES
    ('editor',   '// editor + terminal',     0),
    ('hardware', '// hardware',              1),
    ('stack',    '// stack · daily drivers', 2)
) AS v(key, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM uses_groups);

WITH g AS (SELECT id, key FROM uses_groups)
INSERT INTO uses_items (group_id, lbl, sub, val, sort_order)
SELECT g.id, i.lbl, i.sub, i.val, i.idx FROM g
JOIN LATERAL (
    SELECT * FROM (VALUES
        ('editor',   'VS Code',                 'with Copilot and zero extensions I don''t actively love', 'primary',  0),
        ('editor',   'Neovim',                  'for quick edits and muscle memory',                       'secondary',1),
        ('editor',   'Warp',                    'because the multiplayer terminal is delightful',          'terminal', 2),
        ('hardware', 'Framework 13',            'Ryzen 7, 32GB — opens, repairs, survives',                'daily',    0),
        ('hardware', 'Keychron K6 Pro',         'brown switches, ISO layout',                               'keyboard', 1),
        ('hardware', 'Logitech MX Master 3S',   'the horizontal scroll is the feature',                    'mouse',    2),
        ('hardware', 'Sony WH-1000XM4',         'for meetings, for focus, for escape',                     'cans',     3),
        ('stack',    'NestJS',                  'opinionated in the right places',                         'server',   0),
        ('stack',    'PostgreSQL',              'boring, excellent',                                       'db',       1),
        ('stack',    'Redis',                   'cache, queue, lock — the swiss army',                     'mem',      2),
        ('stack',    'BullMQ',                  'because cron is not a queue',                             'jobs',     3),
        ('stack',    'Prisma',                  'for the CRUD half; raw SQL for the rest',                 'orm',      4),
        ('stack',    'Next.js',                 'when I have to touch a pixel',                            'client',   5)
    ) AS x(key, lbl, sub, val, idx) WHERE x.key = g.key
) i ON true
WHERE NOT EXISTS (SELECT 1 FROM uses_items WHERE uses_items.group_id = g.id);

-- Now playing
INSERT INTO now_playing (track, artist, sort_order)
SELECT * FROM (VALUES
    ('Lebanese Blonde', 'Thievery Corporation', 0),
    ('Midnight City',   'M83',                  1),
    ('Teardrop',        'Massive Attack',       2),
    ('Alone In Kyoto',  'Air',                  3),
    ('Nude',            'Radiohead',            4)
) AS v(track, artist, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM now_playing);

-- migrate:down

DELETE FROM now_playing;
DELETE FROM uses_items;
DELETE FROM uses_groups;
DELETE FROM books;
DELETE FROM talks;
DELETE FROM oss_repos;
DELETE FROM project_bullets;
DELETE FROM project_metrics;
DELETE FROM projects;
DELETE FROM side_facts;
DELETE FROM about    WHERE id = 1;
DELETE FROM hero     WHERE id = 1;
DELETE FROM site_status WHERE id = 1;
DELETE FROM site_identity WHERE id = 1;
