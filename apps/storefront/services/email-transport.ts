import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Sending an email.
 *
 * One function, three ways out, chosen by EMAIL_PROVIDER:
 *
 *   console  — logs the envelope and sends nothing. The default, so a
 *              development machine never emails a real customer.
 *   smtp     — any mailbox with SMTP (the shop's own domain mail, Gmail with
 *              an app password, Zoho…), from SMTP_URL.
 *   resend   — Resend's HTTP API, from RESEND_API_KEY; no ports to open.
 *
 * Misconfiguration fails loudly here rather than dropping mail on the
 * floor: a provider named without its credentials throws, and the caller
 * decides whether that may fail the operation (it never fails an order).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set; EMAIL_PROVIDER needs it.`);
  return value;
}

/** The sender, as "Name <address>". */
function from(): string {
  return required('EMAIL_FROM');
}

let transporter: nodemailer.Transporter | null = null;

function smtp(): nodemailer.Transporter {
  // One connection pool per process. A serverless function that sends one
  // email and exits gets no benefit, but a long-running server does, and
  // neither is hurt.
  transporter ??= nodemailer.createTransport(required('SMTP_URL'));
  return transporter;
}

async function viaResend(message: EmailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${required('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      reply_to: message.replyTo,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend answered ${response.status}: ${detail.slice(0, 200)}`);
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER?.trim() || 'console';

  switch (provider) {
    case 'console':
      console.info(`[email] to=${message.to} subject="${message.subject}"`);
      return;
    case 'smtp':
      await smtp().sendMail({
        from: from(),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
      });
      return;
    case 'resend':
      await viaResend(message);
      return;
    default:
      throw new Error(`EMAIL_PROVIDER="${provider}" is not one of console, smtp, resend.`);
  }
}

/** Whether mail actually leaves the building with the current settings. */
export function emailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER?.trim() || 'console';
  return provider !== 'console';
}
