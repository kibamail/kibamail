package cmd

import (
	"fmt"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

func newContactsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "contacts",
		Short: "Manage contacts",
	}
	cmd.AddCommand(newContactsListCmd())
	cmd.AddCommand(newContactsShowCmd())
	cmd.AddCommand(newContactsCreateCmd())
	cmd.AddCommand(newContactsUpdateCmd())
	cmd.AddCommand(newContactsDeleteCmd())
	cmd.AddCommand(newContactsSearchCmd())
	return cmd
}

func newContactsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List contacts",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			opts := &kibamail.ListOptions{}
			if limit, _ := cmd.Flags().GetInt("limit"); limit > 0 {
				opts.Limit = &limit
			}
			if after, _ := cmd.Flags().GetString("after"); after != "" {
				opts.After = &after
			}
			result, err := Client.Contacts.List(opts)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	cmd.Flags().String("before", "", "Cursor for previous page")
	return cmd
}

func newContactsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a contact",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Contacts.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newContactsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a contact",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			email, _ := cmd.Flags().GetString("email")
			req := &kibamail.CreateContactRequest{Email: email}
			if v, _ := cmd.Flags().GetString("first-name"); v != "" {
				req.FirstName = v
			}
			if v, _ := cmd.Flags().GetString("last-name"); v != "" {
				req.LastName = v
			}
			if v, _ := cmd.Flags().GetString("phone"); v != "" {
				req.Phone = v
			}
			if v, _ := cmd.Flags().GetString("country"); v != "" {
				req.Country = v
			}
			if v, _ := cmd.Flags().GetStringSlice("topics"); len(v) > 0 {
				req.Topics = v
			}
			result, err := Client.Contacts.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created contact %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("email", "", "Contact email address [required]")
	cmd.Flags().String("first-name", "", "First name")
	cmd.Flags().String("last-name", "", "Last name")
	cmd.Flags().String("phone", "", "Phone number")
	cmd.Flags().String("country", "", "Country")
	cmd.Flags().StringSlice("topics", nil, "Topic IDs to subscribe")
	_ = cmd.MarkFlagRequired("email")
	return cmd
}

func newContactsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update <id>",
		Short: "Update a contact",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateContactRequest{}
			if v, _ := cmd.Flags().GetString("email"); v != "" {
				req.Email = v
			}
			if v, _ := cmd.Flags().GetString("first-name"); v != "" {
				req.FirstName = v
			}
			if v, _ := cmd.Flags().GetString("last-name"); v != "" {
				req.LastName = v
			}
			result, err := Client.Contacts.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated contact %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("email", "", "Email address")
	cmd.Flags().String("first-name", "", "First name")
	cmd.Flags().String("last-name", "", "Last name")
	return cmd
}

func newContactsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a contact",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			err := Client.Contacts.Delete(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted contact %s\n", args[0])
			}
			return nil
		},
	}
}

func newContactsSearchCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "search",
		Short: "Search contacts by conditions",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			conditions, _ := cmd.Flags().GetString("conditions")
			var parsed interface{}
			if err := parseJSON(conditions, &parsed); err != nil {
				internal.HandleError(cmd, fmt.Errorf("invalid --conditions JSON: %w", err))
				return nil
			}
			result, err := Client.Contacts.Search(&kibamail.SearchContactRequest{Filters: parsed})
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().String("conditions", "", "Search conditions as JSON [required]")
	_ = cmd.MarkFlagRequired("conditions")
	return cmd
}
