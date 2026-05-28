-- migrate:up

CREATE TABLE experience (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role        text NOT NULL,
    company     text NOT NULL,
    location    text,
    period      text NOT NULL,
    bullets     text[] NOT NULL DEFAULT '{}',
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_experience_touch_updated_at
    BEFORE UPDATE ON experience
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE education (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution  text NOT NULL,
    degree       text NOT NULL,
    detail       text,
    period       text,
    sort_order   integer NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_education_touch_updated_at
    BEFORE UPDATE ON education
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed experience from the CV (most recent first).
INSERT INTO experience (role, company, location, period, bullets, sort_order) VALUES
    ('Software Engineer', 'SportsTechX', 'Berlin, Germany (Remote)', 'Apr 2026 – Present', ARRAY[
        'Refactored core platform architecture and redesigned Supabase schemas to improve scalability and maintainability.',
        'Built modular backend services using NestJS and improved frontend workflows using Next.js.',
        'Optimized data ingestion and querying workflows for platform analytics and intelligence features.',
        'Developing a contextual chatbot feature for platform navigation and user support workflows.'
    ], 0),
    ('Software Engineer Intern', 'Learn With Stack', 'Sheridan, Wyoming, USA (Remote)', 'Nov 2025 – Mar 2026', ARRAY[
        'Built an engineering intelligence platform integrating GitHub, Slack, Jira, Linear, and Discord.',
        'Architected scalable NestJS + PostgreSQL backend services and modular Next.js frontend applications.',
        'Developed unified ingestion pipelines for aggregating engineering workflows and contextual project insights.',
        'Built a RAG-powered Q&A system enabling natural language querying over structured and unstructured project data.'
    ], 1),
    ('Software Engineer Intern', 'Upesto', 'Gurugram, India (Remote)', 'Nov 2024 – Oct 2025', ARRAY[
        'Improved API response times by 40% using Redis caching and BullMQ background jobs.',
        'Built geo-search and location-based features using PostgreSQL + PostGIS and Google Maps APIs.',
        'Designed scalable media upload pipelines using AWS S3 presigned URLs.',
        'Contributed to scalable and fault-tolerant backend architecture decisions.'
    ], 2),
    ('Backend Developer Intern', 'Vrixaa Labs', 'Tezpur, India (Remote)', 'Jun 2024 – Oct 2024', ARRAY[
        'Built a GraphQL backend for an LMS platform with secure multi-device authentication and refresh-token rotation.',
        'Developed a Dockerized code-execution service with Monaco Editor integration for in-browser coding workflows.',
        'Built an FFmpeg-based video processing pipeline for media transformation and streaming workflows.'
    ], 3);

-- Seed education from the CV.
INSERT INTO education (institution, degree, detail, period, sort_order) VALUES
    ('Tezpur University', 'B.Tech in Electronics & Communication Engineering', 'GPA: 7.6 / 10', '2022 – 2026', 0);

-- Register the two new landing-page sections (visibility toggles).
INSERT INTO sections (key, label, visible, sort_order) VALUES
    ('experience', 'Experience', true, 3),
    ('education',  'Education',  true, 12)
ON CONFLICT (key) DO NOTHING;

-- migrate:down

DELETE FROM sections WHERE key IN ('experience', 'education');
DROP TABLE IF EXISTS education;
DROP TABLE IF EXISTS experience;
