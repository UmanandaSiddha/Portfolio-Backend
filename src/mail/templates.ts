// Plain-string email templates. Cheap, no build step, easy to diff.
// Each helper returns { subject, html, text } suitable for MailService.send().

function shell(title: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; background: #f5f2ec; padding: 24px; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #d9d2bf; border-radius: 8px; padding: 28px; box-shadow: 0 8px 24px -16px rgba(0,0,0,0.2); }
  .btn { display: inline-block; padding: 11px 18px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 4px; font-family: ui-monospace, "JetBrains Mono", monospace; font-size: 13px; box-shadow: 3px 3px 0 #d97757; }
  .muted { color: #5a564e; font-size: 13px; }
  h1 { font: 500 22px/1.2 Georgia, serif; margin: 0 0 14px; }
  a { color: #b55a3c; }
  hr { border: 0; border-top: 1px dashed #d9d2bf; margin: 24px 0; }
</style></head>
<body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}

export function verifyEmailTemplate(args: { name: string; link: string }) {
  const body = `
    <p>Hi ${args.name},</p>
    <p>Confirm your email so we can finish setting up your account.</p>
    <p><a class="btn" href="${args.link}">Verify email →</a></p>
    <p class="muted">If the button doesn't work, paste this into your browser:<br/><a href="${args.link}">${args.link}</a></p>
    <hr/>
    <p class="muted">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
  `;
  return {
    subject: "Confirm your email",
    html: shell("Confirm your email", body),
    text: `Hi ${args.name},\n\nConfirm your email: ${args.link}\n\nLink expires in 24 hours.`,
  };
}

export function resetPasswordTemplate(args: { name: string; link: string }) {
  const body = `
    <p>Hi ${args.name},</p>
    <p>We received a request to reset your password. Click below to choose a new one.</p>
    <p><a class="btn" href="${args.link}">Reset password →</a></p>
    <p class="muted">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    <hr/>
    <p class="muted">This link expires in 1 hour.</p>
  `;
  return {
    subject: "Reset your password",
    html: shell("Reset your password", body),
    text: `Hi ${args.name},\n\nReset your password: ${args.link}\n\nLink expires in 1 hour. Ignore if you didn't request it.`,
  };
}

export function confirmSubscriptionTemplate(args: { link: string }) {
  const body = `
    <p>Thanks for subscribing!</p>
    <p>Click the button below to confirm so we know it's really you. You'll only get an email when a new blog post is published — no spam, no newsletter rambling.</p>
    <p><a class="btn" href="${args.link}">Confirm subscription →</a></p>
    <p class="muted">If you didn't subscribe, you can ignore this email.</p>
  `;
  return {
    subject: "Confirm your subscription",
    html: shell("Confirm your subscription", body),
    text: `Confirm your subscription: ${args.link}`,
  };
}

export function newBlogPostTemplate(args: {
  title: string;
  kicker: string | null;
  readUrl: string;
  unsubscribeUrl: string;
}) {
  const body = `
    <p>New post:</p>
    <h2 style="font:500 26px/1.2 Georgia, serif; margin:8px 0 6px;">${args.title}</h2>
    ${args.kicker ? `<p style="font-style:italic; color:#5a564e; margin:0 0 18px;">${args.kicker}</p>` : ""}
    <p><a class="btn" href="${args.readUrl}">Read it →</a></p>
    <hr/>
    <p class="muted">You're getting this because you subscribed to new blog posts. <a href="${args.unsubscribeUrl}">Unsubscribe</a>.</p>
  `;
  return {
    subject: `New post: ${args.title}`,
    html: shell(args.title, body),
    text: `${args.title}\n${args.kicker ?? ""}\n\nRead: ${args.readUrl}\n\nUnsubscribe: ${args.unsubscribeUrl}`,
  };
}
