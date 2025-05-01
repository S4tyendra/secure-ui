import Head from 'next/head';
import LogsList from '@/components/Nginx/LogsList'; 

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