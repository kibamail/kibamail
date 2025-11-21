import { Dispatch, SetStateAction, useState } from "react";

export function useToggleState(): ToggleState {
  const state = useState(false);

  return {
    open: state[0],
    onOpenChange: state[1],
  };
}

export interface ToggleState {
  open: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
}
