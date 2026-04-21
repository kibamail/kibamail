package cmd

import (

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newContactPropertiesCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "contact-properties", Short: "Manage contact properties"}
	cmd.AddCommand(newContactPropsListCmd(), newContactPropsShowCmd(), newContactPropsCreateCmd(), newContactPropsUpdateCmd(), newContactPropsDeleteCmd())
	return cmd
}

func newContactPropsListCmd() *cobra.Command {
	return &cobra.Command{
		Use: "list", Short: "List contact properties",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.ContactProperties.List(nil)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newContactPropsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use: "show <id>", Short: "Show a contact property", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.ContactProperties.Get(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newContactPropsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create a contact property",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			name, _ := cmd.Flags().GetString("name")
			propType, _ := cmd.Flags().GetString("type")
			result, err := Client.ContactProperties.Create(&kibamail.CreateContactPropertyRequest{Name: name, Type: propType})
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created property %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Property name [required]")
	cmd.Flags().String("type", "", "Property type: text, number, date [required]")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("type")
	return cmd
}

func newContactPropsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "update <id>", Short: "Update a contact property", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			req := &kibamail.UpdateContactPropertyRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" { req.Name = v }
			result, err := Client.ContactProperties.Update(args[0], req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Updated property %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Property name")
	return cmd
}

func newContactPropsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete a contact property", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			if err := Client.ContactProperties.Delete(args[0]); err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0]) } else { cmd.Printf("Deleted property %s\n", args[0]) }
			return nil
		},
	}
}
