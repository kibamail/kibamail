import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as Table from "./table";

import "./table.css";

const meta: Meta<typeof Table> = {
  title: "Components/Table",
};

type TableStoryFn = StoryFn<typeof Table>;

export const Default: TableStoryFn = () => {
  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Name</Table.Head>
            <Table.Head>Email</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Role</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>John Doe</Table.Cell>
            <Table.Cell>john@example.com</Table.Cell>
            <Table.Cell>Active</Table.Cell>
            <Table.Cell>Admin</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Jane Smith</Table.Cell>
            <Table.Cell>jane@example.com</Table.Cell>
            <Table.Cell>Active</Table.Cell>
            <Table.Cell>User</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Bob Johnson</Table.Cell>
            <Table.Cell>bob@example.com</Table.Cell>
            <Table.Cell>Inactive</Table.Cell>
            <Table.Cell>User</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Alice Williams</Table.Cell>
            <Table.Cell>alice@example.com</Table.Cell>
            <Table.Cell>Active</Table.Cell>
            <Table.Cell>Editor</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
};

export const WithFooter: TableStoryFn = () => {
  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Product</Table.Head>
            <Table.Head>Quantity</Table.Head>
            <Table.Head>Price</Table.Head>
            <Table.Head>Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Widget A</Table.Cell>
            <Table.Cell>5</Table.Cell>
            <Table.Cell>$10.00</Table.Cell>
            <Table.Cell>$50.00</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Widget B</Table.Cell>
            <Table.Cell>3</Table.Cell>
            <Table.Cell>$15.00</Table.Cell>
            <Table.Cell>$45.00</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Widget C</Table.Cell>
            <Table.Cell>7</Table.Cell>
            <Table.Cell>$8.00</Table.Cell>
            <Table.Cell>$56.00</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell>Subtotal</Table.Cell>
            <Table.Cell>$151.00</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </Table.Container>
  );
};

export default meta;
