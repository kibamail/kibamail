import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "./_components/layout/header";
import { ToastProvider } from "@kibamail/owly/toast";
import { Footer } from "./_components/layout/footer";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Kibamail - Email Marketing Platform",
  description:
    "The open-source messaging platform for transactional and marketing email.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.className} ${ibmPlexMono.className} antialiased flex flex-col min-h-screen bg-kb-bg-layout`}
      >
        <ToastProvider>
          <Header />

          <main className="w-full">{children}</main>

          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
