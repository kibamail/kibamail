package cmd

import (
	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newTransactionalEmailTemplatesCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "transactional-email-templates",
		Aliases: []string{"transactional-templates", "tet"},
		Short:   "Manage transactional email templates (HTML-only)",
		Long: `Manage the HTML-only transactional email templates used by
POST /v1/emails/send's template resolver.

All mutating subcommands accept --html or --html-file. The --html-file
form is strongly recommended for anything non-trivial — it avoids shell
quoting pitfalls with Handlebars ({{ ... }}), inline CSS, and multi-line
bodies.`,
	}
	cmd.AddCommand(
		newTETCreateCmd(),
		newTETListCmd(),
		newTETShowCmd(),
		newTETUpdateCmd(),
		newTETDeleteCmd(),
		newTETPublishCmd(),
		newTETPreviewCmd(),
		newTETCreateVersionCmd(),
		newTETListVersionsCmd(),
	)
	return cmd
}

func newTETCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a transactional email template",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			html, err := resolveHtmlFlags(cmd)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			slug, _ := cmd.Flags().GetString("slug")
			subject, _ := cmd.Flags().GetString("subject")
			req := &kibamail.CreateTransactionalEmailTemplateRequest{
				Name:       name,
				UniqueSlug: slug,
				Subject:    subject,
				Html:       html,
			}
			if v, _ := cmd.Flags().GetString("description"); v != "" {
				req.Description = v
			}
			if v, _ := cmd.Flags().GetString("preview-text"); v != "" {
				req.PreviewText = v
			}
			if v, _ := cmd.Flags().GetString("sender-identity-id"); v != "" {
				req.SenderIdentityId = v
			}
			if v, _ := cmd.Flags().GetString("reply-to-identity-id"); v != "" {
				req.ReplyToIdentityId = v
			}
			if cmd.Flags().Changed("track-clicks") {
				v, _ := cmd.Flags().GetBool("track-clicks")
				req.TrackClicks = &v
			}
			if cmd.Flags().Changed("track-opens") {
				v, _ := cmd.Flags().GetBool("track-opens")
				req.TrackOpens = &v
			}
			if cmd.Flags().Changed("publish") {
				v, _ := cmd.Flags().GetBool("publish")
				req.Publish = &v
			}
			result, err := Client.TransactionalEmailTemplates.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created transactional email template %s (slug=%s, status=%s)\n", result.ID, result.UniqueSlug, result.Status)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Template name [required]")
	cmd.Flags().String("slug", "", "Unique slug — used by /v1/emails/send template.id [required]")
	cmd.Flags().String("subject", "", "Email subject [required]")
	cmd.Flags().String("description", "", "Template description")
	cmd.Flags().String("preview-text", "", "Preview text (inbox teaser)")
	cmd.Flags().String("html", "", "HTML body (inline)")
	cmd.Flags().String("html-file", "", "Path to a file containing the HTML body (UTF-8)")
	cmd.Flags().String("sender-identity-id", "", "Default sender identity ID")
	cmd.Flags().String("reply-to-identity-id", "", "Default reply-to identity ID")
	cmd.Flags().Bool("track-clicks", true, "Track link clicks")
	cmd.Flags().Bool("track-opens", true, "Track opens")
	cmd.Flags().Bool("publish", true, "Publish on create (pass --publish=false for a DRAFT)")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("slug")
	_ = cmd.MarkFlagRequired("subject")
	return cmd
}

func newTETListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List transactional email templates",
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
			result, err := Client.TransactionalEmailTemplates.List(opts)
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

func newTETShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a transactional email template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.TransactionalEmailTemplates.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newTETUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update <id>",
		Short: "Update a DRAFT transactional email template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			html, err := resolveHtmlFlags(cmd)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateTransactionalEmailTemplateRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" {
				req.Name = v
			}
			if v, _ := cmd.Flags().GetString("slug"); v != "" {
				req.UniqueSlug = v
			}
			if v, _ := cmd.Flags().GetString("subject"); v != "" {
				req.Subject = v
			}
			if cmd.Flags().Changed("description") {
				v, _ := cmd.Flags().GetString("description")
				req.Description = &v
			}
			if cmd.Flags().Changed("preview-text") {
				v, _ := cmd.Flags().GetString("preview-text")
				req.PreviewText = &v
			}
			if html != "" {
				req.Html = html
			}
			if cmd.Flags().Changed("sender-identity-id") {
				v, _ := cmd.Flags().GetString("sender-identity-id")
				req.SenderIdentityId = &v
			}
			if cmd.Flags().Changed("reply-to-identity-id") {
				v, _ := cmd.Flags().GetString("reply-to-identity-id")
				req.ReplyToIdentityId = &v
			}
			if cmd.Flags().Changed("track-clicks") {
				v, _ := cmd.Flags().GetBool("track-clicks")
				req.TrackClicks = &v
			}
			if cmd.Flags().Changed("track-opens") {
				v, _ := cmd.Flags().GetBool("track-opens")
				req.TrackOpens = &v
			}
			result, err := Client.TransactionalEmailTemplates.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated transactional email template %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Template name")
	cmd.Flags().String("slug", "", "Unique slug")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("description", "", "Template description")
	cmd.Flags().String("preview-text", "", "Preview text")
	cmd.Flags().String("html", "", "HTML body (inline)")
	cmd.Flags().String("html-file", "", "Path to a file containing the HTML body (UTF-8)")
	cmd.Flags().String("sender-identity-id", "", "Default sender identity ID")
	cmd.Flags().String("reply-to-identity-id", "", "Default reply-to identity ID")
	cmd.Flags().Bool("track-clicks", true, "Track link clicks")
	cmd.Flags().Bool("track-opens", true, "Track opens")
	return cmd
}

func newTETDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a DRAFT transactional email template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if err := Client.TransactionalEmailTemplates.Delete(args[0]); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted transactional email template %s\n", args[0])
			}
			return nil
		},
	}
}

func newTETPublishCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "publish <id>",
		Short: "Publish a DRAFT transactional email template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.TransactionalEmailTemplates.Publish(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Published transactional email template %s\n", result.ID)
			return nil
		},
	}
}

func newTETPreviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "preview <id>",
		Short: "Preview a transactional email template with SAMPLE_VARIABLES",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.TransactionalEmailTemplates.Preview(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newTETCreateVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "create-version <id>",
		Short: "Create a new DRAFT version from a published template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.TransactionalEmailTemplates.CreateVersion(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created version %s\n", result.ID)
			return nil
		},
	}
}

func newTETListVersionsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list-versions <id>",
		Short: "List all versions of a transactional email template",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.TransactionalEmailTemplates.ListVersions(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}
