import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/lib/routes';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect(ROUTES.dashboard);
  }

  redirect(ROUTES.auth.login);
}
