import { redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? '/app' : '/login');
}
