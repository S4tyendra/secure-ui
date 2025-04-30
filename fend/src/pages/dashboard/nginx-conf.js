import Head from 'next/head';
import NginxConfEditor from '@/components/Nginx/NginxConfEditor'; // Import the component

export default function NginxConfPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Configuration</title>
        <meta name="description" content="View and edit the main Nginx configuration file" />
      </Head>

      <h1 className="text-3xl font-bold mb-6">Main Nginx Configuration (nginx.conf)</h1>

      <div className=" rounded shadow">
         {/* Render the NginxConfEditor component */}
         <NginxConfEditor />
      </div>
    </>
  );
}