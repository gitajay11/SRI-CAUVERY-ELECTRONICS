/**
 * Creates the shop owner's admin account — or, for an owner who is locked
 * out, resets its password.
 *
 *   npm run create-owner --workspace @tamizh/db
 *
 * For a database with no staff at all (a fresh or cleared one), without
 * loading the demo catalogue or the seed's demo accounts, whose passwords are
 * written in the repository and must never reach a live shop.
 *
 * Everything is asked for in the terminal. The password and the connection
 * string are read without echo, so neither lands in shell history, a process
 * list or a log; only the scrypt hash of the password is stored.
 *
 * Also creates the store settings row with its defaults if it is missing,
 * since the panel's settings page needs one to exist.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

for (const root of [process.cwd(), path.join(process.cwd(), '..', '..')]) {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) process.loadEnvFile(full);
  }
}

/** Matches packages/core/crypto.ts: `scrypt$<saltHex>$<hashHex>`. */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

/** The staff password rules from packages/core/validation.ts. */
function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (password.length > 200) return 'That password is too long.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Include both upper and lower case letters.';
  }
  if (!/\d/.test(password)) return 'Include at least one number.';
  return null;
}

/**
 * One line from the terminal. Raw mode, so hidden answers are never echoed —
 * each character shows as a star, so a paste that never arrived is visible
 * as no stars; visible ones are echoed by hand. Ctrl+C quits.
 */
function ask(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          process.stdout.write('\nCancelled — nothing was changed.\n');
          process.exit(130);
        }
        if (char === '\r' || char === '\n') {
          stdin.off('data', onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          // Terminals with bracketed paste wrap a paste in ESC[200~ … ESC[201~;
          // the ESC is dropped below, so drop what follows it here.
          resolve(value.replace(/\[20[01]~/g, '').trim());
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char === '\u0016') {
          // Some terminals hand Ctrl+V to the program instead of pasting.
          process.stdout.write('\n(Ctrl+V did not paste here — right-click to paste instead.)\n' + question + '*'.repeat(hidden ? value.length : 0) + (hidden ? '' : value));
          continue;
        }
        if (char < ' ') continue;
        value += char;
        process.stdout.write(hidden ? '*' : char);
      }
    };
    stdin.on('data', onData);
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'an unreadable address';
  }
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error('Run this in a terminal: it asks for a password and will not read one from a pipe.');
    process.exit(1);
  }

  console.log('Create the owner account for Sri Cauvery Electronics\n');

  const fromEnv = process.env.DATABASE_URL?.trim();
  console.log(
    fromEnv
      ? `Database from .env: ${hostOf(fromEnv)}`
      : 'No DATABASE_URL in .env.',
  );
  const pasted = await ask(
    fromEnv
      ? 'Paste a different connection string (shows as stars), or press Enter to use that one: '
      : 'Paste the connection string (shows as stars): ',
    { hidden: true },
  );
  // Neon's "Connect" dialog also offers the string inside a psql command.
  const connectionString = pasted
    ? /postgres(?:ql)?:\/\/[^\s'"]+/.exec(pasted)?.[0]
    : fromEnv;
  if (!connectionString) {
    console.error('That is not a PostgreSQL connection string. Nothing was changed.');
    process.exit(1);
  }
  console.log(
    `Using ${hostOf(connectionString)} (${pasted ? 'the string you pasted' : 'from .env'}).\n`,
  );

  const email = (await ask('Email: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('That is not an email address. Nothing was changed.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });

    let name = existing?.name ?? '';
    let phone: string | null = null;
    if (existing) {
      console.log(`\n${email} already exists (${existing.name}, ${existing.role}).`);
      const reset = await ask('Reset its password, make it an active owner and sign it out everywhere? (y/N): ');
      if (reset.toLowerCase() !== 'y') {
        console.log('Nothing was changed.');
        return;
      }
    } else {
      name = await ask('Your name: ');
      if (name.length < 1 || name.length > 120) {
        console.error('Enter a name (up to 120 characters). Nothing was changed.');
        process.exit(1);
      }
      const typedPhone = (await ask('Mobile number (optional, 10 digits): ')).replace(/\D/g, '');
      if (typedPhone && !/^[6-9]\d{9}$/.test(typedPhone.slice(-10))) {
        console.error('That is not a 10-digit Indian mobile number. Nothing was changed.');
        process.exit(1);
      }
      phone = typedPhone ? typedPhone.slice(-10) : null;
    }

    console.log('\nPassword: at least 12 characters, upper and lower case letters, and a number.');
    const password = await ask('Password (hidden): ', { hidden: true });
    const problem = passwordProblem(password);
    if (problem) {
      console.error(`${problem} Nothing was changed.`);
      process.exit(1);
    }
    if ((await ask('Type it again (hidden): ', { hidden: true })) !== password) {
      console.error('The two passwords differ. Nothing was changed.');
      process.exit(1);
    }

    const target = hostOf(connectionString);
    const go = await ask(
      `\n${existing ? 'Reset' : 'Create'} the owner ${email} on ${target}? (y/N): `,
    );
    if (go.toLowerCase() !== 'y') {
      console.log('Nothing was changed.');
      return;
    }

    const passwordHash = hashPassword(password);
    await prisma.$transaction(async (tx) => {
      await tx.storeSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default' },
        update: {},
      });

      const owner = existing
        ? await tx.adminUser.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              role: 'SUPER_ADMIN',
              isActive: true,
              deletedAt: null,
              mustChangePassword: false,
            },
            select: { id: true },
          })
        : await tx.adminUser.create({
            data: { email, name, phone, passwordHash, role: 'SUPER_ADMIN' },
            select: { id: true },
          });

      // A reset must end every session the old password opened.
      if (existing) await tx.adminSession.deleteMany({ where: { userId: owner.id } });

      await tx.auditLog.create({
        data: {
          actorId: null,
          actorEmail: 'create-owner script',
          action: existing ? 'staff.owner_reset' : 'staff.owner_created',
          entityType: 'AdminUser',
          entityId: owner.id,
          summary: existing
            ? `Owner ${email} reset from the command line`
            : `Owner ${email} created from the command line`,
        },
      });
    });

    console.log(
      existing
        ? `\nDone. ${email} can sign in with the new password; every old session has been signed out.`
        : `\nDone. Sign in to the admin panel as ${email}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\nCould not finish — nothing was changed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
