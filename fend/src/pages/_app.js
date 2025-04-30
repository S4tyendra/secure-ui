import "@/styles/globals.css";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout/layout";
import { useEffect } from "react";
import { getAuthToken } from "@/hooks/useApi"; // Import the function to get token from localStorage

const LOGIN_PATH = "/"; // Assuming login is at the root
const PROTECTED_ROOT = "/dashboard";

const isDashboardPage = (pathname) => {
  return pathname.startsWith(PROTECTED_ROOT);
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // This code runs only on the client-side
    const token = getAuthToken();
    const currentPath = router.pathname;

    // If trying to access a protected page without a token, redirect to login
    if (isDashboardPage(currentPath) && !token) {
      console.log("_app: No token, redirecting to login from", currentPath);
      router.push(LOGIN_PATH);
    }

    // If trying to access the login page with a token, redirect to dashboard
    if (currentPath === LOGIN_PATH && token) {
      console.log("_app: Has token, redirecting to dashboard from login");
      router.push(PROTECTED_ROOT);
    }

    // Dependency array includes router to satisfy lint rule and ensure stability
  }, [router.pathname, router]); // Added router to dependency array

  // Determine layout based on route *after* potential redirect
  const PageComponent = isDashboardPage(router.pathname) ? (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  ) : (
    <Component {...pageProps} />
  );

  // Render null while redirecting to prevent flashing incorrect page/layout
  const token = typeof window !== "undefined" ? getAuthToken() : null; // Need to re-check token client-side
  if (
    (isDashboardPage(router.pathname) && !token) ||
    (router.pathname === LOGIN_PATH && token)
  ) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {PageComponent}
    </ThemeProvider>
  );
}

export default MyApp;
