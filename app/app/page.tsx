import { redirect } from 'next/navigation';
import { getPageUser } from '@/lib/server-auth';

export default async function HomePage() {
  const user = await getPageUser();
  redirect(user ? '/dashboard' : '/login');
}
