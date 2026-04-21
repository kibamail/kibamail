package cmd

import (
	"encoding/json"
	"fmt"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newAutomationsCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "automations", Short: "Manage automations"}
	cmd.AddCommand(
		newAutomationsListCmd(),
		newAutomationsShowCmd(),
		newAutomationsCreateCmd(),
		newAutomationsUpdateCmd(),
		newAutomationsDeleteCmd(),
		newAutomationsPublishCmd(),
		newAutomationsArchiveCmd(),
		newAutomationsTriggerCmd(),
		newAutomationsSimulateCmd(),
	)
	return cmd
}

func newAutomationsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "list", Short: "List automations",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			opts := &kibamail.ListAutomationsOptions{}
			if l, _ := cmd.Flags().GetInt("limit"); l > 0 {
				opts.Limit = &l
			}
			if a, _ := cmd.Flags().GetString("after"); a != "" {
				opts.After = &a
			}
			if s, _ := cmd.Flags().GetString("status"); s != "" {
				opts.Status = &s
			}
			result, err := Client.Automations.List(opts)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	cmd.Flags().String("status", "", "Filter by status: published, draft, archived")
	return cmd
}

func newAutomationsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use: "show <id>", Short: "Show an automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Automations.Get(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
}

func newAutomationsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create an automation",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			name, _ := cmd.Flags().GetString("name")
			req := &kibamail.CreateAutomationRequest{Name: name}
			if v, _ := cmd.Flags().GetString("description"); v != "" {
				req.Description = v
			}
			if v, _ := cmd.Flags().GetString("trigger-type"); v != "" {
				req.Trigger = &kibamail.AutomationTrigger{Type: v}
				if cfg, _ := cmd.Flags().GetString("trigger-config"); cfg != "" {
					var config kibamail.AutomationTriggerConfig
					if err := json.Unmarshal([]byte(cfg), &config); err != nil {
						internal.HandleError(cmd, fmt.Errorf("invalid --trigger-config JSON: %w", err))
						return nil
					}
					req.Trigger.Config = &config
				}
			}
			if v, _ := cmd.Flags().GetString("nodes"); v != "" {
				var nodes []kibamail.AutomationNode
				if err := json.Unmarshal([]byte(v), &nodes); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --nodes JSON: %w", err))
					return nil
				}
				req.Nodes = nodes
			}
			if v, _ := cmd.Flags().GetString("edges"); v != "" {
				var edges []kibamail.AutomationEdge
				if err := json.Unmarshal([]byte(v), &edges); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --edges JSON: %w", err))
					return nil
				}
				req.Edges = edges
			}
			result, err := Client.Automations.Create(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Created automation %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Automation name [required]")
	cmd.Flags().String("description", "", "Description")
	cmd.Flags().String("trigger-type", "", "Trigger type: CONTACT_SUBSCRIBED, FORM_SUBMITTED, API, EVENT, etc.")
	cmd.Flags().String("trigger-config", "", "Trigger config as JSON")
	cmd.Flags().String("nodes", "", "Nodes array as JSON")
	cmd.Flags().String("edges", "", "Edges array as JSON")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newAutomationsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "update <id>", Short: "Update an automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req := &kibamail.UpdateAutomationRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" {
				req.Name = v
			}
			if v, _ := cmd.Flags().GetString("description"); v != "" {
				req.Description = v
			}
			if v, _ := cmd.Flags().GetString("nodes"); v != "" {
				var nodes []kibamail.AutomationNode
				if err := json.Unmarshal([]byte(v), &nodes); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --nodes JSON: %w", err))
					return nil
				}
				req.Nodes = nodes
			}
			if v, _ := cmd.Flags().GetString("edges"); v != "" {
				var edges []kibamail.AutomationEdge
				if err := json.Unmarshal([]byte(v), &edges); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --edges JSON: %w", err))
					return nil
				}
				req.Edges = edges
			}
			result, err := Client.Automations.Update(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Updated automation %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Automation name")
	cmd.Flags().String("description", "", "Description")
	cmd.Flags().String("nodes", "", "Nodes array as JSON")
	cmd.Flags().String("edges", "", "Edges array as JSON")
	return cmd
}

func newAutomationsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete an automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if err := Client.Automations.Delete(args[0]); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0])
			} else {
				cmd.Printf("Deleted automation %s\n", args[0])
			}
			return nil
		},
	}
}

func newAutomationsPublishCmd() *cobra.Command {
	return &cobra.Command{
		Use: "publish <id>", Short: "Publish a draft automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Automations.Publish(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Published automation %s\n", result.ID)
			return nil
		},
	}
}

func newAutomationsArchiveCmd() *cobra.Command {
	return &cobra.Command{
		Use: "archive <id>", Short: "Archive a published automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			result, err := Client.Automations.Archive(args[0])
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			if internal.IsJSON(cmd) {
				return internal.PrintResult(cmd, result)
			}
			cmd.Printf("Archived automation %s\n", result.ID)
			return nil
		},
	}
}

func newAutomationsTriggerCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "trigger <id>", Short: "Trigger an API-type automation", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			contactID, _ := cmd.Flags().GetString("contact-id")
			req := &kibamail.TriggerAutomationRequest{ContactId: contactID}
			if m, _ := cmd.Flags().GetString("metadata"); m != "" {
				var meta map[string]interface{}
				if err := parseJSON(m, &meta); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --metadata JSON: %w", err))
					return nil
				}
				req.Metadata = meta
			}
			result, err := Client.Automations.Trigger(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().String("contact-id", "", "Contact ID [required]")
	cmd.Flags().String("metadata", "", "Metadata as JSON")
	_ = cmd.MarkFlagRequired("contact-id")
	return cmd
}

func newAutomationsSimulateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "simulate <id>",
		Short: "Simulate an automation for a contact (dry run, no side effects)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}

			contactID, _ := cmd.Flags().GetString("contact-id")
			contactJSON, _ := cmd.Flags().GetString("contact")

			if contactID == "" && contactJSON == "" {
				internal.HandleError(cmd, fmt.Errorf("provide either --contact-id or --contact"))
				return nil
			}
			if contactID != "" && contactJSON != "" {
				internal.HandleError(cmd, fmt.Errorf("provide either --contact-id or --contact, not both"))
				return nil
			}

			req := &kibamail.SimulateAutomationRequest{}

			if contactID != "" {
				req.ContactId = contactID
			} else {
				var vc kibamail.VirtualContact
				if err := json.Unmarshal([]byte(contactJSON), &vc); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --contact JSON: %w", err))
					return nil
				}
				req.Contact = &vc
			}

			if seed, _ := cmd.Flags().GetInt("seed"); seed != 0 {
				req.Seed = &seed
			}

			result, err := Client.Automations.Simulate(args[0], req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().String("contact-id", "", "Real contact ID")
	cmd.Flags().String("contact", "", "Virtual contact as JSON (alternative to --contact-id)")
	cmd.Flags().Int("seed", 0, "Seed for deterministic percentage splits")
	return cmd
}
