"use client";

import * as Alert from "@kibamail/owly/alert";
import { Button } from "@kibamail/owly/button";
import { Heading } from "@kibamail/owly/heading";
import * as SelectField from "@kibamail/owly/select-field";
import { Text } from "@kibamail/owly/text";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import cn from "classnames";
import {
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Hashtag,
  InfoCircle,
  Mail,
  MapPin,
  NavArrowRight,
  Number0Square,
  Phone,
  Plus,
  Text as TextIcon,
} from "iconoir-react";
import { useRef, useState } from "react";
import { CreateContactPropertyModal } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/create-contact-property-modal";
import {
  type ContactProperties,
  type PropertyType,
  useImportContactsStore,
} from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/store/import-contacts-store";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

type SelectFieldPropertyState = Record<
  string,
  {
    open: boolean;
    property: {
      id: string;
      name: string;
      type: PropertyType;
    };
  }
>;

const standardProperties = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "city",
] as const;
const standardPropertyNames = [
  "Email address",
  "First name",
  "Last name",
  "Phone",
  "Country",
  "Timezone",
  "City",
] as const;

function mapDbTypeToPropertyType(dbType: string): PropertyType {
  switch (dbType) {
    case "STRING":
      return "text";
    case "NUMBER":
      return "number";
    case "DATE":
      return "date";
    default:
      return "text";
  }
}

function getPropertyIcon(
  type: PropertyType,
): React.ComponentType<{ className?: string }> {
  switch (type) {
    case "date":
      return Calendar;
    case "number":
      return Number0Square;
    case "text":
      return TextIcon;
    default:
      return TextIcon;
  }
}

export function StepTwoMatchHeaders() {
  const queryClient = useQueryClient();
  const {
    propertiesMap,
    headerCounts,
    headerSamples,
    contactProperties,
    prevStep,
    nextStep,
    setContactProperties,
  } = useImportContactsStore();

  const matchingErrorAlertRef = useRef<HTMLDivElement | null>(null);
  const createPropertyModalState = useToggleState();
  const [columnForNewProperty, setColumnForNewProperty] = useState("");

  const { data: dbContactProperties } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: async () => {
      const response = await internalApi.contactProperties().list();
      return response.data;
    },
  });

  const [selectFieldPropertyStates, setSelectFieldPropertyStates] =
    useState<SelectFieldPropertyState>(() => {
      const defaultFieldPropertyStates: SelectFieldPropertyState = {};

      if (contactProperties && Object.keys(contactProperties).length > 1) {
        for (const standardProperty of standardProperties) {
          const value = contactProperties?.[standardProperty];
          if (value) {
            defaultFieldPropertyStates[value] = {
              open: false,
              property: {
                id: standardProperty,
                name: standardPropertyNames[
                  standardProperties.indexOf(standardProperty)
                ],
                type: "standard",
              },
            };
          }
        }

        if (contactProperties.customProperties) {
          for (const column in contactProperties.customProperties) {
            const property = contactProperties.customProperties[column];
            defaultFieldPropertyStates[column] = {
              open: false,
              property: {
                id: property.id,
                name: property.label,
                type: property.type,
              },
            };
          }
        }

        for (const column of propertiesMap.customPropertiesHeaders) {
          if (!defaultFieldPropertyStates[column]) {
            defaultFieldPropertyStates[column] = {
              open: false,
              property: {
                id: "skip",
                name: "None - Skip this column",
                type: "skip",
              },
            };
          }
        }

        return defaultFieldPropertyStates;
      }

      for (const propertyId of standardProperties) {
        const columnName = propertiesMap?.[propertyId];
        if (columnName) {
          defaultFieldPropertyStates[columnName] = {
            open: false,
            property: {
              id: propertyId,
              name: standardPropertyNames[
                standardProperties.indexOf(propertyId)
              ],
              type: "standard",
            },
          };
        }
      }

      for (const column of propertiesMap.customPropertiesHeaders) {
        defaultFieldPropertyStates[column] = {
          open: false,
          property: {
            id: "skip",
            name: "None - Skip this column",
            type: "skip",
          },
        };
      }

      return defaultFieldPropertyStates;
    });

  const customPropertiesFromSelections = Object.keys(selectFieldPropertyStates)
    .filter(
      (column) =>
        selectFieldPropertyStates[column]?.property &&
        selectFieldPropertyStates[column]?.property?.type !== "standard" &&
        selectFieldPropertyStates[column]?.property?.type !== "skip",
    )
    .map((column) => {
      const { property } = selectFieldPropertyStates[column];
      return {
        ...property,
        icon: getPropertyIcon(property.type),
      };
    });

  const uniqueCustomProperties = Array.from(
    new Map(customPropertiesFromSelections.map((p) => [p.id, p])).values(),
  );

  const dbPropertiesFormatted = (dbContactProperties || []).map((prop) => ({
    id: prop.id,
    name: prop.name,
    type: mapDbTypeToPropertyType(prop.type),
    icon: getPropertyIcon(mapDbTypeToPropertyType(prop.type)),
  }));

  const allDbPropertyIds = new Set(dbPropertiesFormatted.map((p) => p.id));
  const filteredCustomProperties = uniqueCustomProperties.filter(
    (p) => !allDbPropertyIds.has(p.id),
  );

  const properties = [
    {
      name: "Email address",
      id: "email",
      type: "standard" as PropertyType,
      icon: Mail,
    },
    {
      name: "First name",
      id: "firstName",
      type: "standard" as PropertyType,
      icon: TextIcon,
    },
    {
      name: "Last name",
      id: "lastName",
      type: "standard" as PropertyType,
      icon: TextIcon,
    },
    {
      name: "Phone",
      id: "phone",
      type: "standard" as PropertyType,
      icon: Phone,
    },
    {
      name: "Country",
      id: "country",
      type: "standard" as PropertyType,
      icon: Globe,
    },
    {
      name: "Timezone",
      id: "timezone",
      type: "standard" as PropertyType,
      icon: Clock,
    },
    {
      name: "City",
      id: "city",
      type: "standard" as PropertyType,
      icon: MapPin,
    },
    ...dbPropertiesFormatted,
    ...filteredCustomProperties,
  ];

  const matches = [
    ...(propertiesMap?.email
      ? [
          {
            column: {
              name: propertiesMap?.email,
              count: headerCounts?.[propertiesMap?.email],
              samples: headerSamples?.[propertiesMap?.email],
            },
          },
        ]
      : []),
    ...(propertiesMap?.firstName
      ? [
          {
            column: {
              name: propertiesMap?.firstName,
              count: headerCounts?.[propertiesMap?.firstName],
              samples: headerSamples?.[propertiesMap?.firstName],
            },
          },
        ]
      : []),
    ...(propertiesMap?.lastName
      ? [
          {
            column: {
              name: propertiesMap?.lastName,
              count: headerCounts?.[propertiesMap?.lastName],
              samples: headerSamples?.[propertiesMap?.lastName],
            },
          },
        ]
      : []),
    ...(propertiesMap?.phone
      ? [
          {
            column: {
              name: propertiesMap?.phone,
              count: headerCounts?.[propertiesMap?.phone],
              samples: headerSamples?.[propertiesMap?.phone],
            },
          },
        ]
      : []),
    ...(propertiesMap?.country
      ? [
          {
            column: {
              name: propertiesMap?.country,
              count: headerCounts?.[propertiesMap?.country],
              samples: headerSamples?.[propertiesMap?.country],
            },
          },
        ]
      : []),
    ...(propertiesMap?.timezone
      ? [
          {
            column: {
              name: propertiesMap?.timezone,
              count: headerCounts?.[propertiesMap?.timezone],
              samples: headerSamples?.[propertiesMap?.timezone],
            },
          },
        ]
      : []),
    ...(propertiesMap?.city
      ? [
          {
            column: {
              name: propertiesMap?.city,
              count: headerCounts?.[propertiesMap?.city],
              samples: headerSamples?.[propertiesMap?.city],
            },
          },
        ]
      : []),
    ...propertiesMap.customPropertiesHeaders.map((header) => ({
      column: {
        name: header,
        count: headerCounts?.[header],
        samples: headerSamples?.[header],
      },
    })),
  ];

  function onCreateNewProperty(column: string) {
    setColumnForNewProperty(column);
    createPropertyModalState.onOpenChange?.(true);
  }

  function onPropertyCreated() {
    queryClient.invalidateQueries({ queryKey: ["contact-properties"] });
  }

  function onPropertyModalClose() {
    createPropertyModalState.onOpenChange?.(false);
    setColumnForNewProperty("");
    onPropertyCreated();
  }

  function onGoBack() {
    prevStep();
  }

  function onFinaliseImport() {
    if (!hasMatchedAllColumns()) {
      callUserAttentionToFormError();
      return;
    }

    const newContactProperties: ContactProperties = {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      country: "",
      timezone: "",
      city: "",
    };

    for (const standardProperty of standardProperties) {
      const assignedColumn = Object.keys(selectFieldPropertyStates).find(
        (column) =>
          selectFieldPropertyStates[column]?.property?.id === standardProperty,
      );

      if (assignedColumn) {
        newContactProperties[standardProperty] = assignedColumn;
      }
    }

    for (const column of Object.keys(selectFieldPropertyStates)) {
      const property = selectFieldPropertyStates[column]?.property;

      if (!property) continue;
      if (property.type === "skip" || property.type === "standard") continue;

      if (!newContactProperties.customProperties) {
        newContactProperties.customProperties = {};
      }

      newContactProperties.customProperties[column] = {
        id: property.id,
        label: property.name,
        type: property.type,
      };
    }

    setContactProperties(newContactProperties);
    nextStep();
  }

  function onSelectPropertyOpenChange(name: string, open: boolean) {
    setSelectFieldPropertyStates((state) => ({
      ...state,
      [name]: { open, property: state?.[name]?.property },
    }));
  }

  function callUserAttentionToFormError() {
    const alert = matchingErrorAlertRef.current;
    if (!alert) return;

    alert.classList.toggle("animate-shake");

    alert.addEventListener(
      "animationend",
      () => {
        alert.classList.remove("animate-shake");
      },
      { once: true },
    );
  }

  function onSelectPropertyValueChange(column: string, value: string) {
    if (value === "skip") {
      setSelectFieldPropertyStates((state) => ({
        ...state,
        [column]: {
          open: false,
          property: {
            id: "skip",
            type: "skip",
            name: "None - Skip this column",
          },
        },
      }));
      return;
    }

    const property = properties.find((p) => p.id === value);
    if (!property) return;

    setSelectFieldPropertyStates((state) => ({
      ...state,
      [column]: {
        open: false,
        property: {
          id: property.id,
          name: property.name,
          type: property.type,
        },
      },
    }));
  }

  function hasPropertyAlreadyBeenMatchedToAColumn(propertyId?: string) {
    if (!propertyId || propertyId === "skip") return false;

    return (
      Object.values(selectFieldPropertyStates).filter(
        (state) => state?.property?.id === propertyId,
      ).length > 1
    );
  }

  function hasMatchedAllColumns() {
    return (
      matches.length ===
      Object.keys(selectFieldPropertyStates).filter(
        (column) => selectFieldPropertyStates[column]?.property,
      ).length
    );
  }

  function hasMatchedAnEmailColumnProperty() {
    return Object.values(selectFieldPropertyStates).some(
      (value) => value?.property?.id === "email",
    );
  }

  function getMatchingErrorAlertContent():
    | {
        title: string;
        description: React.ReactNode;
        variant?: "error" | "warning" | "info";
      }
    | undefined {
    if (!hasMatchedAnEmailColumnProperty()) {
      return {
        title:
          "An email address is required in your csv to complete the import.",
        description:
          "Please make sure you've matched an email address column to the email address property.",
        variant: "error",
      };
    }

    return undefined;
  }

  const matchingErrorAlert = getMatchingErrorAlertContent();

  return (
    <>
      <CreateContactPropertyModal
        open={createPropertyModalState.open}
        onOpenChange={onPropertyModalClose}
      />

      <Heading className="text-left">
        Match your csv to contact properties
      </Heading>

      <Text as="p" className="text-kb-content-secondary">
        Great. We got your csv file. Now, tell us how you want to save the
        contacts from your csv on Kibamail. We need your help mapping every
        header in the csv to a contact property on Kibamail. You may also skip
        any headers you don't need.
      </Text>

      <div className="mt-6 grid grid-cols-1 gap-y-8">
        {matches.map((match, idx) => {
          const hasSelectedProperty =
            !!selectFieldPropertyStates[match.column.name]?.property;

          return (
            <div
              key={match.column.name}
              className="flex flex-col md:flex-row items-start w-full md:gap-x-24"
            >
              <Text className="shrink-0 mb-6 md:mb-0 md:mt-2 text-kb-content-tertiary">
                Column {idx + 1}/{matches.length}
              </Text>

              <div className="flex flex-col w-full">
                <div className="h-9 w-full border border-kb-border-tertiary flex items-center justify-between px-2 rounded-lg bg-kb-bg-disabled">
                  <Text className="text-kb-content-secondary">
                    {match?.column?.name}
                  </Text>
                  <div className="flex gap-x-1 items-center">
                    <Text className="text-kb-content-secondary">
                      {match?.column?.samples?.[0]}
                    </Text>
                    <Text className="text-kb-content-tertiary">
                      +{match?.column?.count}
                    </Text>
                  </div>
                </div>

                <div className="h-16 bg-kb-bg-secondary w-full flex flex-col justify-center relative">
                  <div className="absolute w-px border-l border-kb-border-tertiary h-14 top-1 left-4" />

                  <div className="w-full py-1 bg-kb-bg-secondary z-[1] flex items-center justify-between">
                    <Text
                      size="sm"
                      className="hidden md:inline text-kb-content-secondary"
                    >
                      Matches to the following property on your Kibamail
                      account:
                    </Text>
                    <Text
                      size="sm"
                      className="md:hidden text-kb-content-secondary"
                    >
                      Matches to the following property:
                    </Text>

                    <CheckCircle
                      className={cn("w-4 h-4", {
                        "text-kb-content-disabled": !hasSelectedProperty,
                        "text-kb-content-positive": hasSelectedProperty,
                      })}
                    />
                  </div>
                </div>

                <SelectField.Root
                  open={selectFieldPropertyStates[match.column.name]?.open}
                  value={
                    selectFieldPropertyStates[match.column.name]?.property?.id
                  }
                  onOpenChange={(open) =>
                    onSelectPropertyOpenChange(match.column.name, open)
                  }
                  onValueChange={(value) =>
                    onSelectPropertyValueChange(match.column.name, value)
                  }
                >
                  <SelectField.Trigger placeholder="Select a property" />
                  <SelectField.Content className="z-50">
                    <SelectField.Item value="skip">
                      None - Skip this column
                    </SelectField.Item>
                    <SelectField.Separator />

                    {properties.map((property) => {
                      const Icon = property.icon;
                      return (
                        <SelectField.Item key={property.id} value={property.id}>
                          <Icon className="w-5 h-5" />
                          {property.name}
                        </SelectField.Item>
                      );
                    })}

                    <SelectField.Separator />
                    <button
                      type="button"
                      className="kb-select-item w-full sticky bottom-0 bg-kb-bg-primary flex items-center justify-between px-2 py-2 text-sm rounded-lg hover:bg-kb-bg-secondary cursor-pointer"
                      onClick={() => onCreateNewProperty(match.column.name)}
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create a custom property
                      </span>
                      <NavArrowRight className="w-4 h-4" />
                    </button>
                  </SelectField.Content>

                  {hasPropertyAlreadyBeenMatchedToAColumn(
                    selectFieldPropertyStates[match.column.name]?.property?.id,
                  ) && (
                    <SelectField.Error>
                      You have already matched the{" "}
                      {
                        selectFieldPropertyStates[match.column.name]?.property
                          ?.name
                      }{" "}
                      property to a column. All properties must be uniquely
                      matched.
                    </SelectField.Error>
                  )}
                </SelectField.Root>
              </div>
            </div>
          );
        })}

        {matchingErrorAlert && (
          <Alert.Root
            variant={matchingErrorAlert.variant}
            ref={matchingErrorAlertRef}
          >
            <Alert.Icon>
              <InfoCircle className="w-5 h-5" />
            </Alert.Icon>
            <div className="w-full flex flex-col">
              <Alert.Title className="font-medium">
                {matchingErrorAlert.title}
              </Alert.Title>
              <Text className="text-kb-content-secondary mt-1">
                {matchingErrorAlert.description}
              </Text>
            </div>
          </Alert.Root>
        )}
      </div>

      <div className="mt-12 pb-64 flex items-center justify-between">
        <Button variant="tertiary" onClick={onGoBack}>
          Go back
        </Button>
        <Button onClick={onFinaliseImport}>Finalise import</Button>
      </div>
    </>
  );
}
