import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getSiteSettings } from '@/lib/site-settings';

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getSiteSettings();

    return (
        <>
            <Header phone={settings.phone} whatsapp={settings.whatsapp} />
            <main className="min-h-screen bg-brand-bg">{children}</main>
            <Footer />
            <WhatsAppButton whatsapp={settings.whatsapp} />
        </>
    );
}
