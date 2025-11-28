"use client"

import * as React from "react";
import cn from "classnames";
import * as Popover from "@radix-ui/react-popover";
import * as TextField from "../text-field/text-field";
import { Calendar } from "../calendar/calendar";
import { CalendarRange } from "../calendar/calendar-range";
import { Checkbox } from "../checkbox/checkbox";
import { Button } from "../button/button";
import type {
  FilterFieldDefinition,
  FilterOperator,
  FilterValue,
  FilterValueData,
} from "./filter.types";

type FilterElement = React.ElementRef<"div">;

interface FilterProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  fields: FilterFieldDefinition[];
  value?: FilterValue;
  onChange?: (value: FilterValue) => void;
  onDelete?: () => void;
}

const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="8"
    height="8"
    viewBox="0 0 8 8"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.145522 0.14647C0.340784 -0.0487921 0.657367 -0.048792 0.852629 0.14647L3.99417 3.28801L7.13571 0.14647C7.33097 -0.0487918 7.64755 -0.0487921 7.84282 0.14647C8.03808 0.341732 8.03808 0.658315 7.84282 0.853577L4.70128 3.99512L7.84282 7.13666C8.03808 7.33192 8.03808 7.6485 7.84282 7.84376C7.64755 8.03903 7.33097 8.03903 7.13571 7.84376L3.99417 4.70222L0.852629 7.84376C0.657367 8.03903 0.340784 8.03903 0.145522 7.84376C-0.0497401 7.6485 -0.0497401 7.33192 0.145522 7.13666L3.28706 3.99512L0.145522 0.853577C-0.0497401 0.658315 -0.0497401 0.341732 0.145522 0.14647Z"
      fill="#B6B2AF"
    />
  </svg>
);

const CheckmarkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="10"
    viewBox="0 0 13 10"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.183061 5.18306C0.427139 4.93898 0.822867 4.93898 1.06694 5.18306L3.95834 8.07445L11.8497 0.183057C12.0938 -0.0610201 12.4895 -0.0610204 12.7336 0.183057C12.9777 0.427135 12.9777 0.822863 12.7336 1.06694L4.40028 9.40028C4.1562 9.64435 3.76047 9.64435 3.51639 9.40028L0.183061 6.06694C-0.0610166 5.82286 -0.0610166 5.42714 0.183061 5.18306Z"
      fill="#716D6A"
    />
  </svg>
);

// Helper to get initial value for operator
const getInitialValueForOperator = (operator: FilterOperator): FilterValueData => {
  const valueInput = operator.valueInput;

  switch (valueInput.type) {
    case "text":
      return { type: "text", value: "" };
    case "number":
      return { type: "number", value: 0 };
    case "date":
      if (valueInput.mode === "single") {
        return { type: "date-single", value: new Date() };
      } else {
        return { type: "date-range", start: new Date(), end: new Date() };
      }
    case "select":
      return { type: "select", value: "" };
    case "multi-select":
      return { type: "multi-select", values: [] };
    case "boolean":
      return { type: "boolean", value: false };
    case "none":
      return { type: "none" };
    default:
      return { type: "text", value: "" };
  }
};

// Helper to format value for display
const formatValueDisplay = (value: FilterValueData | undefined): string => {
  if (!value) return "Enter value";

  switch (value.type) {
    case "text":
      return value.value || "Enter value";
    case "number":
      return value.value.toString();
    case "date-single":
      return value.value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "date-range":
      return `${value.start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${value.end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    case "select":
      return value.label || value.value || "Select option";
    case "multi-select":
      return value.values.length > 0 ? value.values.join(", ") : "Select options";
    case "boolean":
      return value.value ? "Yes" : "No";
    case "none":
      return "—";
    default:
      return "Enter value";
  }
};

const Filter = React.forwardRef<FilterElement, FilterProps>(
  (props, forwardedRef) => {
    const { className, fields, value, onChange, onDelete, ...divProps } = props;

    const [fieldDropdownOpen, setFieldDropdownOpen] = React.useState(false);
    const [operatorDropdownOpen, setOperatorDropdownOpen] = React.useState(false);
    const [valueDropdownOpen, setValueDropdownOpen] = React.useState(false);

    // Initialize with first field and first operator if no value provided
    React.useEffect(() => {
      if (!value && fields.length > 0) {
        const firstField = fields[0];
        const firstOperator = firstField.operators[0];
        onChange?.({
          fieldId: firstField.id,
          operatorId: firstOperator.id,
          value: getInitialValueForOperator(firstOperator),
        });
      }
    }, [value, fields, onChange]);

    const selectedField = fields.find((f) => f.id === value?.fieldId) || fields[0];
    const selectedOperator = selectedField?.operators.find(
      (o) => o.id === value?.operatorId
    ) || selectedField?.operators[0];

    const handleFieldSelect = (field: FilterFieldDefinition) => {
      const firstOperator = field.operators[0];
      onChange?.({
        fieldId: field.id,
        operatorId: firstOperator.id,
        value: getInitialValueForOperator(firstOperator),
      });
      setFieldDropdownOpen(false);
    };

    const handleOperatorSelect = (operator: FilterOperator) => {
      if (!value) return;
      onChange?.({
        ...value,
        operatorId: operator.id,
        value: getInitialValueForOperator(operator),
      });
      setOperatorDropdownOpen(false);
    };

    const handleValueChange = (newValue: FilterValueData) => {
      if (!value) return;
      onChange?.({
        ...value,
        value: newValue,
      });
    };

    // Ref to store temporary date range selection (before Apply is clicked)
    const tempDateRangeRef = React.useRef<Date[]>([]);

    // State for temporary text/number input (before Apply is clicked)
    const [tempTextValue, setTempTextValue] = React.useState<string>("");
    const [tempNumberValue, setTempNumberValue] = React.useState<number>(0);

    // Group fields by category
    const groupedFields = React.useMemo(() => {
      const groups: Record<string, FilterFieldDefinition[]> = {};

      fields.forEach((field) => {
        const category = field.category || "";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(field);
      });

      return groups;
    }, [fields]);

    const renderGroupedFields = () => {
      const uncategorizedFields = groupedFields[""] || [];
      const categorizedGroups = Object.entries(groupedFields).filter(([cat]) => cat !== "");
      const hasCategories = categorizedGroups.length > 0;

      // If no fields have categories, render flat list
      if (!hasCategories) {
        return fields.map((field) => (
          <button
            key={field.id}
            className={cn("kb-filter-dropdown-item", {
              "kb-filter-dropdown-item-selected": field.id === selectedField?.id,
            })}
            onClick={() => handleFieldSelect(field)}
          >
            <span className="kb-filter-dropdown-item-label">{field.label}</span>
            {field.id === selectedField?.id && (
              <CheckmarkIcon />
            )}
          </button>
        ));
      }

      return (
        <>
          {/* Render uncategorized fields first without any label */}
          {uncategorizedFields.map((field) => (
            <button
              key={field.id}
              className={cn("kb-filter-dropdown-item", {
                "kb-filter-dropdown-item-selected": field.id === selectedField?.id,
              })}
              onClick={() => handleFieldSelect(field)}
            >
              <span className="kb-filter-dropdown-item-label">{field.label}</span>
              {field.id === selectedField?.id && (
                <CheckmarkIcon />
              )}
            </button>
          ))}

          {/* Render categorized fields with labels and separators */}
          {categorizedGroups.map(([category, categoryFields], index) => (
            <React.Fragment key={category}>
              {(index > 0 || uncategorizedFields.length > 0) && (
                <div className="kb-filter-dropdown-separator" />
              )}
              <div className="kb-filter-dropdown-group-label">{category}</div>
              {categoryFields.map((field) => (
                <button
                  key={field.id}
                  className={cn("kb-filter-dropdown-item", {
                    "kb-filter-dropdown-item-selected": field.id === selectedField?.id,
                  })}
                  onClick={() => handleFieldSelect(field)}
                >
                  <span className="kb-filter-dropdown-item-label">{field.label}</span>
                  {field.id === selectedField?.id && (
                    <CheckmarkIcon />
                  )}
                </button>
              ))}
            </React.Fragment>
          ))}
        </>
      );
    };

    // Initialize temp values when value dropdown opens
    React.useEffect(() => {
      if (valueDropdownOpen && selectedOperator) {
        const valueInput = selectedOperator.valueInput;

        if (valueInput.type === "text") {
          const currentTextValue = value?.value && value.value.type === "text"
            ? value.value.value
            : "";
          setTempTextValue(currentTextValue);
        } else if (valueInput.type === "number") {
          const currentNumberValue = value?.value && value.value.type === "number"
            ? value.value.value
            : 0;
          setTempNumberValue(currentNumberValue);
        }
      }
    }, [valueDropdownOpen, selectedOperator, value]);

    const renderValueInput = () => {
      if (!selectedOperator) return null;

      const valueInput = selectedOperator.valueInput;
      const closePopover = () => setValueDropdownOpen(false);

      // If operator has custom render, use it
      if (selectedOperator.render) {
        return selectedOperator.render({
          field: selectedField,
          operator: selectedOperator,
          value: value?.value,
          onChange: handleValueChange,
          onClose: closePopover,
        });
      }

      // Otherwise render based on valueInput type
      switch (valueInput.type) {
        case "none":
          return null;

        case "text":
          return (
            <div className="kb-filter-text-input-wrapper">
              <TextField.Root
                type="text"
                size="sm"
                value={tempTextValue}
                onChange={(e) => setTempTextValue(e.target.value)}
                placeholder={valueInput.placeholder || "Enter value"}
                autoFocus
              />
              <Button
                variant="primary"
                size="xs"
                disabled={!tempTextValue.trim()}
                onClick={() => {
                  handleValueChange({ type: "text", value: tempTextValue });
                  closePopover();
                }}
              >
                Apply
              </Button>
            </div>
          );

        case "number":
          return (
            <div className="kb-filter-text-input-wrapper">
              <TextField.Root
                type="number"
                size="sm"
                value={tempNumberValue}
                onChange={(e) => setTempNumberValue(parseFloat(e.target.value) || 0)}
                placeholder="Enter number"
                min={valueInput.min}
                max={valueInput.max}
                step={valueInput.step}
                autoFocus
              />
              <Button
                variant="primary"
                size="xs"
                disabled={tempNumberValue === 0}
                onClick={() => {
                  handleValueChange({ type: "number", value: tempNumberValue });
                  closePopover();
                }}
              >
                Apply
              </Button>
            </div>
          );

        case "date":
          if (valueInput.mode === "single") {
            return (
              <Calendar
                size="sm"
                dates={
                  value?.value && value.value.type === "date-single"
                    ? [value.value.value]
                    : []
                }
                onDatesChange={(dates) => {
                  if (dates.length > 0) {
                    handleValueChange({ type: "date-single", value: dates[0] });
                    closePopover();
                  }
                }}
              />
            );
          } else {
            return (
              <CalendarRange
                size="sm"
                dates={
                  value?.value && value.value.type === "date-range"
                    ? [value.value.start, value.value.end]
                    : []
                }
                onDatesChange={(dates) => {
                  // Store in ref, don't update filter value yet
                  tempDateRangeRef.current = dates;
                }}
                onApply={() => {
                  // Only update filter value when Apply is clicked
                  if (tempDateRangeRef.current.length === 2) {
                    handleValueChange({
                      type: "date-range",
                      start: tempDateRangeRef.current[0],
                      end: tempDateRangeRef.current[1],
                    });
                  }
                  closePopover();
                }}
                onClose={() => closePopover()}
              />
            );
          }

        case "select":
          const currentValue = value?.value && value.value.type === "select"
            ? value.value.value
            : "";

          const handleSelectOption = (optionValue: string, optionLabel: string) => {
            handleValueChange({ type: "select", value: optionValue, label: optionLabel });
            closePopover();
          };

          return (
            <div>
              {valueInput.options.map((option) => (
                <button
                  key={option.value}
                  className={cn("kb-filter-dropdown-item", {
                    "kb-filter-dropdown-item-selected": currentValue === option.value,
                  })}
                  onClick={() => handleSelectOption(option.value, option.label)}
                  type="button"
                >
                  <span className="kb-filter-dropdown-item-label">{option.label}</span>
                  {currentValue === option.value && (
                    <CheckmarkIcon />
                  )}
                </button>
              ))}
            </div>
          );

        case "multi-select":
          const currentValues = value?.value && value.value.type === "multi-select"
            ? value.value.values
            : [];

          const handleMultiSelectToggle = (optionValue: string) => {
            const newValues = currentValues.includes(optionValue)
              ? currentValues.filter((v) => v !== optionValue)
              : [...currentValues, optionValue];

            handleValueChange({ type: "multi-select", values: newValues });
          };

          return (
            <div>
              {valueInput.options.map((option) => (
                <button
                  key={option.value}
                  className="kb-filter-dropdown-item"
                  onClick={() => handleMultiSelectToggle(option.value)}
                  type="button"
                >
                  <Checkbox
                    variant="circle"
                    size="sm"
                    checked={currentValues.includes(option.value)}
                    onCheckedChange={() => handleMultiSelectToggle(option.value)}
                  />
                  <span className="kb-filter-dropdown-item-label">{option.label}</span>
                </button>
              ))}
            </div>
          );

        default:
          return (
            <TextField.Root
              type="text"
              size="sm"
              value={value?.value && value.value.type === "text" ? value.value.value : ""}
              onChange={(e) =>
                handleValueChange({ type: "text", value: e.target.value })
              }
              placeholder="Enter value"
              autoFocus
            />
          );
      }
    };

    const shouldShowValueSegment = selectedOperator?.valueInput.type !== "none";

    return (
      <div
        {...divProps}
        ref={forwardedRef}
        className={cn("kb-filter", className)}
      >
        {/* Field Segment */}
        <Popover.Root open={fieldDropdownOpen} onOpenChange={setFieldDropdownOpen}>
          <Popover.Trigger asChild>
            <button className="kb-filter-segment kb-filter-button">
              {selectedField?.label || "Select field"}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="kb-filter-dropdown"
              align="start"
              sideOffset={4}
            >
              {renderGroupedFields()}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Operator Segment */}
        <Popover.Root
          open={operatorDropdownOpen}
          onOpenChange={setOperatorDropdownOpen}
        >
          <Popover.Trigger asChild>
            <button className="kb-filter-segment kb-filter-button">
              {selectedOperator?.label || "Select operator"}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="kb-filter-dropdown"
              align="start"
              sideOffset={4}
            >
              {selectedField?.operators.map((operator) => (
                <button
                  key={operator.id}
                  className={cn("kb-filter-dropdown-item", {
                    "kb-filter-dropdown-item-selected": operator.id === selectedOperator?.id,
                  })}
                  onClick={() => handleOperatorSelect(operator)}
                >
                  <span className="kb-filter-dropdown-item-label">{operator.label}</span>
                  {operator.id === selectedOperator?.id && (
                    <CheckmarkIcon />
                  )}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Value Segment */}
        {shouldShowValueSegment && (
          <Popover.Root
            open={valueDropdownOpen}
            onOpenChange={setValueDropdownOpen}
          >
            <Popover.Trigger asChild>
              <button className="kb-filter-segment kb-filter-button kb-filter-value">
                {formatValueDisplay(value?.value)}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className={cn("kb-filter-dropdown kb-filter-value-input", {
                  "kb-filter-value-calendar":
                    selectedOperator?.valueInput.type === "date",
                })}
                align="start"
                sideOffset={4}
              >
                {renderValueInput()}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}

        {/* Delete Button */}
        <button
          className="kb-filter-segment kb-filter-delete"
          onClick={onDelete}
          aria-label="Delete filter"
        >
          <DeleteIcon />
        </button>
      </div>
    );
  }
);

Filter.displayName = "Filter";

export { Filter };
