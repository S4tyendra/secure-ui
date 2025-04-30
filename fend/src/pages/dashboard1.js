import Head from 'next/head';

// Layout component handles auth check and provides user info/logout

// Placeholder for actual dashboard components - will be moved to specific pages
// import NginxSitesList from '@/components/Nginx/SitesList';
// import NginxLogsList from '@/components/Nginx/LogsList';

export default function Dashboard() {
  // Auth check and user fetching is handled by the Layout component

  return (
    <> {/* Use Fragment as parent element */}
      <Head>
        <title>Secure UI - Dashboard</title>
        <meta name="description" content="Secure UI Management Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Content area within the Layout */}
      <h1 className="text-3xl font-bold mb-6">Dashboard Home</h1>

      <div className="bg-white p-6 rounded shadow">
          <p className="text-lg">Welcome to the SecureUI dashboard.</p>
          <p className="mt-2 text-gray-600">Use the sidebar navigation to manage Nginx configurations, view logs, and perform actions.</p>
          {/* Logout button is now in the Layout's sidebar */}
      </div>

      {/* TODO: Maybe add some summary widgets here later */}
    </>
  );
}