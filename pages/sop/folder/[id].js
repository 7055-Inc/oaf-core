/**
 * SOP Folder Page
 * View SOPs in a specific folder
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { SOPLayout, SOPDashboard } from '../../../modules/sop';

export default function SOPFolderPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Folder | SOP Center</title>
      </Head>
      <SOPLayout>
        <SOPDashboard folderId={id} />
      </SOPLayout>
    </>
  );
}
