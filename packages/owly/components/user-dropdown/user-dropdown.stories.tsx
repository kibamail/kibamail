import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as UserDropdown from "./user-dropdown";
import { User, Settings, LogOut } from "iconoir-react";

import "./user-dropdown.css";

const meta: Meta<typeof UserDropdown> = {
  title: "Components/UserDropdown",
};

type UserDropdownStoryFn = StoryFn<typeof UserDropdown>;

export const Default: UserDropdownStoryFn = () => {
  const [selectedItem, setSelectedItem] = React.useState("profile");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    console.log("[UserDropdown] Selected item changed:", selectedItem);
  }, [selectedItem]);

  React.useEffect(() => {
    console.log("[UserDropdown] Dropdown open state:", isOpen);
  }, [isOpen]);

  const handleProfileClick = () => {
    console.log("[UserDropdown] Profile clicked");
    setSelectedItem("profile");
  };

  const handleSettingsClick = () => {
    console.log("[UserDropdown] Settings clicked");
    setSelectedItem("settings");
  };

  const handleLogoutClick = () => {
    console.log("[UserDropdown] Logout clicked");
  };

  return (
    <>
      <div className="box">
        <UserDropdown.Root open={isOpen} onOpenChange={setIsOpen}>
          <UserDropdown.Trigger>
            <User />
            <span>Account</span>
          </UserDropdown.Trigger>
          <UserDropdown.Content align="start">
            <UserDropdown.Item
              selected={selectedItem === "profile"}
              onClick={handleProfileClick}
            >
              <User />
              Profile
            </UserDropdown.Item>
            <UserDropdown.Item
              selected={selectedItem === "settings"}
              onClick={handleSettingsClick}
            >
              <Settings />
              Settings
            </UserDropdown.Item>
            <UserDropdown.Divider />
            <UserDropdown.Item onClick={handleLogoutClick}>
              <LogOut />
              Logout
            </UserDropdown.Item>
          </UserDropdown.Content>
        </UserDropdown.Root>
      </div>
    </>
  );
};

export default meta;
