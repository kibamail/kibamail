"use client"

import * as React from "react"
import cn from "classnames"
import { Slot } from "@radix-ui/react-slot"
import { Filter } from "../filter/filter.js"
import type {
  FilterFieldDefinition,
  FilterValue,
} from "../filter/filter.types.js"

export type FilterBuilderElement = React.ElementRef<"div">

export interface FilterBuilderFilter extends FilterValue {
  id: string
}

export interface FilterBuilderProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  fields: FilterFieldDefinition[]
  filters?: FilterBuilderFilter[]
  onChange?: (filters: FilterBuilderFilter[]) => void
  maxFilters?: number
}

export interface FilterBuilderTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  disabled?: boolean
  asChild?: boolean
}

const FilterBuilderContext = React.createContext<{
  fields: FilterFieldDefinition[]
  filters: FilterBuilderFilter[]
  addFilter: () => void
  updateFilter: (id: string, filter: FilterValue) => void
  removeFilter: (id: string) => void
  maxFilters?: number
} | null>(null)

const useFilterBuilderContext = (componentName: string) => {
  const context = React.useContext(FilterBuilderContext)
  if (!context) {
    throw new Error(`${componentName} must be used within FilterBuilder.Root`)
  }
  return context
}

const FilterBuilderRoot = React.forwardRef<FilterBuilderElement, FilterBuilderProps>(
  (props, forwardedRef) => {
    const {
      className,
      fields,
      filters = [],
      onChange,
      maxFilters,
      children,
      ...divProps
    } = props

    const [internalFilters, setInternalFilters] = React.useState<FilterBuilderFilter[]>(filters)

    // Sync with external filters prop
    React.useEffect(() => {
      setInternalFilters(filters)
    }, [filters])

    const generateFilterId = () => `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const addFilter = React.useCallback(() => {
      if (maxFilters && internalFilters.length >= maxFilters) return
      
      const newFilter: FilterBuilderFilter = {
        id: generateFilterId(),
        fieldId: fields[0]?.id || "",
        operatorId: fields[0]?.operators[0]?.id || "",
        value: { type: "none" }
      }

      const updatedFilters = [...internalFilters, newFilter]
      setInternalFilters(updatedFilters)
      onChange?.(updatedFilters)
    }, [internalFilters, maxFilters, fields, onChange])

    const updateFilter = React.useCallback((id: string, filterValue: FilterValue) => {
      const updatedFilters = internalFilters.map(filter =>
        filter.id === id ? { ...filter, ...filterValue } : filter
      )
      setInternalFilters(updatedFilters)
      onChange?.(updatedFilters)
    }, [internalFilters, onChange])

    const removeFilter = React.useCallback((id: string) => {
      const updatedFilters = internalFilters.filter(filter => filter.id !== id)
      setInternalFilters(updatedFilters)
      onChange?.(updatedFilters)
    }, [internalFilters, onChange])

    const contextValue = React.useMemo(() => ({
      fields,
      filters: internalFilters,
      addFilter,
      updateFilter,
      removeFilter,
      maxFilters,
    }), [fields, internalFilters, addFilter, updateFilter, removeFilter, maxFilters])

    return (
      <FilterBuilderContext.Provider value={contextValue}>
        <div
          {...divProps}
          ref={forwardedRef}
          className={cn("kb-filter-builder", className)}
        >
          {children}
        </div>
      </FilterBuilderContext.Provider>
    )
  }
)

FilterBuilderRoot.displayName = "FilterBuilder.Root"

const FilterBuilderTrigger = React.forwardRef<HTMLButtonElement, FilterBuilderTriggerProps>(
  (props, forwardedRef) => {
    const { className, disabled, asChild = false, children, onClick, ...buttonProps } = props
    const { addFilter, maxFilters, filters } = useFilterBuilderContext("FilterBuilder.Trigger")

    const isDisabled = disabled || Boolean(maxFilters && filters.length >= maxFilters)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      addFilter()
      onClick?.(event)
    }

    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        {...buttonProps}
        ref={forwardedRef}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn("kb-filter-builder-trigger", className)}
      >
        {children}
      </Comp>
    )
  }
)

FilterBuilderTrigger.displayName = "FilterBuilder.Trigger"

const FilterBuilderFilters = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  (props, forwardedRef) => {
    const { className, children, ...divProps } = props
    const { fields, filters, updateFilter, removeFilter } = useFilterBuilderContext("FilterBuilder.Filters")

    return (
      <div
        {...divProps}
        ref={forwardedRef}
        className={cn("kb-filter-builder-filters", className)}
      >
        {filters.map((filter) => (
          <div key={filter.id} className="kb-filter-builder-filter-item">
            <Filter
              fields={fields}
              value={filter}
              onChange={(value) => value && updateFilter(filter.id, value)}
              onDelete={() => removeFilter(filter.id)}
            />
          </div>
        ))}
        {children}
      </div>
    )
  }
)

FilterBuilderFilters.displayName = "FilterBuilder.Filters"

// Exports
export {
  FilterBuilderRoot as Root,
  FilterBuilderTrigger as Trigger,
  FilterBuilderFilters as Filters,
  // Aliases
  FilterBuilderRoot,
  FilterBuilderTrigger,
  FilterBuilderFilters,
}
