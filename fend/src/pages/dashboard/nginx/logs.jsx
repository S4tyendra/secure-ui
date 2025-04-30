import Head from 'next/head';
import LogsList from '@/components/Nginx/LogsList'; // Import the component

export default function NginxLogsPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Logs</title>
        <meta name="description" content="View and manage Nginx log files" />
      </Head>

      <h1 className="text-3xl font-bold mb-6">Nginx Log Management</h1>

      <div className=" p-6 rounded shadow">
        {/* Render the LogsList component */}
        <LogsList />
      </div>
    </>
  );
}