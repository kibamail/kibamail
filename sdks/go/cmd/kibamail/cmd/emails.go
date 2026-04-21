package cmd

import (
	"fmt"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newEmailsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "emails",
		Short: "Manage transactional emails",
	}
	cmd.AddCommand(newEmailsSendCmd())
	cmd.AddCommand(newEmailsListCmd())
	cmd.AddCommand(newEmailsShowCmd())
	cmd.AddCommand(newEmailsEventsCmd())
	cmd.AddCommand(newEmailsContentCmd())
	return cmd
}

func newEmailsSendCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "send",
		Short: "Send a transactional email",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			from, _ := cmd.Flags().GetString("from")
			to, _ := cmd.Flags().GetString("to")
			req := &kibamail.SendEmailRequest{
				From: from,
				To:   to,
			}
			if v, _ := cmd.Flags().GetString("subject"); v != "" {
				req.Subject = v
			}
			if v, _ := cmd.Flags().GetString("html"); v != "" {
				req.Html = v
			}
			if v, _ := cmd.Flags().GetString("text"); v != "" {
				req.Text = v
			}
			replyToEmail, _ := cmd.Flags().GetString("reply-to-email")
			replyToName, _ := cmd.Flags().GetString("reply-to-name")
			if replyToEmail != "" {
				req.ReplyTo = &kibamail.SendEmailReplyTo{
					Email: replyToEmail,
					Name:  replyToName,
				}
			}
			templateID, _ := cmd.Flags().GetString("template-id")
			templateVars, _ := cmd.Flags().GetString("template-variables")
			if templateID != "" {
				req.Template = &kibamail.SendEmailTemplate{ID: templateID}
				if templateVars != "" {
					var vars map[string]interface{}
					if err := parseJSON(templateVars, &vars); err != nil {
						internal.HandleError(cmd, fmt.Errorf("invalid --template-variables JSON: %w", err))
						return nil
					}
					req.Template.Variables = vars
				}
			}
			if v, _ := cmd.Flags().GetString("metadata"); v != "" {
				var meta map[string]string
				if err := parseJSON(v, &meta); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --metadata JSON: %w", err))
					return nil
				}
				req.Metadata = meta
			}
			result, err := Client.Emails.Send(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Sent email %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("from", "", "Sender email address [required]")
	cmd.Flags().String("to", "", "Recipient email address [required]")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("html", "", "HTML body")
	cmd.Flags().String("text", "", "Plain text body")
	cmd.Flags().String("reply-to-email", "", "Reply-to email address")
	cmd.Flags().String("reply-to-name", "", "Reply-to name")
	cmd.Flags().String("template-id", "", "Template ID for template-based sending")
	cmd.Flags().String("template-variables", "", "Template variables as JSON string")
	cmd.Flags().String("metadata", "", "Metadata as JSON string")
	_ = cmd.MarkFlagRequired("from")
	_ = cmd.MarkFlagRequired("to")
	return cmd
}

func newEmailsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List transactional emails",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			opts := &kibamail.ListEmailsOptions{}
			if limit, _ := cmd.Flags().GetInt("limit"); limit > 0 {
				opts.Limit = &limit
			}
			if after, _ := cmd.Flags().GetString("after"); after != "" {
				opts.After = &after
			}
			if v, _ := cmd.Flags().GetString("status"); v != "" {
				opts.Status = &v
			}
			if v, _ := cmd.Flags().GetString("to"); v != "" {
				opts.To = &v
			}
			if v, _ := cmd.Flags().GetString("subject"); v != "" {
				opts.Subject = &v
			}
			if v, _ := cmd.Flags().GetString("from-date"); v != "" {
				opts.FromDate = &v
			}
			if v, _ := cmd.Flags().GetString("to-date"); v != "" {
				opts.ToDate = &v
			}
			result, err := Client.Emails.List(opts)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	cmd.Flags().String("status", "", "Filter by status")
	cmd.Flags().String("to", "", "Filter by recipient")
	cmd.Flags().String("subject", "", "Filter by subject")
	cmd.Flags().String("from-date", "", "Filter from date")
	cmd.Flags().String("to-date", "", "Filter to date")
	return cmd
}

func newEmailsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a transactional email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Emails.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newEmailsEventsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "events <id>",
		Short: "Show events for a transactional email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Emails.Events(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newEmailsContentCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "content <id>",
		Short: "Show content of a transactional email",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Emails.Content(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}
