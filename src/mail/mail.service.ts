import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { Env } from "../config/env.schema";

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly env: Env) {
    this.from = `${env.MAIL_FROM_NAME} <noreply@${env.MAIL_FROM_DOMAIN}>`;
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
    if (!this.resend) {
      this.logger.warn("MailService: RESEND_API_KEY missing — emails will be logged to console only.");
    }
  }

  async send(msg: MailMessage): Promise<{ id: string | null }> {
    if (!this.resend) {
      this.logger.log(
        `[mail-dryrun] to=${Array.isArray(msg.to) ? msg.to.join(",") : msg.to} subject=${msg.subject}`,
      );
      this.logger.debug(msg.text);
      return { id: null };
    }
    const res = await this.resend.emails.send({
      from: this.from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      headers: msg.headers,
    });
    if (res.error) {
      this.logger.error(`Resend error: ${JSON.stringify(res.error)}`);
      throw new Error(`Resend send failed: ${res.error.message}`);
    }
    return { id: res.data?.id ?? null };
  }
}
