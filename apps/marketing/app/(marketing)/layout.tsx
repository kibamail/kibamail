import { Header } from "../_components/layout/header";
import { Footer } from "../_components/layout/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-kb-bg-layout">
      <Header />
      <main className="w-full">{children}</main>
      <Footer />
    </div>
  );
}
