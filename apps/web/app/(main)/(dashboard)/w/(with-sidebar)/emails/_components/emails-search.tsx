"use client";

import * as TextField from "@kibamail/owly/text-field";
import { Search } from "iconoir-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function EmailsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");

  const debouncedSearch = useDebouncedCallback(function debouncedSearch(
    searchValue: string,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }

    params.delete("after");
    params.delete("before");

    router.replace(`?${params.toString()}`);
    router.refresh();
  }, 500);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  }

  return (
    <div className="max-w-md w-full">
      <TextField.Root
        placeholder="Search by recipient or subject..."
        name="search"
        value={value}
        onChange={onChange}
      >
        <TextField.Slot side="left">
          <Search />
        </TextField.Slot>
      </TextField.Root>
    </div>
  );
}
