package cmd

import (
	"fmt"
	"net/url"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

var Client *kibamail.Client

func NewRootCmd(version, commit string) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:           "kibamail",
		Short:         "Kibamail CLI — manage contacts, topics, segments, and more",
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			if cmd.Name() == "login" || cmd.Name() == "logout" || cmd.Name() == "version" || cmd.Name() == "help" {
				return nil
			}
			if cmd.Parent() != nil && cmd.Parent().Name() == "auth" {
				return nil
			}

			apiKey, _, err := internal.Resolve(cmd)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}

			Client = kibamail.NewClient(apiKey)
			if baseURL, _ := cmd.Flags().GetString("base-url"); baseURL != "" {
				parsed, parseErr := url.Parse(baseURL)
				if parseErr == nil {
					Client.BaseURL = parsed
				}
			}

			return nil
		},
	}

	rootCmd.PersistentFlags().String("api-key", "", "API key for authentication")
	rootCmd.PersistentFlags().Bool("json", false, "Output as JSON")
	rootCmd.PersistentFlags().String("output", "auto", "Output format: auto, json, table")
	rootCmd.PersistentFlags().StringSlice("fields", nil, "Fields to include in output")
	rootCmd.PersistentFlags().Bool("quiet", false, "Output only IDs")
	rootCmd.PersistentFlags().Bool("no-color", false, "Disable colored output")
	rootCmd.PersistentFlags().String("base-url", "", "Override API base URL")

	rootCmd.AddCommand(newAuthCmd())
	rootCmd.AddCommand(newContactsCmd())
	rootCmd.AddCommand(newTopicsCmd())
	rootCmd.AddCommand(newSegmentsCmd())
	rootCmd.AddCommand(newFormsCmd())
	rootCmd.AddCommand(newApiKeysCmd())
	rootCmd.AddCommand(newContactPropertiesCmd())
	rootCmd.AddCommand(newEventsCmd())
	rootCmd.AddCommand(newAutomationsCmd())
	rootCmd.AddCommand(newEmailsCmd())
	rootCmd.AddCommand(newDomainsCmd())
	rootCmd.AddCommand(newBroadcastsCmd())
	rootCmd.AddCommand(newMarketingEmailsCmd())
	rootCmd.AddCommand(newVersionCmd(version, commit))

	return rootCmd
}

func requireClient(cmd *cobra.Command) error {
	if Client == nil {
		return fmt.Errorf("not authenticated — run: kibamail auth login --api-key <key>")
	}
	return nil
}
