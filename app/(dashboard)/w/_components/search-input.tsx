"use client";

import * as TextField from "@kibamail/owly/text-field";
import { Search } from "iconoir-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ComponentPropsWithoutRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

type SearchInputProps = ComponentPropsWithoutRef<typeof TextField.Root>;

export function SearchInput({
  name = "search",
  placeholder = "Search",
  ...props
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(name) || "");

  const debouncedSearch = useDebouncedCallback(function debouncedSearch(
    searchValue: string
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (searchValue) {
      params.set(name, searchValue);
    } else {
      params.delete(name);
    }

    router.replace(`?${params.toString()}`);
    router.refresh();
  },
  500);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  }

  return (
    <div className="max-w-sm w-full">
      <TextField.Root
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={handleChange}
        {...props}
      >
        <TextField.Slot side="left">
          <Search />
        </TextField.Slot>
      </TextField.Root>
    </div>
  );
}
