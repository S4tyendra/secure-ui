import '@/styles/globals.css';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes'; 

const isDashboardPage = (pathname) => {
    return pathname.startsWith('/dashboard');
};

function MyApp({ Component, pageProps }) {
    const router = useRouter();

    const PageComponent = isDashboardPage(router.pathname) ? (
        
            <Component {...pageProps} />
        
    ) : (
        <Component {...pageProps} />
    );

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {PageComponent}
        </ThemeProvider>
    );
}

export default MyApp;
