import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/workspace/AuthCard';
import { getPageUser } from '@/lib/server-auth';

export default async function LoginPage() {
  const user = await getPageUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="terminal-grid page-enter flex min-h-screen items-center justify-center px-4 py-12">
      <AuthCard mode="login" />
    </div>
  );
}
