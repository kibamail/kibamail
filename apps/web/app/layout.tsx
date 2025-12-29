import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ToastProvider } from "@kibamail/owly/toast";
import "./globals.css";

const manrope = Manrope();

const description =
  "The open source aws ses alternative. send emails that land in the inbox, save 95% on your email bill.";

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
    title: "kibamail",
    description,
    siteName: "kibamail",
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
    description: "The open source aws ses alternative. send emails that land in the inbox, save 95% on your email bill.",
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
    <html lang="en">
      <body
        className={`${manrope.className} antialiased flex flex-col overflow-y-auto h-screen`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
