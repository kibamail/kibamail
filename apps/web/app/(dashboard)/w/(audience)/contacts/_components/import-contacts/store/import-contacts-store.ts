"use client";

import { create } from "zustand";

export type PropertyType =
  | "date"
  | "number"
  | "text"
  | "boolean"
  | "standard"
  | "skip";

export interface CustomProperty {
  id: string;
  label: string;
  type: PropertyType;
}

export interface PropertiesMap {
  email: string;
  firstName: string;
  lastName: string;
  headers: string[];
  customPropertiesHeaders: string[];
}

export interface ContactProperties {
  email: string;
  firstName?: string;
  lastName?: string;
  customProperties?: Record<string, CustomProperty>;
}

export interface ImportContactsState {
  step: number;
  contactImportId: string;
  totalRows: number;
  propertiesMap: PropertiesMap;
  headerCounts: Record<string, number>;
  headerSamples: Record<string, string[]>;
  contactProperties: ContactProperties;
}

export interface ImportContactsActions {
  setStep: (step: number | ((prev: number) => number)) => void;
  nextStep: () => void;
  prevStep: () => void;
  setContactImportId: (id: string) => void;
  setPropertiesMap: (map: PropertiesMap) => void;
  setHeaderCounts: (counts: Record<string, number>) => void;
  setHeaderSamples: (samples: Record<string, string[]>) => void;
  setContactProperties: (properties: ContactProperties) => void;
  updateFormState: (state: Partial<ImportContactsState>) => void;
  reset: () => void;
}

const initialState: ImportContactsState = {
  step: 0,
  contactImportId: "",
  totalRows: 0,
  propertiesMap: {
    email: "",
    firstName: "",
    lastName: "",
    headers: [],
    customPropertiesHeaders: [],
  },
  headerCounts: {},
  headerSamples: {},
  contactProperties: {
    email: "",
  },
};

export const useImportContactsStore = create<
  ImportContactsState & ImportContactsActions
>((set) => ({
  ...initialState,

  setStep: (step) =>
    set((state) => ({
      step: typeof step === "function" ? step(state.step) : step,
    })),

  nextStep: () => set((state) => ({ step: state.step + 1 })),

  prevStep: () => set((state) => ({ step: Math.max(0, state.step - 1) })),

  setContactImportId: (contactImportId) => set({ contactImportId }),

  setPropertiesMap: (propertiesMap) => set({ propertiesMap }),

  setHeaderCounts: (headerCounts) => set({ headerCounts }),

  setHeaderSamples: (headerSamples) => set({ headerSamples }),

  setContactProperties: (contactProperties) => set({ contactProperties }),

  updateFormState: (newState) => set((state) => ({ ...state, ...newState })),

  reset: () => set(initialState),
}));
