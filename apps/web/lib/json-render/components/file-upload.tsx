"use client";

import { useRef, useState } from "react";
import type { BaseComponentProps } from "@json-render/react";

interface FileUploadProps {
  name: string;
  label?: string | null;
  description?: string | null;
  accept?: string | null;
  maxSize?: number | null;
  maxFiles?: number | null;
}

export function FileUpload({ props, emit }: BaseComponentProps<FileUploadProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const maxFiles = props.maxFiles ?? 1;

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;

    const selected = Array.from(fileList).slice(0, maxFiles);

    if (props.maxSize) {
      const oversized = selected.find((f) => f.size > props.maxSize!);
      if (oversized) return;
    }

    setFiles(selected);
    emit("change");
  }

  return (
    <div className="space-y-2">
      {props.label && (
        <label className="text-sm font-medium leading-none">
          {props.label}
        </label>
      )}
      {props.description && (
        <p className="text-sm text-muted-foreground">{props.description}</p>
      )}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-input p-6 transition-colors hover:border-primary"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          name={props.name}
          accept={props.accept ?? undefined}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {files.length > 0 ? (
          <div className="space-y-1 text-sm">
            {files.map((f) => (
              <div key={f.name} className="text-foreground">
                {f.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click or drag files here
          </p>
        )}
      </div>
    </div>
  );
}
