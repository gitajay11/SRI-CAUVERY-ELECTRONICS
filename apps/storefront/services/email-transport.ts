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
 *              an app password, Zoho…), from SMTP_HOST / SMTP_USER /
 *              SMTP_PASS, or from a single SMTP_URL.
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

/**
 * The SMTP settings, as separate fields or as one URL.
 *
 * Separate fields are the kinder shape for a Gmail app password, which
 * Google hands out as four groups of letters with spaces between them: the
 * spaces are dropped here, so it can be pasted exactly as shown. A URL
 * would need them percent-encoded, and a mistake there fails in a way
 * that is hard to see.
 */
function smtpSettings(): string | nodemailer.TransportOptions {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return required('SMTP_URL');
  const port = Number(process.env.SMTP_PORT?.trim() || 465);
  return {
    host,
    port,
    // 465 is implicit TLS; 587 and the rest start plain and upgrade.
    secure: (process.env.SMTP_SECURE?.trim() ?? (port === 465 ? 'true' : 'false')) === 'true',
    auth: {
      user: required('SMTP_USER'),
      pass: required('SMTP_PASS').replace(/\s+/g, ''),
    },
  } as nodemailer.TransportOptions;
}

function smtp(): nodemailer.Transporter {
  // One connection pool per process. A serverless function that sends one
  // email and exits gets no benefit, but a long-running server does, and
  // neither is hurt.
  transporter ??= nodemailer.createTransport(smtpSettings());
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
