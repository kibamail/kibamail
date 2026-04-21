package cmd

import (
	"fmt"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newSegmentsCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "segments", Short: "Manage segments"}
	cmd.AddCommand(newSegmentsListCmd(), newSegmentsShowCmd(), newSegmentsCreateCmd(), newSegmentsUpdateCmd(), newSegmentsDeleteCmd(), newSegmentsContactsCmd())
	return cmd
}

func newSegmentsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "list", Short: "List segments",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			opts := &kibamail.ListOptions{}
			if l, _ := cmd.Flags().GetInt("limit"); l > 0 { opts.Limit = &l }
			if a, _ := cmd.Flags().GetString("after"); a != "" { opts.After = &a }
			result, err := Client.Segments.List(opts)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	return cmd
}

func newSegmentsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use: "show <id>", Short: "Show a segment", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.Segments.Get(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newSegmentsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create a segment",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			name, _ := cmd.Flags().GetString("name")
			conditionsStr, _ := cmd.Flags().GetString("conditions")
			var conditions interface{}
			if err := parseJSON(conditionsStr, &conditions); err != nil {
				internal.HandleError(cmd, fmt.Errorf("invalid --conditions JSON: %w", err))
				return nil
			}
			req := &kibamail.CreateSegmentRequest{Name: name, Conditions: conditions}
			if v, _ := cmd.Flags().GetString("description"); v != "" { req.Description = v }
			result, err := Client.Segments.Create(req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created segment %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Segment name [required]")
	cmd.Flags().String("description", "", "Description")
	cmd.Flags().String("conditions", "", "Conditions as JSON [required]")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("conditions")
	return cmd
}

func newSegmentsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "update <id>", Short: "Update a segment", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			req := &kibamail.UpdateSegmentRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" { req.Name = v }
			if v, _ := cmd.Flags().GetString("conditions"); v != "" {
				var conditions interface{}
				if err := parseJSON(v, &conditions); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --conditions JSON: %w", err))
					return nil
				}
				req.Conditions = conditions
			}
			result, err := Client.Segments.Update(args[0], req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Updated segment %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Segment name")
	cmd.Flags().String("conditions", "", "Conditions as JSON")
	return cmd
}

func newSegmentsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete a segment", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			if err := Client.Segments.Delete(args[0]); err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0]) } else { cmd.Printf("Deleted segment %s\n", args[0]) }
			return nil
		},
	}
}

func newSegmentsContactsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "contacts <id>", Short: "List contacts in a segment", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			opts := &kibamail.ListOptions{}
			if l, _ := cmd.Flags().GetInt("limit"); l > 0 { opts.Limit = &l }
			result, err := Client.Segments.ListContacts(args[0], opts)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	return cmd
}
