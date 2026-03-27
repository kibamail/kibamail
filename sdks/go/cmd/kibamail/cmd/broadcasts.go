package cmd

import (
	"fmt"
	"strings"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

func newBroadcastsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "broadcasts",
		Short: "Manage broadcasts",
	}
	cmd.AddCommand(newBroadcastsCreateCmd())
	cmd.AddCommand(newBroadcastsListCmd())
	cmd.AddCommand(newBroadcastsShowCmd())
	cmd.AddCommand(newBroadcastsUpdateCmd())
	cmd.AddCommand(newBroadcastsDeleteCmd())
	cmd.AddCommand(newBroadcastsSendCmd())
	cmd.AddCommand(newBroadcastsCreateAndSendCmd())
	cmd.AddCommand(newBroadcastsSendsCmd())
	cmd.AddCommand(newBroadcastsStatsCmd())
	return cmd
}

func newBroadcastsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a broadcast",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			req := &kibamail.CreateBroadcastRequest{Name: name}
			if v, _ := cmd.Flags().GetString("from"); v != "" {
				req.From = v
			}
			if v, _ := cmd.Flags().GetString("reply-to"); v != "" {
				req.ReplyTo = v
			}
			if v, _ := cmd.Flags().GetString("topic-id"); v != "" {
				req.TopicId = v
			}
			if v, _ := cmd.Flags().GetString("segment-id"); v != "" {
				req.SegmentId = v
			}
			subject, _ := cmd.Flags().GetString("subject")
			html, _ := cmd.Flags().GetString("html")
			if subject != "" || html != "" {
				req.EmailContent = &kibamail.BroadcastEmailContent{
					Subject: subject,
					Html:    html,
				}
			}
			result, err := Client.Broadcasts.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created broadcast %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Broadcast name [required]")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("html", "", "HTML body")
	cmd.Flags().String("from", "", "Sender email address")
	cmd.Flags().String("reply-to", "", "Reply-to address")
	cmd.Flags().String("topic-id", "", "Topic ID")
	cmd.Flags().String("segment-id", "", "Segment ID")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newBroadcastsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List broadcasts",
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
			result, err := Client.Broadcasts.List(opts)
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

func newBroadcastsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <id>",
		Short: "Show a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Broadcasts.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newBroadcastsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update <id>",
		Short: "Update a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateBroadcastRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" {
				req.Name = v
			}
			if v, _ := cmd.Flags().GetString("send-at"); v != "" {
				req.SendAt = v
			}
			subject, _ := cmd.Flags().GetString("subject")
			html, _ := cmd.Flags().GetString("html")
			if subject != "" || html != "" {
				req.EmailContent = &kibamail.BroadcastEmailContent{
					Subject: subject,
					Html:    html,
				}
			}
			result, err := Client.Broadcasts.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated broadcast %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Broadcast name")
	cmd.Flags().String("subject", "", "Email subject")
	cmd.Flags().String("html", "", "HTML body")
	cmd.Flags().String("send-at", "", "Scheduled send time")
	return cmd
}

func newBroadcastsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			err := Client.Broadcasts.Delete(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted broadcast %s\n", args[0])
			}
			return nil
		},
	}
}

func newBroadcastsSendCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "send <id>",
		Short: "Send a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Broadcasts.Send(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Sent broadcast %s\n", result.ID)
			return nil
		},
	}
}

func newBroadcastsCreateAndSendCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-and-send",
		Short: "Create and send a broadcast",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			subject, _ := cmd.Flags().GetString("subject")
			html, _ := cmd.Flags().GetString("html")
			sendAt, _ := cmd.Flags().GetString("send-at")
			req := &kibamail.CreateAndSendBroadcastRequest{
				Name: name,
				EmailContent: &kibamail.BroadcastEmailContent{
					Subject: subject,
					Html:    html,
				},
				SendAt:     sendAt,
				Recipients: &kibamail.BroadcastRecipients{},
			}
			if v, _ := cmd.Flags().GetString("segment"); v != "" {
				req.Recipients.Segment = v
			}
			if v, _ := cmd.Flags().GetString("topic"); v != "" {
				req.Recipients.Topic = v
			}
			if v, _ := cmd.Flags().GetString("contacts"); v != "" {
				req.Recipients.Contacts = strings.Split(v, ",")
			}
			if v, _ := cmd.Flags().GetString("emails"); v != "" {
				var emails interface{}
				if err := parseJSON(v, &emails); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --emails JSON: %w", err))
					return nil
				}
				req.Recipients.Emails = emails
			}
			result, err := Client.Broadcasts.CreateAndSend(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created and sent broadcast %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Broadcast name [required]")
	cmd.Flags().String("subject", "", "Email subject [required]")
	cmd.Flags().String("html", "", "HTML body [required]")
	cmd.Flags().String("send-at", "", "Scheduled send time [required]")
	cmd.Flags().String("segment", "", "Segment ID for recipients")
	cmd.Flags().String("topic", "", "Topic ID for recipients")
	cmd.Flags().String("contacts", "", "Comma-separated contact IDs")
	cmd.Flags().String("emails", "", "Recipient emails as JSON string")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("subject")
	_ = cmd.MarkFlagRequired("html")
	_ = cmd.MarkFlagRequired("send-at")
	return cmd
}

func newBroadcastsSendsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sends <id>",
		Short: "List sends for a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			opts := &kibamail.ListBroadcastSendsOptions{}
			if limit, _ := cmd.Flags().GetInt("limit"); limit > 0 {
				opts.Limit = &limit
			}
			if after, _ := cmd.Flags().GetString("after"); after != "" {
				opts.After = &after
			}
			if v, _ := cmd.Flags().GetString("status"); v != "" {
				opts.Status = &v
			}
			result, err := Client.Broadcasts.ListSends(args[0], opts)
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
	return cmd
}

func newBroadcastsStatsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "stats <id>",
		Short: "Show statistics for a broadcast",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Broadcasts.Stats(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}
