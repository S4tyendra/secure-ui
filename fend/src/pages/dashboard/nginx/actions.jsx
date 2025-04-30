import Head from 'next/head';
import NginxActions from '@/components/Nginx/NginxActions'; // Import the component

export default function NginxActionsPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Actions</title>
        <meta name="description" content="Test configuration, reload service, check status" />
      </Head>

      <h1 className="text-3xl font-bold mb-6">Nginx Service Actions</h1>

      <div className=" p-6 rounded shadow">
        {/* Render the NginxActions component */}
        <NginxActions />
      </div>
    </>
  );
}