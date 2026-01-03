import type { Metadata } from "next";
import "../forms.css";

export const metadata: Metadata = {
  title: "Form",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
