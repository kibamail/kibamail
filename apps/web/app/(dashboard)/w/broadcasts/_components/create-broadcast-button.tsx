"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";

export function CreateBroadcastButton() {
  return (
    <Button>
      <Plus className="w-4 h-4" />
      Create Broadcast
    </Button>
  );
}
