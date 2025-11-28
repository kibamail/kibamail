import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope();

export const metadata: Metadata = {
  title: "kibamail",
  description:
    "The open source aws ses alternative. $0.1/1k emails, 10x the features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.className} antialiased flex flex-col min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
