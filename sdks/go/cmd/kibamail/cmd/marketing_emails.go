package cmd

import (
	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

func newMarketingEmailsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "marketing-emails",
		Short: "Manage marketing emails",
	}
	cmd.AddCommand(
		newMarketingEmailsCreateCmd(),
		newMarketingEmailsListCmd(),
		newMarketingEmailsShowCmd(),
		newMarketingEmailsUpdateCmd(),
		newMarketingEmailsDeleteCmd(),
		newMarketingEmailsPreviewCmd(),
		newMarketingEmailsStatsCmd(),
	)
	return cmd
}

func newMarketingEmailsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a marketing email",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			req := &kibamail.CreateMarketingEmailRequest{Name: name}
			if v, _ := cmd.Flags().GetString("subject"); v != "" {
				req.Subject = v
			}
			if v, _ := cmd.Flags().GetString("preview-text"); v != "" {
				req.PreviewText = v
			}
			if v, _ := cmd.Flags().GetString("html"); v != "" {
				req.Html = v
			}
			if v, _ := cmd.Flags().GetString("sender-identity-id"); v != "" {
				req.SenderIdentityId = v
			}
			if v, _ := cmd.Flags().GetString("reply-to-identity-id"); v != "" {
				req.ReplyToIdentityId = v
			}
			if v, _ := cmd.Flags().GetString("type"); v != "" {
				req.Type = v
			}
			if cmd.Flags().Changed("track-clicks") {
				v, _ := cmd.Flags().GetBool("track-clicks")
				req.TrackClicks = &v
			}
			if cmd.Flags().Changed("track-opens") {
				v, _ := cmd.Flags().GetBool("track-opens")
				req.TrackOpens = &v
			}
			result, err := Client.MarketingEmails.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created marketing email %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Marketing email name [required]")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("preview-text", "", "Preview text")
	cmd.Flags().String("html", "", "HTML body")
	cmd.Flags().String("sender-identity-id", "", "Sender identity ID")
	cmd.Flags().String("reply-to-identity-id", "", "Reply-to identity ID")
	cmd.Flags().String("type", "", "Email type")
	cmd.Flags().Bool("track-clicks", false, "Track clicks")
	cmd.Flags().Bool("track-opens", false, "Track opens")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newMarketingEmailsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List marketing emails",
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
			result, err := Client.MarketingEmails.List(opts)
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

func newMarketingEmailsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a marketing email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.MarketingEmails.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newMarketingEmailsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update <id>",
		Short: "Update a marketing email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateMarketingEmailRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" {
				req.Name = v
			}
			if v, _ := cmd.Flags().GetString("subject"); v != "" {
				req.Subject = v
			}
			if v, _ := cmd.Flags().GetString("preview-text"); v != "" {
				req.PreviewText = v
			}
			if v, _ := cmd.Flags().GetString("html"); v != "" {
				req.Html = v
			}
			if v, _ := cmd.Flags().GetString("sender-identity-id"); v != "" {
				req.SenderIdentityId = v
			}
			if v, _ := cmd.Flags().GetString("reply-to-identity-id"); v != "" {
				req.ReplyToIdentityId = v
			}
			if v, _ := cmd.Flags().GetString("type"); v != "" {
				req.Type = v
			}
			if cmd.Flags().Changed("track-clicks") {
				v, _ := cmd.Flags().GetBool("track-clicks")
				req.TrackClicks = &v
			}
			if cmd.Flags().Changed("track-opens") {
				v, _ := cmd.Flags().GetBool("track-opens")
				req.TrackOpens = &v
			}
			result, err := Client.MarketingEmails.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated marketing email %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Marketing email name")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("preview-text", "", "Preview text")
	cmd.Flags().String("html", "", "HTML body")
	cmd.Flags().String("sender-identity-id", "", "Sender identity ID")
	cmd.Flags().String("reply-to-identity-id", "", "Reply-to identity ID")
	cmd.Flags().String("type", "", "Email type")
	cmd.Flags().Bool("track-clicks", false, "Track clicks")
	cmd.Flags().Bool("track-opens", false, "Track opens")
	return cmd
}

func newMarketingEmailsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a marketing email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			err := Client.MarketingEmails.Delete(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted marketing email %s\n", args[0])
			}
			return nil
		},
	}
}

func newMarketingEmailsPreviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "preview <id>",
		Short: "Preview a marketing email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.MarketingEmails.Preview(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newMarketingEmailsStatsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "stats <id>",
		Short: "Show statistics for a marketing email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.MarketingEmails.Stats(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}
