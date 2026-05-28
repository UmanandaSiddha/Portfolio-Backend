// Schema types — kept in sync with db/migrations/*.sql by hand until codegen runs.
// To regenerate from a live database: `npm run db:codegen`

import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

// --- Auth ---

export type UserRole = "USER" | "OWNER";
export type AuthProvider = "PASSWORD" | "GOOGLE";

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string | null;
  display_name: string;
  role: Generated<UserRole>;
  avatar_url: string | null;
  email_verified_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface AuthProvidersTable {
  id: Generated<string>;
  user_id: string;
  provider: AuthProvider;
  provider_user_id: string | null;
  created_at: Generated<Timestamp>;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  family_id: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  replaced_by_id: string | null;
  user_agent: string | null;
  ip: string | null;
  created_at: Generated<Timestamp>;
}

export interface EmailVerificationsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface PasswordResetsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

// --- Portfolio singletons ---

export interface SiteIdentityTable {
  id: Generated<number>;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  location: string | null;
  github: string | null;
  linkedin: string | null;
  site_url: string | null;
  avatar_url: string | null;
  spotify_playlist_url: string | null;
  updated_at: Generated<Timestamp>;
}

export interface SiteStatusTable {
  id: Generated<number>;
  available: string;
  currently_at: string | null;
  updated_at: Generated<Timestamp>;
}

export interface HeroTable {
  id: Generated<number>;
  eyebrow: string;
  headline: Generated<string[]>;
  lede: string;
  current_card: Generated<unknown>; // jsonb
  stack_pills: Generated<string[]>;
  updated_at: Generated<Timestamp>;
}

export interface AboutTable {
  id: Generated<number>;
  prose: Generated<string[]>;
  footnote: string | null;
  updated_at: Generated<Timestamp>;
}

// --- Portfolio collections ---

export interface SideFactsTable {
  id: Generated<string>;
  k: string;
  v: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ProjectsTable {
  id: Generated<string>;
  slug: string;
  name: string;
  sub: string;
  summary: string;
  tags: Generated<string[]>;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ProjectMetricsTable {
  id: Generated<string>;
  project_id: string;
  k: string;
  v: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
}

export interface ProjectBulletsTable {
  id: Generated<string>;
  project_id: string;
  body: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
}

export interface ProjectLinksTable {
  id: Generated<string>;
  project_id: string;
  label: string;
  url: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
}

export interface OssReposTable {
  id: Generated<string>;
  name: string;
  repo: string;
  description: string;
  lang: string;
  stars: Generated<number>;
  updated_label: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface TalksTable {
  id: Generated<string>;
  when_label: string;
  title: string;
  where_label: string;
  slides_url: string | null;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export type BookStatus = "done" | "reading" | "queued";

export interface BooksTable {
  id: Generated<string>;
  title: string;
  author: string;
  status: Generated<BookStatus>;
  pct: Generated<number>;
  cover_image_url: string | null;
  buy_url: string | null;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface UsesGroupsTable {
  id: Generated<string>;
  key: string;
  label: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface UsesItemsTable {
  id: Generated<string>;
  group_id: string;
  lbl: string;
  sub: string;
  val: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface NowPlayingTable {
  id: Generated<string>;
  track: string;
  artist: string;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SectionsTable {
  key: string;
  label: string;
  visible: Generated<boolean>;
  sort_order: Generated<number>;
  updated_at: Generated<Timestamp>;
}

export interface ExperienceTable {
  id: Generated<string>;
  role: string;
  company: string;
  location: string | null;
  period: string;
  bullets: Generated<string[]>;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface EducationTable {
  id: Generated<string>;
  institution: string;
  degree: string;
  detail: string | null;
  period: string | null;
  sort_order: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// --- Posts mirror + engagement ---

export type PostKind = "blog" | "diary";
export type ReactionType = "like" | "dislike";
export type SuggestionKind = "topic" | "fix" | "other";
export type SuggestionStatus = "new" | "read" | "archived";

export interface PostsTable {
  id: Generated<string>;
  sanity_id: string;
  kind: PostKind;
  slug: string;
  title: string;
  kicker: string | null;
  published_at: Timestamp | null;
  read_time_min: number | null;
  is_published: Generated<boolean>;
  tags: Generated<string[]>;
  cover_image_url: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PostViewsTable {
  id: Generated<number>;
  post_id: string;
  viewer_hash: string;
  user_id: string | null;
  session_id: string | null;
  viewed_at: Generated<Timestamp>;
}

export interface PostReactionsTable {
  id: Generated<string>;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: Generated<Timestamp>;
}

export interface CommentsTable {
  id: Generated<string>;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface CommentReactionsTable {
  id: Generated<string>;
  comment_id: string;
  user_id: string;
  type: ReactionType;
  created_at: Generated<Timestamp>;
}

export interface SuggestionsTable {
  id: Generated<string>;
  user_id: string;
  body: string;
  kind: Generated<SuggestionKind>;
  status: Generated<SuggestionStatus>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// --- Subscriptions ---

export type DeliveryStatus = "queued" | "sent" | "bounced" | "failed";

export interface SubscriptionsTable {
  id: Generated<string>;
  email: string;
  token_hash: string;
  confirmed_at: Timestamp | null;
  unsubscribed_at: Timestamp | null;
  source: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface SubscriptionDeliveriesTable {
  id: Generated<number>;
  subscription_id: string;
  post_id: string;
  status: Generated<DeliveryStatus>;
  sent_at: Timestamp | null;
  error: string | null;
  created_at: Generated<Timestamp>;
}

// --- Root ---

export interface DB {
  users: UsersTable;
  auth_providers: AuthProvidersTable;
  refresh_tokens: RefreshTokensTable;
  email_verifications: EmailVerificationsTable;
  password_resets: PasswordResetsTable;

  site_identity: SiteIdentityTable;
  site_status: SiteStatusTable;
  hero: HeroTable;
  about: AboutTable;

  side_facts: SideFactsTable;
  projects: ProjectsTable;
  project_metrics: ProjectMetricsTable;
  project_bullets: ProjectBulletsTable;
  project_links: ProjectLinksTable;
  oss_repos: OssReposTable;
  talks: TalksTable;
  books: BooksTable;
  uses_groups: UsesGroupsTable;
  uses_items: UsesItemsTable;
  now_playing: NowPlayingTable;
  sections: SectionsTable;
  experience: ExperienceTable;
  education: EducationTable;

  posts: PostsTable;
  post_views: PostViewsTable;
  post_reactions: PostReactionsTable;
  comments: CommentsTable;
  comment_reactions: CommentReactionsTable;
  suggestions: SuggestionsTable;

  subscriptions: SubscriptionsTable;
  subscription_deliveries: SubscriptionDeliveriesTable;
}
