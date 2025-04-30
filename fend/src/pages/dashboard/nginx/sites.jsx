import Head from 'next/head';
import SitesList from '@/components/Nginx/SitesList'; // Import the component

export default function NginxSitesPage() {
  return (
    <>
      <Head>
        <title>Secure UI - Nginx Sites</title>
        <meta name="description" content="Manage Nginx site configurations" />
      </Head>
      <SitesList />


    </>
  );
}