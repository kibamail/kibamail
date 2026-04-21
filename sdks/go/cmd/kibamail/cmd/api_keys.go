package cmd

import (

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newApiKeysCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "api-keys", Short: "Manage API keys"}
	cmd.AddCommand(newApiKeysListCmd(), newApiKeysCreateCmd(), newApiKeysDeleteCmd())
	return cmd
}

func newApiKeysListCmd() *cobra.Command {
	return &cobra.Command{
		Use: "list", Short: "List API keys",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.ApiKeys.List(nil)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newApiKeysCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create an API key",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			name, _ := cmd.Flags().GetString("name")
			scopes, _ := cmd.Flags().GetStringSlice("scopes")
			if len(scopes) == 0 {
				scopes = []string{
					"read:api-keys", "write:api-keys", "delete:api-keys",
					"read:contacts", "write:contacts", "update:contacts", "delete:contacts",
					"read:tags", "write:tags", "update:tags", "delete:tags",
					"read:topics", "write:topics", "update:topics", "delete:topics",
					"read:segments", "write:segments", "update:segments", "delete:segments",
					"read:suppression-list", "write:suppression-list", "update:suppression-list", "delete:suppression-list",
					"smtp:send",
					"read:broadcasts", "write:broadcasts",
					"read:forms", "write:forms", "update:forms", "delete:forms",
					"read:domains", "write:domains", "update:domains", "delete:domains",
					"read:contact-properties", "write:contact-properties", "update:contact-properties", "delete:contact-properties",
					"read:automations", "write:automations", "delete:automations",
					"read:inbox", "write:inbox",
				}
			}
			req := &kibamail.CreateApiKeyRequest{Name: name, Scopes: scopes}
			result, err := Client.ApiKeys.Create(req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created API key %s\nKey: %s\n", result.ID, result.Key)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Key name [required]")
	cmd.Flags().StringSlice("scopes", nil, "Permission scopes")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newApiKeysDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete an API key", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			if err := Client.ApiKeys.Delete(args[0]); err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0]) } else { cmd.Printf("Deleted API key %s\n", args[0]) }
			return nil
		},
	}
}
