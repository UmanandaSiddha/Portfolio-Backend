import { Injectable } from "@nestjs/common";
import { filter, map, Observable, Subject } from "rxjs";

export type CommentEvent =
  | {
      type: "created";
      postId: string;
      kind: "blog" | "diary";
      slug: string;
      comment: {
        id: string;
        body: string;
        createdAt: string;
        parentId: string | null;
        author: { id: string; displayName: string; avatarUrl: string | null };
      };
    }
  | {
      type: "deleted";
      postId: string;
      kind: "blog" | "diary";
      slug: string;
      commentId: string;
    }
  | { type: "heartbeat" };

@Injectable()
export class CommentEventsBus {
  private readonly subject = new Subject<CommentEvent>();

  emit(event: CommentEvent) {
    this.subject.next(event);
  }

  /** Stream of events filtered to a specific (kind, slug). Emits a heartbeat every 25s. */
  streamForPost(kind: "blog" | "diary", slug: string): Observable<MessageEvent> {
    const filtered$ = this.subject.asObservable().pipe(
      filter((e) => e.type === "heartbeat" || (e.kind === kind && e.slug === slug)),
    );
    return filtered$.pipe(
      map((event) => ({
        type: event.type,
        data: JSON.stringify(event),
      }) as unknown as MessageEvent),
    );
  }

  startHeartbeat() {
    setInterval(() => this.emit({ type: "heartbeat" }), 25_000).unref();
  }
}
