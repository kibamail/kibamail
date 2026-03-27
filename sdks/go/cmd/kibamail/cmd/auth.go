package cmd

import (
	"fmt"
	"net/url"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

func newAuthCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "auth",
		Short: "Manage authentication",
	}

	cmd.AddCommand(newAuthLoginCmd())
	cmd.AddCommand(newAuthLogoutCmd())
	cmd.AddCommand(newAuthStatusCmd())

	return cmd
}

func newAuthLoginCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "login",
		Short: "Store API key in system keyring",
		Example: `  kibamail auth login --api-key sk-xxx
  echo "sk-xxx" | kibamail auth login
  KIBAMAIL_API_KEY=sk-xxx kibamail auth login`,
		RunE: func(cmd *cobra.Command, args []string) error {
			apiKey, err := internal.ResolveForLogin(cmd)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}

			client := kibamail.NewClient(apiKey)
			if baseURL, _ := cmd.Flags().GetString("base-url"); baseURL != "" {
				parsed, parseErr := url.Parse(baseURL)
				if parseErr == nil {
					client.BaseURL = parsed
				}
			}
			_, listErr := client.ApiKeys.List(nil)
			if listErr != nil {
				internal.HandleError(cmd, fmt.Errorf("invalid API key: %w", listErr))
				return nil
			}

			if err := internal.StoreKey(apiKey); err != nil {
				internal.HandleError(cmd, fmt.Errorf("failed to store key in keyring: %w", err))
				return nil
			}

			if internal.IsJSON(cmd) {
				cmd.Println(`{"stored":true,"source":"keyring"}`)
			} else {
				cmd.Println("Stored in system keyring")
			}
			return nil
		},
	}
}

func newAuthLogoutCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "logout",
		Short: "Remove stored API key from system keyring",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := internal.DeleteKey(); err != nil {
				internal.HandleError(cmd, fmt.Errorf("failed to remove key: %w", err))
				return nil
			}

			if internal.IsJSON(cmd) {
				cmd.Println(`{"stored":false}`)
			} else {
				cmd.Println("Removed from system keyring")
			}
			return nil
		},
	}
}

func newAuthStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show authentication status",
		RunE: func(cmd *cobra.Command, args []string) error {
			apiKey, source, err := internal.Resolve(cmd)
			if err != nil {
				if internal.IsJSON(cmd) {
					cmd.Println(`{"authenticated":false}`)
				} else {
					cmd.Println("Not authenticated")
				}
				return nil
			}

			if internal.IsJSON(cmd) {
				cmd.Printf(`{"authenticated":true,"source":"%s","key_preview":"%s"}`+"\n", source, internal.MaskKey(apiKey))
			} else {
				cmd.Println("Authenticated")
				cmd.Printf("  Source: %s\n", source)
				cmd.Printf("  Key:    %s\n", internal.MaskKey(apiKey))
			}
			return nil
		},
	}
}
