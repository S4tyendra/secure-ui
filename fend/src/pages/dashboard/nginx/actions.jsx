import Head from 'next/head';
import NginxActions from '@/components/Nginx/NginxActions'; // Import the component

export default function NginxActionsPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Actions</title>
        <meta name="description" content="Test configuration, reload service, check status" />
      </Head>
      <NginxActions />
    </>
  );
}