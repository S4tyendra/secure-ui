import Head from 'next/head';
import SitesList from '@/components/Nginx/SitesList'; // Import the component

export default function NginxSitesPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Sites</title>
        <meta name="description" content="Manage Nginx site configurations" />
      </Head>

      <h1 className="text-3xl font-bold mb-6">Nginx Site Management</h1>

      <div className=" p-6 rounded shadow">
         {/* Render the SitesList component */}
         <SitesList />
      </div>
    </>
  );
}