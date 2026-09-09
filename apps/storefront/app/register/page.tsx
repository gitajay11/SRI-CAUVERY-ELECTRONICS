import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { buildMetadata } from '@/lib/seo';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = buildMetadata({
  title: 'Create account',
  path: '/register',
  noIndex: true,
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  const { next } = await searchParams;
  if (user) redirect(next?.startsWith('/') ? next : '/account');

  return (
    <div className="container-page flex items-center justify-center py-10 lg:py-16">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
