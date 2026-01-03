"use client";

import { Button } from "@kibamail/owly/button";
import { Heading } from "@kibamail/owly/heading";
import { Text } from "@kibamail/owly/text";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { FileUploadDropbox } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/components/file-upload-dropbox";
import { useImportContactsStore } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/store/import-contacts-store";
import { internalApi } from "@/lib/api/client";

interface StepOneUploadCsvProps {
  onClose: () => void;
}

export function StepOneUploadCsv({ onClose }: StepOneUploadCsvProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const formRef = useRef<HTMLFormElement | null>(null);

  const { nextStep, updateFormState } = useImportContactsStore();

  const createImportMutation = useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress: (progress: number) => void;
    }) => {
      return internalApi.contactImports().create(file, onProgress);
    },
  });

  async function parseCsvFile(file: File): Promise<{
    headers: string[];
    headerCounts: Record<string, number>;
    headerSamples: Record<string, string[]>;
    totalRows: number;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim() !== "");

          if (lines.length === 0) {
            reject(new Error("The CSV file is empty"));
            return;
          }

          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/"/g, ""));

          const headerCounts: Record<string, number> = {};
          const headerSamples: Record<string, string[]> = {};

          headers.forEach((header) => {
            headerCounts[header] = 0;
            headerSamples[header] = [];
          });

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i]
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));

            values.forEach((value, index) => {
              if (index < headers.length && value) {
                const header = headers[index];
                headerCounts[header]++;
                if (headerSamples[header].length < 3) {
                  headerSamples[header].push(value);
                }
              }
            });
          }

          const totalRows = lines.length - 1;

          resolve({ headers, headerCounts, headerSamples, totalRows });
        } catch {
          reject(new Error("Failed to parse CSV file"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  function guessPropertiesMap(headers: string[]): {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    timezone: string;
    city: string;
    headers: string[];
    customPropertiesHeaders: string[];
  } {
    const emailPatterns = [
      "email",
      "e-mail",
      "email_address",
      "emailaddress",
      "email address",
      "mail",
      "e_mail",
      "subscriber_email",
      "contact_email",
      "user_email",
      "primary_email",
    ];

    const firstNamePatterns = [
      "firstname",
      "first_name",
      "first name",
      "first",
      "fname",
      "f_name",
      "given_name",
      "givenname",
      "given name",
      "forename",
      "prenom",
    ];

    const lastNamePatterns = [
      "lastname",
      "last_name",
      "last name",
      "last",
      "lname",
      "l_name",
      "surname",
      "family_name",
      "familyname",
      "family name",
      "nom",
    ];

    const phonePatterns = [
      "phone",
      "phone_number",
      "phonenumber",
      "phone number",
      "telephone",
      "tel",
      "mobile",
      "mobile_number",
      "cell",
      "cellphone",
      "cell_phone",
    ];

    const countryPatterns = [
      "country",
      "country_name",
      "countryname",
      "country name",
      "nation",
      "country_code",
      "countrycode",
    ];

    const timezonePatterns = [
      "timezone",
      "time_zone",
      "time zone",
      "tz",
      "time_zone_name",
    ];

    const cityPatterns = [
      "city",
      "city_name",
      "cityname",
      "city name",
      "town",
      "locality",
    ];

    let email = "";
    let firstName = "";
    let lastName = "";
    let phone = "";
    let country = "";
    let timezone = "";
    let city = "";
    const customPropertiesHeaders: string[] = [];

    headers.forEach((header) => {
      const lower = header.toLowerCase().trim();

      if (!email) {
        const isEmail = emailPatterns.some(
          (pattern) => lower === pattern || lower.includes("email"),
        );
        if (isEmail) {
          email = header;
          return;
        }
      }

      if (!firstName) {
        const isFirstName = firstNamePatterns.some(
          (pattern) => lower === pattern,
        );
        if (isFirstName) {
          firstName = header;
          return;
        }
      }

      if (!lastName) {
        const isLastName = lastNamePatterns.some(
          (pattern) => lower === pattern,
        );
        if (isLastName) {
          lastName = header;
          return;
        }
      }

      if (!phone) {
        const isPhone = phonePatterns.some((pattern) => lower === pattern);
        if (isPhone) {
          phone = header;
          return;
        }
      }

      if (!country) {
        const isCountry = countryPatterns.some((pattern) => lower === pattern);
        if (isCountry) {
          country = header;
          return;
        }
      }

      if (!timezone) {
        const isTimezone = timezonePatterns.some(
          (pattern) => lower === pattern,
        );
        if (isTimezone) {
          timezone = header;
          return;
        }
      }

      if (!city) {
        const isCity = cityPatterns.some((pattern) => lower === pattern);
        if (isCity) {
          city = header;
          return;
        }
      }

      customPropertiesHeaders.push(header);
    });

    return {
      email,
      firstName,
      lastName,
      phone,
      country,
      timezone,
      city,
      headers,
      customPropertiesHeaders,
    };
  }

  async function onCsvFileAccepted() {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const file = formData.get("file") as File | null;

    if (!file) {
      return;
    }

    setUploadProgress(0);

    try {
      const { headers, headerCounts, headerSamples, totalRows } =
        await parseCsvFile(file);
      const propertiesMap = guessPropertiesMap(headers);

      const result = await createImportMutation.mutateAsync({
        file,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      updateFormState({
        contactImportId: result.id,
        totalRows,
        headerCounts,
        headerSamples,
        propertiesMap,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      setUploadProgress(0);
      nextStep();
    } catch {
      setUploadProgress(0);
    }
  }

  return (
    <div className="pt-10 lg:pt-24">
      <Heading className="text-center text-kb-content-primary text-2xl mb-4">
        Upload contacts list
      </Heading>

      <Text as="p" className="text-center text-kb-content-secondary">
        By proceeding, you confirm that everyone on the list has given
        permission to be emailed and is fully signed up. We trust that you've
        received consent, so no confirmation emails will be sent to your
        imported contacts.
      </Text>

      <form
        ref={formRef}
        onSubmit={(event: FormEvent) => event.preventDefault()}
      >
        <div className="mt-6">
          <FileUploadDropbox
            isFileUploadingToServer={createImportMutation.isPending}
            fileUploadProgress={uploadProgress}
            onFileAccept={onCsvFileAccepted}
            accept={[".csv"]}
          />
          {createImportMutation.error && (
            <div className="mt-2">
              <Text className="text-kb-content-error text-sm">
                {createImportMutation.error instanceof Error
                  ? createImportMutation.error.message
                  : "Failed to upload CSV file"}
              </Text>
            </div>
          )}
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="tertiary" onClick={onClose}>
          Skip for now
        </Button>

        <div />
      </div>
    </div>
  );
}
