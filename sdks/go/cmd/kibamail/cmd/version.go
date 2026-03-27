package cmd

import (

	"github.com/kibamail/cli/internal"
	"github.com/spf13/cobra"
)

func newVersionCmd(version, commit string) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version information",
		Run: func(cmd *cobra.Command, args []string) {
			if internal.IsJSON(cmd) {
				cmd.Printf(`{"version":"%s","commit":"%s"}`+"\n", version, commit)
			} else {
				cmd.Printf("kibamail v%s (%s)\n", version, commit)
			}
		},
	}
}
