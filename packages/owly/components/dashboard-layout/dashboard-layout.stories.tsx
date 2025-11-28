import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as DashboardLayout from "./dashboard-layout";
import * as UserDropdown from "../user-dropdown/user-dropdown";
import { LetterAvatar } from "../letter-avatar/letter-avatar";
import * as CommandSearch from "../command-search/command-search";
import { Button } from "../button/button";
import {
  User,
  Settings,
  LogOut,
  BookStack,
  HomeAltSlimHoriz,
  SwipeLeftGesture,
  SecureWindow,
  Plus,
} from "iconoir-react";

import "./dashboard-layout.css";
import "../user-dropdown/user-dropdown.css";
import "../letter-avatar/letter-avatar.css";
import "../command-search/command-search.css";
import "../text-field/text-field.css";
import "../button/button.css";
import * as Tabs from "../tabs/tabs";
import * as Table from "../table/table";
import "../table/table.css";
import { Checkbox } from "../checkbox";

// Generate 100 random contacts
const generateContacts = () => {
  const firstNames = [
    "John",
    "Jane",
    "Michael",
    "Sarah",
    "David",
    "Emily",
    "Robert",
    "Lisa",
    "James",
    "Mary",
    "William",
    "Jennifer",
    "Richard",
    "Linda",
    "Thomas",
    "Patricia",
    "Charles",
    "Elizabeth",
    "Daniel",
    "Susan",
    "Matthew",
    "Jessica",
    "Anthony",
    "Nancy",
    "Mark",
    "Karen",
    "Donald",
    "Betty",
    "Steven",
    "Helen",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Thompson",
    "White",
    "Harris",
    "Clark",
    "Lewis",
    "Robinson",
    "Walker",
  ];

  const contacts = [];
  for (let i = 0; i < 100; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    // Generate random date in the past 2 years
    const randomDate = new Date(
      Date.now() - Math.floor(Math.random() * 730 * 24 * 60 * 60 * 1000)
    );
    const dateSubscribed = randomDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    contacts.push({
      name: `${firstName} ${lastName}`,
      email,
      dateSubscribed,
    });
  }

  return contacts;
};

const meta: Meta<typeof DashboardLayout> = {
  title: "Components/DashboardLayout",
};

type DashboardLayoutStoryFn = StoryFn<typeof DashboardLayout>;

export const Default: DashboardLayoutStoryFn = () => {
  const [selectedItem, setSelectedItem] = React.useState("acme");
  const contacts = React.useMemo(() => generateContacts(), []);
  const [selectedRows, setSelectedRows] = React.useState<number[]>([]);

  return (
    <>
      <DashboardLayout.Root>
        <DashboardLayout.SidebarDropdown>
          <UserDropdown.Root>
            <UserDropdown.Trigger>
              <LetterAvatar size="xs" color="info">
                Acme Corp
              </LetterAvatar>
              <span>Acme Corp</span>
            </UserDropdown.Trigger>
            <UserDropdown.Content align="start">
              <UserDropdown.Item
                selected={selectedItem === "acme"}
                onClick={() => setSelectedItem("acme")}
              >
                <LetterAvatar size="xs" color="info">
                  Acme Corp
                </LetterAvatar>
                Acme Corp
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "techstart"}
                onClick={() => setSelectedItem("techstart")}
              >
                <LetterAvatar size="xs" color="positive">
                  TechStart
                </LetterAvatar>
                TechStart
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "designco"}
                onClick={() => setSelectedItem("designco")}
              >
                <LetterAvatar size="xs" color="notice">
                  DesignCo
                </LetterAvatar>
                DesignCo
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "devstudio"}
                onClick={() => setSelectedItem("devstudio")}
              >
                <LetterAvatar size="xs" color="highlight">
                  DevStudio
                </LetterAvatar>
                DevStudio
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item
                selected={selectedItem === "profile"}
                onClick={() => setSelectedItem("profile")}
              >
                <User />
                Profile
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "settings"}
                onClick={() => setSelectedItem("settings")}
              >
                <Settings />
                Settings
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item onClick={() => console.log("Logout clicked")}>
                <LogOut />
                Logout
              </UserDropdown.Item>
            </UserDropdown.Content>
          </UserDropdown.Root>
          <CommandSearch.Root>
            <CommandSearch.Trigger placeholder="Search" />
            <CommandSearch.Content>
              <CommandSearch.Input placeholder="Search..." />
              <CommandSearch.List>
                <CommandSearch.Empty>No results found.</CommandSearch.Empty>
                <CommandSearch.Group heading="Pages">
                  <CommandSearch.Item>
                    <BookStack />
                    Getting started
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <HomeAltSlimHoriz />
                    Dashboard
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <User />
                    Engage
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <SwipeLeftGesture />
                    Send
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <SecureWindow />
                    Settings
                  </CommandSearch.Item>
                </CommandSearch.Group>
                <CommandSearch.Group heading="Actions">
                  <CommandSearch.Item>
                    <Plus />
                    Add broadcast
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <Plus />
                    Add contact
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <Plus />
                    Add segment
                  </CommandSearch.Item>
                </CommandSearch.Group>
              </CommandSearch.List>
              <CommandSearch.Footer />
            </CommandSearch.Content>
          </CommandSearch.Root>
          <DashboardLayout.SidebarGroup title="Navigation">
            <DashboardLayout.SidebarItem active>
              <HomeAltSlimHoriz />
              Dashboard
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <User />
              Engage
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SwipeLeftGesture />
              Send
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SecureWindow />
              Settings
            </DashboardLayout.SidebarItem>
          </DashboardLayout.SidebarGroup>
          <DashboardLayout.SidebarGroup title="Quick Actions">
            <DashboardLayout.SidebarItem>
              <Plus />
              New Broadcast
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <Plus />
              Add Contact
            </DashboardLayout.SidebarItem>
          </DashboardLayout.SidebarGroup>
          <DashboardLayout.SidebarFooter>
            <DashboardLayout.FooterNotes>
              <DashboardLayout.FooterNotesLinkGroup>
                <DashboardLayout.FooterNotesLink>
                  Privacy
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Terms
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Help Center
                </DashboardLayout.FooterNotesLink>
              </DashboardLayout.FooterNotesLinkGroup>
            </DashboardLayout.FooterNotes>
          </DashboardLayout.SidebarFooter>
        </DashboardLayout.SidebarDropdown>
        <DashboardLayout.Sidebar>
          <UserDropdown.Root>
            <UserDropdown.Trigger>
              <LetterAvatar size="xs" color="info">
                Acme Corp
              </LetterAvatar>
              <span>Acme Corp</span>
            </UserDropdown.Trigger>
            <UserDropdown.Content align="start">
              <UserDropdown.Item
                selected={selectedItem === "acme"}
                onClick={() => setSelectedItem("acme")}
              >
                <LetterAvatar size="xs" color="info">
                  Acme Corp
                </LetterAvatar>
                Acme Corp
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "techstart"}
                onClick={() => setSelectedItem("techstart")}
              >
                <LetterAvatar size="xs" color="positive">
                  TechStart
                </LetterAvatar>
                TechStart
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "designco"}
                onClick={() => setSelectedItem("designco")}
              >
                <LetterAvatar size="xs" color="notice">
                  DesignCo
                </LetterAvatar>
                DesignCo
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "devstudio"}
                onClick={() => setSelectedItem("devstudio")}
              >
                <LetterAvatar size="xs" color="highlight">
                  DevStudio
                </LetterAvatar>
                DevStudio
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item
                selected={selectedItem === "profile"}
                onClick={() => setSelectedItem("profile")}
              >
                <User />
                Profile
              </UserDropdown.Item>
              <UserDropdown.Item
                selected={selectedItem === "settings"}
                onClick={() => setSelectedItem("settings")}
              >
                <Settings />
                Settings
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item onClick={() => console.log("Logout clicked")}>
                <LogOut />
                Logout
              </UserDropdown.Item>
            </UserDropdown.Content>
          </UserDropdown.Root>
          <CommandSearch.Root>
            <CommandSearch.Trigger placeholder="Search" />
            <CommandSearch.Content>
              <CommandSearch.Input placeholder="Search..." />
              <CommandSearch.List>
                <CommandSearch.Empty>No results found.</CommandSearch.Empty>
                <CommandSearch.Group heading="Pages">
                  <CommandSearch.Item>
                    <BookStack />
                    Getting started
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <HomeAltSlimHoriz />
                    Dashboard
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <User />
                    Engage
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <SwipeLeftGesture />
                    Send
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <SecureWindow />
                    Settings
                  </CommandSearch.Item>
                </CommandSearch.Group>
                <CommandSearch.Group heading="Actions">
                  <CommandSearch.Item>
                    <Plus />
                    Add broadcast
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <Plus />
                    Add contact
                  </CommandSearch.Item>
                  <CommandSearch.Item>
                    <Plus />
                    Add segment
                  </CommandSearch.Item>
                </CommandSearch.Group>
              </CommandSearch.List>
              <CommandSearch.Footer />
            </CommandSearch.Content>
          </CommandSearch.Root>
          <DashboardLayout.SidebarGroup title="Navigation">
            <DashboardLayout.SidebarItem active>
              <HomeAltSlimHoriz />
              Dashboard
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <User />
              Engage
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SwipeLeftGesture />
              Send
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SecureWindow />
              Settings
            </DashboardLayout.SidebarItem>
          </DashboardLayout.SidebarGroup>
          <DashboardLayout.SidebarGroup title="Quick Actions">
            <DashboardLayout.SidebarItem>
              <Plus />
              New Broadcast
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <Plus />
              Add Contact
            </DashboardLayout.SidebarItem>
          </DashboardLayout.SidebarGroup>
          <DashboardLayout.SidebarFooter>
            <DashboardLayout.FooterNotes>
              <DashboardLayout.FooterNotesLinkGroup>
                <DashboardLayout.FooterNotesLink>
                  Privacy
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Terms
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Help Center
                </DashboardLayout.FooterNotesLink>
              </DashboardLayout.FooterNotesLinkGroup>
            </DashboardLayout.FooterNotes>
          </DashboardLayout.SidebarFooter>
        </DashboardLayout.Sidebar>
        <DashboardLayout.ContentShell>
          <DashboardLayout.Content>
            <DashboardLayout.StickyContentHeaderContainer>
              <DashboardLayout.ContentHeader title="Audience">
                <DashboardLayout.ContentActions>
                  <Button variant="primary">Add Contact</Button>
                </DashboardLayout.ContentActions>
              </DashboardLayout.ContentHeader>

              <Tabs.Root
                defaultValue="contacts"
                variant="secondary"
                style={{ width: "100%" }}
              >
                <Tabs.List>
                  <Tabs.Trigger value="contacts">Contacts</Tabs.Trigger>
                  <Tabs.Trigger value="properties">Properties</Tabs.Trigger>
                  <Tabs.Trigger value="segments">Segments</Tabs.Trigger>
                  <Tabs.Trigger value="groups">Groups</Tabs.Trigger>

                  <Tabs.Indicator />
                </Tabs.List>
              </Tabs.Root>
            </DashboardLayout.StickyContentHeaderContainer>

            <Tabs.Root
              defaultValue="contacts"
              variant="secondary"
              style={{ width: "100%" }}
            >
              <Tabs.Content
                value="contacts"
                style={{ width: "100%", paddingTop: "32px" }}
              >
                <Table.Container>
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head minWidth={64}>
                          <Checkbox />
                        </Table.Head>
                        <Table.Head minWidth={220}>Name</Table.Head>
                        <Table.Head>Email</Table.Head>
                        <Table.Head minWidth={320}>Date Subscribed</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {contacts.map((contact, index) => {
                        const isSelected = selectedRows.includes(index);
                        return (
                          <Table.Row key={index} selected={isSelected}>
                            <Table.Cell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRows([...selectedRows, index]);
                                  } else {
                                    setSelectedRows(
                                      selectedRows.filter((i) => i !== index)
                                    );
                                  }
                                }}
                              />
                            </Table.Cell>
                            <Table.Cell>{contact.name}</Table.Cell>
                            <Table.Cell>{contact.email}</Table.Cell>
                            <Table.Cell>{contact.dateSubscribed}</Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Table.Container>
              </Tabs.Content>
            </Tabs.Root>
          </DashboardLayout.Content>
        </DashboardLayout.ContentShell>
      </DashboardLayout.Root>
    </>
  );
};

export const WithDetailHeader: DashboardLayoutStoryFn = () => {
  return (
    <>
      <DashboardLayout.Root>
        <DashboardLayout.SidebarDropdown>
          <UserDropdown.Root>
            <UserDropdown.Trigger>
              <LetterAvatar size="md">Frantz Kati</LetterAvatar>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, overflow: "hidden" }}>
                <span style={{ fontWeight: 500, fontSize: "14px" }}>Frantz Kati</span>
                <span style={{ fontSize: "12px", color: "var(--content-tertiary)" }}>frantz@acme.com</span>
              </div>
            </UserDropdown.Trigger>
            <UserDropdown.Content>
              <UserDropdown.Item>
                <User />
                Profile
              </UserDropdown.Item>
              <UserDropdown.Item>
                <Settings />
                Settings
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item>
                <LogOut />
                Log out
              </UserDropdown.Item>
            </UserDropdown.Content>
          </UserDropdown.Root>
        </DashboardLayout.SidebarDropdown>

        <DashboardLayout.Sidebar>
          <UserDropdown.Root>
            <UserDropdown.Trigger>
              <LetterAvatar size="md">Frantz Kati</LetterAvatar>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, overflow: "hidden" }}>
                <span style={{ fontWeight: 500, fontSize: "14px" }}>Frantz Kati</span>
                <span style={{ fontSize: "12px", color: "var(--content-tertiary)" }}>frantz@acme.com</span>
              </div>
            </UserDropdown.Trigger>
            <UserDropdown.Content>
              <UserDropdown.Item>
                <User />
                Profile
              </UserDropdown.Item>
              <UserDropdown.Item>
                <Settings />
                Settings
              </UserDropdown.Item>
              <UserDropdown.Divider />
              <UserDropdown.Item>
                <LogOut />
                Log out
              </UserDropdown.Item>
            </UserDropdown.Content>
          </UserDropdown.Root>

          <DashboardLayout.SidebarGroup>
            <DashboardLayout.SidebarItem active>
              <HomeAltSlimHoriz />
              Dashboard
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <BookStack />
              Contacts
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SwipeLeftGesture />
              Campaigns
            </DashboardLayout.SidebarItem>
            <DashboardLayout.SidebarItem>
              <SecureWindow />
              Settings
            </DashboardLayout.SidebarItem>
          </DashboardLayout.SidebarGroup>

          <DashboardLayout.SidebarFooter>
            <DashboardLayout.FooterNotes>
              <DashboardLayout.FooterNotesLinkGroup>
                <DashboardLayout.FooterNotesLink>
                  Privacy
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Terms
                </DashboardLayout.FooterNotesLink>
                <DashboardLayout.FooterNotesLink>
                  Help Center
                </DashboardLayout.FooterNotesLink>
              </DashboardLayout.FooterNotesLinkGroup>
            </DashboardLayout.FooterNotes>
          </DashboardLayout.SidebarFooter>
        </DashboardLayout.Sidebar>

        <DashboardLayout.ContentShell>
          <DashboardLayout.Content>
            <DashboardLayout.StickyContentHeaderContainer>
              <DashboardLayout.StickyDetailHeader>
                <DashboardLayout.StickyDetailHeaderIcon>
                  <BookStack />
                </DashboardLayout.StickyDetailHeaderIcon>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <DashboardLayout.StickyDetailHeaderDescription>
                    Enterprise customer since March 2024
                  </DashboardLayout.StickyDetailHeaderDescription>
                  <DashboardLayout.StickyDetailHeaderTitle>
                    Acme Corporation
                  </DashboardLayout.StickyDetailHeaderTitle>
                </div>
                <DashboardLayout.StickyDetailActions>
                  <Button variant="secondary">Edit</Button>
                  <Button variant="primary">
                    <Plus />
                    Add Contact
                  </Button>
                </DashboardLayout.StickyDetailActions>
              </DashboardLayout.StickyDetailHeader>
            </DashboardLayout.StickyContentHeaderContainer>

            <div style={{ paddingTop: "32px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Company Details</h3>
              <p style={{ color: "var(--content-secondary)", lineHeight: "1.6" }}>
                This is where you would display detailed information about the organization,
                including statistics, recent activity, team members, and other relevant data.
              </p>
            </div>
          </DashboardLayout.Content>
        </DashboardLayout.ContentShell>
      </DashboardLayout.Root>
    </>
  );
};

export default meta;
