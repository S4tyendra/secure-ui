import * as React from 'react';
import Head from 'next/head';
import useApi from '@/hooks/useApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, UserCircle, Mail, CalendarDays, CheckCircle, XCircle } from 'lucide-react';

export default function AccountPage() {
  const { request, loading, error } = useApi();
  const [userData, setUserData] = React.useState(null);
  const avatarUrl = "https://cdn.iiitkota.ac.in/site/iiitkota.png"; // Static image

  React.useEffect(() => { 
    const fetchUserData = async () => {
      try {
        const data = await request('/auth/users/me');
        setUserData(data);
      } catch (err) {
        console.error("Failed to fetch user data for account page:", err);
        setUserData(null);
      }
    };
    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Helper to format date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const renderDetailItem = (Icon, label, value) => (
    <div className="flex items-center space-x-3 py-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Secure UI - My Account</title>
        <meta name="description" content="View your account details" />
      </Head>

      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-semibold mb-4">My Account</h1>

        {loading && (
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4 pb-4">
               <Skeleton className="h-20 w-20 rounded-full" />
               <div className="space-y-2">
                 <Skeleton className="h-6 w-40" />
                 <Skeleton className="h-4 w-48" />
               </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Account</AlertTitle>
            <AlertDescription>
              Could not fetch your account details. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {userData && !loading && !error && (
          <Card>
            <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <Avatar className="h-20 w-20 border">
                        <AvatarImage src={avatarUrl} alt={userData.username} />
                        <AvatarFallback className="text-2xl">
                          {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                       <CardTitle className="text-xl">{userData.username || 'N/A'}</CardTitle>
                       <CardDescription>{userData.email || 'No email provided'}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 divide-y">
              {renderDetailItem(UserCircle, "Username", userData.username || 'N/A')}
              {renderDetailItem(Mail, "Email", userData.email || 'N/A')}
              {renderDetailItem(CalendarDays, "Account Created", formatDate(userData.created_at))}
              {renderDetailItem(
                 userData.disabled ? XCircle : CheckCircle,
                 "Account Status",
                 userData.disabled ? "Disabled" : "Enabled"
              )}
              {/* You can add more details here if available from the API */}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}