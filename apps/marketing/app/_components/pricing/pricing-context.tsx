"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { type Currency } from "./pricing-config";

interface PricingContextValue {
  emailCount: number;
  setEmailCount: (count: number) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  previousPrice: number;
  setPreviousPrice: (price: number) => void;
}

const PricingContext = createContext<PricingContextValue | null>(null);

interface PricingProviderProps {
  children: ReactNode;
  defaultEmailCount?: number;
  defaultCurrency?: Currency;
}

export function PricingProvider({
  children,
  defaultEmailCount = 50_000,
  defaultCurrency = "usd",
}: PricingProviderProps) {
  const [emailCount, setEmailCount] = useState(defaultEmailCount);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [previousPrice, setPreviousPrice] = useState(0);

  return (
    <PricingContext.Provider
      value={{
        emailCount,
        setEmailCount,
        currency,
        setCurrency,
        previousPrice,
        setPreviousPrice,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
}
