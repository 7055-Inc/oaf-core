/**
 * SOP Edit Page
 * Edit an existing SOP document
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { SOPLayout, SOPEditor } from '../../../modules/sop';

export default function SOPEditPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Edit SOP | SOP Center</title>
      </Head>
      <SOPLayout>
        <div className="sop-page-header">
          <h1>Edit SOP</h1>
        </div>
        <SOPEditor sopId={id} />
      </SOPLayout>
    </>
  );
}
