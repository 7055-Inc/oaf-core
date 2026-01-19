import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../../modules/dashboard/components/layout/DashboardShell';
import PersonaForm from '../../../../../modules/dashboard/components/users/PersonaForm';
import { getCurrentUser } from '../../../../../lib/users';

export default function EditPersonaPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = await getCurrentUser();
      
      // Only artists can access this page
      if (user.user_type !== 'artist' && user.user_type !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading || !id) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="error-alert">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h1>Edit Persona</h1>
        <PersonaForm personaId={id} />
      </div>
    </DashboardShell>
  );
}
