/**
 * SOP View Page
 * Display a single SOP document
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { SOPLayout, SOPView } from '../../modules/sop';

export default function SOPViewPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return null;
  }

  return (
    <>
      <Head>
        <title>SOP Details | SOP Center</title>
      </Head>
      <SOPLayout>
        <SOPView sopId={id} />
      </SOPLayout>
    </>
  );
}
