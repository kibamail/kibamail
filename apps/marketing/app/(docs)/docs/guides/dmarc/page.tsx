import { EmptyPage } from "@/app/(docs)/docs/_components/empty-page";

export default function DmarcPage() {
  return (
    <EmptyPage
      title="DMARC Configuration"
      description="Set up DMARC policies and reporting to protect your domain from email spoofing attacks."
      category="Deliverability"
    />
  );
}
