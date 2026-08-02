import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserBoards } from '@/actions/board';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const boards = await getUserBoards();

  return <DashboardClient boards={boards} user={session.user} />;
}
