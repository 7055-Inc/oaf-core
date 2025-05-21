import { redirect } from 'next/navigation';
import { getUser } from '../lib/db';

export async function checklist(req) {
  const user = await getUser(req.user.userId);
  if (user.status !== 'active' || user.onboarding_completed === 'no') {
    redirect('/profile/setup');
  }
  await pool.query('UPDATE users SET last_checklist_pass = NOW() WHERE id = ?', [req.user.userId]);
  redirect('/dashboard');
} 