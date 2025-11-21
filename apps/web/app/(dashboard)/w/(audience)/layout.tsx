import type { PropsWithChildren } from "react";
import { AudienceTabsContainer } from "./_components/audience-tabs-container";

export default async function AudienceLayout({ children }: PropsWithChildren) {
  return (
    <AudienceTabsContainer>{children}</AudienceTabsContainer>
  );
}
