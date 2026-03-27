"use client";

import type { Spec, StateModel } from "@json-render/core";
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
  useStateStore,
} from "@json-render/react";
import { formRegistry } from "./registry";

interface FormRendererProps {
  spec: Spec;
  initialState?: StateModel;
  onSubmit: (data: StateModel) => Promise<void>;
}

function FormRendererInner({
  spec,
  onSubmit,
}: {
  spec: Spec;
  onSubmit: (data: StateModel) => Promise<void>;
}) {
  const { getSnapshot } = useStateStore();

  return (
    <ActionProvider
      handlers={{
        submitForm: async () => {
          const state = getSnapshot();
          await onSubmit(state);
        },
      }}
    >
      <VisibilityProvider>
        <ValidationProvider>
          <Renderer spec={spec} registry={formRegistry} />
        </ValidationProvider>
      </VisibilityProvider>
    </ActionProvider>
  );
}

/**
 * Main form renderer component.
 *
 * Wraps @json-render/react Renderer with state, action, visibility,
 * and validation providers. Handles form submission via the onSubmit callback.
 */
export function FormRenderer({
  spec,
  initialState,
  onSubmit,
}: FormRendererProps) {
  return (
    <StateProvider initialState={initialState ?? spec.state ?? {}}>
      <FormRendererInner spec={spec} onSubmit={onSubmit} />
    </StateProvider>
  );
}
