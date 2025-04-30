import Head from 'next/head';
import LogsList from '@/components/Nginx/LogsList'; // Import the component

export default function NginxLogsPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Logs</title>
        <meta name="description" content="View and manage Nginx log files" />
      </Head>

      <LogsList />
    </>
  );
}