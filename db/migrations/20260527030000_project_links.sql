-- migrate:up

CREATE TABLE project_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label       text NOT NULL,
    url         text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_links_project ON project_links (project_id, sort_order);

-- migrate:down

DROP TABLE IF EXISTS project_links;
