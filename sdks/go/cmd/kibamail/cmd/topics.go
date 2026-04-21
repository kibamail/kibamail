package cmd

import (

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

func newTopicsCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "topics", Short: "Manage topics"}
	cmd.AddCommand(newTopicsListCmd(), newTopicsShowCmd(), newTopicsCreateCmd(), newTopicsUpdateCmd(), newTopicsDeleteCmd())
	return cmd
}

func newTopicsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "list", Short: "List topics",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			opts := &kibamail.ListOptions{}
			if l, _ := cmd.Flags().GetInt("limit"); l > 0 { opts.Limit = &l }
			if a, _ := cmd.Flags().GetString("after"); a != "" { opts.After = &a }
			result, err := Client.Topics.List(opts)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	cmd.Flags().String("after", "", "Cursor for next page")
	return cmd
}

func newTopicsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use: "show <id>", Short: "Show a topic", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.Topics.Get(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newTopicsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create a topic",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			name, _ := cmd.Flags().GetString("name")
			req := &kibamail.CreateTopicRequest{Name: name}
			if v, _ := cmd.Flags().GetString("description"); v != "" { req.Description = v }
			if v, _ := cmd.Flags().GetString("visibility"); v != "" { req.Visibility = v }
			result, err := Client.Topics.Create(req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created topic %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Topic name [required]")
	cmd.Flags().String("description", "", "Description")
	cmd.Flags().String("visibility", "", "Visibility: public or private")
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newTopicsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "update <id>", Short: "Update a topic", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			req := &kibamail.UpdateTopicRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" { req.Name = v }
			if v, _ := cmd.Flags().GetString("description"); v != "" { req.Description = v }
			result, err := Client.Topics.Update(args[0], req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Updated topic %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Topic name")
	cmd.Flags().String("description", "", "Description")
	return cmd
}

func newTopicsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete a topic", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			if err := Client.Topics.Delete(args[0]); err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0]) } else { cmd.Printf("Deleted topic %s\n", args[0]) }
			return nil
		},
	}
}
