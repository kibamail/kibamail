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

export const metadata: Metadata = {
  title: {
    default: "Kibamail",
    template: "%s | Kibamail"
  },
  description:
    "The open source aws ses alternative. send emails that land in the inbox, save 95% on your email bill.",
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
    title: "Kibamail",
    description: "The open source AWS SES alternative. send emails that land in the inbox, save 95% on your email bill.",
    siteName: "Kibamail",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
         alt: "Kibamail logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
     title: "Kibamail",
    description: "The open source AWS SES alternative. send emails that land in the inbox, save 95% on your email bill.",
     images: ["/android-chrome-512x512.png"],
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
