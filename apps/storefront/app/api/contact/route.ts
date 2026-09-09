import { NextResponse } from 'next/server';
import { created, handleRouteError, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { contactSchema } from '@/lib/validation';
import { sendContactEnquiry } from '@/services/notifications';

/** POST /api/contact — customer enquiry form. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    consume(clientKey(request, 'contact'), LIMITS.contact);
    const body = contactSchema.parse(await readJson(request));

    await sendContactEnquiry({
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      subject: body.subject,
      message: body.message,
    });

    return created({ received: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
