import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@kibamail/owly/toast";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

const description =
  "send emails that land in the inbox, save 95% on your email bill.";

export const metadata: Metadata = {
  title: {
    default: "Kibamail",
    template: "%s | Kibamail"
  },
  description,
  keywords: ["email", "ses", "aws", "alternative", "open source", "transactional", "marketing"],
  authors: [{ name: "Kibamail" }],
  creator: "Kibamail",
  publisher: "Kibamail",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://kibamail.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kibamail.com",
    title: "kibamail · the open source aws ses alternative",
    description,
    siteName: "Kibamail",
    images: [
      {
        url: "/kibamail-og-meta-image.webp",
        width: 5550,
        height: 2880,
        alt: "Kibamail - Open Source AWS SES Alternative",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "kibamail · the open source aws ses alternative",
    description,
    images: ["/kibamail-og-meta-image.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${ibmPlexMono.variable}`}>
      <body className="font-sans antialiased min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
