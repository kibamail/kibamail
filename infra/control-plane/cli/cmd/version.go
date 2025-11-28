package cmd

import (
	"fmt"
	"runtime"

	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

var (
	// Version is set at build time
	Version   = "dev"
	GitCommit = "unknown"
	BuildDate = "unknown"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		pterm.DefaultSection.Println("kbctl - Kibamail Infrastructure CLI")

		data := [][]string{
			{"Version", Version},
			{"Git Commit", GitCommit},
			{"Build Date", BuildDate},
			{"Go Version", runtime.Version()},
			{"OS/Arch", fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH)},
		}

		pterm.DefaultTable.WithData(pterm.TableData{
			{"Property", "Value"},
			data[0],
			data[1],
			data[2],
			data[3],
			data[4],
		}).WithHasHeader().Render()

		pterm.Println()
		pterm.DefaultSection.Println("Bundled Component Versions")

		componentData := pterm.TableData{
			{"Component", "Version"},
			{"Cilium", "1.18.4"},
			{"cert-manager", "v1.19.1"},
			{"TiDB Operator", "v1.6.3"},
			{"CloudNativePG", "0.26.1"},
			{"RabbitMQ Operator", "v2.17.2"},
			{"Gateway API", "v1.2.0"},
		}

		pterm.DefaultTable.WithData(componentData).WithHasHeader().Render()
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
