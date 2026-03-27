package cmd

import (
	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

func newDomainsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "domains",
		Short: "Manage sending domains",
	}
	cmd.AddCommand(newDomainsCreateCmd())
	cmd.AddCommand(newDomainsListCmd())
	cmd.AddCommand(newDomainsShowCmd())
	cmd.AddCommand(newDomainsUpdateCmd())
	cmd.AddCommand(newDomainsDeleteCmd())
	cmd.AddCommand(newDomainsVerifyCmd())
	return cmd
}

func newDomainsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a sending domain",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			req := &kibamail.CreateDomainRequest{Name: name}
			result, err := Client.Domains.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created domain %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Domain name [required]")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newDomainsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List sending domains",
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
			result, err := Client.Domains.List(opts)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	return cmd
}

func newDomainsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a sending domain",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Domains.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newDomainsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update <id>",
		Short: "Update a sending domain",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateDomainRequest{}
			if cmd.Flags().Changed("open-tracking") {
				v, _ := cmd.Flags().GetBool("open-tracking")
				req.OpenTrackingEnabled = &v
			}
			if cmd.Flags().Changed("click-tracking") {
				v, _ := cmd.Flags().GetBool("click-tracking")
				req.ClickTrackingEnabled = &v
			}
			result, err := Client.Domains.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated domain %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().Bool("open-tracking", false, "Enable open tracking")
	cmd.Flags().Bool("click-tracking", false, "Enable click tracking")
	return cmd
}

func newDomainsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a sending domain",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			err := Client.Domains.Delete(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted domain %s\n", args[0])
			}
			return nil
		},
	}
}

func newDomainsVerifyCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "verify <id>",
		Short: "Verify DNS configuration for a sending domain",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Domains.Verify(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}
