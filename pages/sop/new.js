/**
 * New SOP Page
 * Create a new SOP document
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { SOPLayout, SOPEditor } from '../../modules/sop';

export default function NewSOPPage() {
  const router = useRouter();
  const { folder } = router.query;

  return (
    <>
      <Head>
        <title>Create SOP | SOP Center</title>
      </Head>
      <SOPLayout>
        <div className="sop-page-header">
          <h1>Create New SOP</h1>
        </div>
        <SOPEditor initialFolderId={folder || null} />
      </SOPLayout>
    </>
  );
}
