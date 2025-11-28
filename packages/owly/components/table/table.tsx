import * as React from "react";
import cn from "classnames";

type TableContainerElement = React.ElementRef<"div">;
type TableElement = React.ElementRef<"table">;
type TableHeaderElement = React.ElementRef<"thead">;
type TableBodyElement = React.ElementRef<"tbody">;
type TableFooterElement = React.ElementRef<"tfoot">;
type TableRowElement = React.ElementRef<"tr">;
type TableHeadElement = React.ElementRef<"th">;
type TableCellElement = React.ElementRef<"td">;

interface TableContainerProps extends React.ComponentPropsWithoutRef<"div"> {}
interface TableProps extends React.ComponentPropsWithoutRef<"table"> {}
interface TableHeaderProps extends React.ComponentPropsWithoutRef<"thead"> {}
interface TableBodyProps extends React.ComponentPropsWithoutRef<"tbody"> {}
interface TableFooterProps extends React.ComponentPropsWithoutRef<"tfoot"> {}
interface TableRowProps extends React.ComponentPropsWithoutRef<"tr"> {
  selected?: boolean;
}
interface TableHeadProps extends React.ComponentPropsWithoutRef<"th"> {
  minWidth?: string | number;
}
interface TableCellProps extends React.ComponentPropsWithoutRef<"td"> {
  minWidth?: string | number;
}

const TableContainer = React.forwardRef<
  TableContainerElement,
  TableContainerProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-table-container", className)}
    >
      {children}
    </div>
  );
});

TableContainer.displayName = "Table.Container";

const TableRoot = React.forwardRef<TableElement, TableProps>(
  (props, forwardedRef) => {
    const { className, children, ...tableProps } = props;

    return (
      <table
        {...tableProps}
        ref={forwardedRef}
        className={cn("kb-table", className)}
      >
        {children}
      </table>
    );
  }
);

TableRoot.displayName = "Table.Root";

const TableHeader = React.forwardRef<TableHeaderElement, TableHeaderProps>(
  (props, forwardedRef) => {
    const { className, children, ...theadProps } = props;

    return (
      <thead
        {...theadProps}
        ref={forwardedRef}
        className={cn("kb-table-header", className)}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = "Table.Header";

const TableBody = React.forwardRef<TableBodyElement, TableBodyProps>(
  (props, forwardedRef) => {
    const { className, children, ...tbodyProps } = props;

    return (
      <tbody
        {...tbodyProps}
        ref={forwardedRef}
        className={cn("kb-table-body", className)}
      >
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = "Table.Body";

const TableFooter = React.forwardRef<TableFooterElement, TableFooterProps>(
  (props, forwardedRef) => {
    const { className, children, ...tfootProps } = props;

    return (
      <tfoot
        {...tfootProps}
        ref={forwardedRef}
        className={cn("kb-table-footer", className)}
      >
        {children}
      </tfoot>
    );
  }
);

TableFooter.displayName = "Table.Footer";

const TableRow = React.forwardRef<TableRowElement, TableRowProps>(
  (props, forwardedRef) => {
    const { className, children, selected = false, ...trProps } = props;

    return (
      <tr
        {...trProps}
        ref={forwardedRef}
        className={cn("kb-table-row", className)}
        data-selected={selected}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = "Table.Row";

const TableHead = React.forwardRef<TableHeadElement, TableHeadProps>(
  (props, forwardedRef) => {
    const { className, children, minWidth, style, ...thProps } = props;

    return (
      <th
        {...thProps}
        ref={forwardedRef}
        className={cn("kb-table-head", className)}
        style={{
          ...style,
          minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth,
        }}
      >
        {children}
      </th>
    );
  }
);

TableHead.displayName = "Table.Head";

const TableCell = React.forwardRef<TableCellElement, TableCellProps>(
  (props, forwardedRef) => {
    const { className, children, minWidth, style, ...tdProps } = props;

    return (
      <td
        {...tdProps}
        ref={forwardedRef}
        className={cn("kb-table-cell", className)}
        style={{
          ...style,
          minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth,
        }}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = "Table.Cell";

export {
  TableContainer,
  TableRoot,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableContainer as Container,
  TableRoot as Root,
  TableHeader as Header,
  TableBody as Body,
  TableFooter as Footer,
  TableRow as Row,
  TableHead as Head,
  TableCell as Cell,
};
