"use client";

import { Button } from "@kibamail/owly/button";
import { Progress } from "@kibamail/owly/progress";
import { Text } from "@kibamail/owly/text";
import { CloudUpload } from "iconoir-react";
import {
  useFileUpload,
  type UseFileUploadProps,
} from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/hooks/use-file-upload";

interface FileUploadDropboxProps extends UseFileUploadProps {
  isFileUploadingToServer?: boolean;
  fileUploadProgress?: number;
  accept?: string[];
}

export function FileUploadDropbox({
  isFileUploadingToServer,
  fileUploadProgress,
  accept,
  ...props
}: FileUploadDropboxProps) {
  const { state, getRootProps, getDropzoneProps, getHiddenInputProps } =
    useFileUpload({
      ...props,
      accept,
      maxFiles: 1,
      isDisabled: isFileUploadingToServer,
      allowDrop: !isFileUploadingToServer,
    });

  return (
    <div className="w-full" {...getRootProps()}>
      <div
        {...getDropzoneProps()}
        className="w-full h-72 rounded-3xl bg-kb-bg-secondary border border-dashed border-kb-border-secondary data-[dragging]:border-kb-border-focus data-[dragging]:bg-kb-bg-info-subtle transition-[border,background] ease-in-out flex items-center justify-center flex-col cursor-pointer hover:bg-kb-bg-tertiary"
      >
        <CloudUpload className="w-12 h-12 text-kb-content-tertiary mb-2" />

        <Text size="lg" className="font-semibold">
          {isFileUploadingToServer
            ? "Uploading..."
            : "Drag and drop your file here"}
        </Text>

        {isFileUploadingToServer ? (
          <div className="w-full max-w-xs flex mt-2 flex-col items-center">
            <Progress value={fileUploadProgress} />

            <Text className="mt-1 text-kb-content-tertiary">
              {isFileUploadingToServer && fileUploadProgress === 100
                ? "Finishing upload..."
                : `${fileUploadProgress}%`}
            </Text>
          </div>
        ) : (
          <Button
            variant="tertiary"
            type="button"
            className="text-kb-content-tertiary -mt-0.5"
          >
            or click here to select from your device
          </Button>
        )}
      </div>

      {state.rejectedFiles.length > 0 ? (
        <Text className="mt-2 text-kb-content-error text-sm">
          You seem to have uploaded an invalid file. Please upload only a file
          with extension {accept?.join(", ")}.
        </Text>
      ) : null}

      <input {...getHiddenInputProps()} name="file" />
    </div>
  );
}
