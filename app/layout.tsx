import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope();

export const metadata: Metadata = {
  title: "control-plane.kibaship.com",
  description:
    "Starterkit for building applications for the kibamail organisation.",
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
