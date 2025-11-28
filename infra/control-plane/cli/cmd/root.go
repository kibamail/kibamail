package cmd

import (
	"os"
	"path/filepath"

	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

var (
	kubeconfig string
)

var rootCmd = &cobra.Command{
	Use:   "kbctl",
	Short: "Kibamail Infrastructure CLI",
	Long: `kbctl is a CLI tool for managing Kibamail's Kubernetes infrastructure.
It installs and configures all required operators and components for the control plane.`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Set default kubeconfig path
	home, err := os.UserHomeDir()
	if err != nil {
		home = ""
	}
	defaultKubeconfig := filepath.Join(home, ".kube", "config")

	rootCmd.PersistentFlags().StringVar(&kubeconfig, "kubeconfig", defaultKubeconfig, "Path to kubeconfig file")

	// Configure pterm styling
	pterm.Info.Prefix = pterm.Prefix{
		Text:  "INFO",
		Style: pterm.NewStyle(pterm.BgCyan, pterm.FgBlack),
	}
	pterm.Success.Prefix = pterm.Prefix{
		Text:  "SUCCESS",
		Style: pterm.NewStyle(pterm.BgGreen, pterm.FgBlack),
	}
	pterm.Error.Prefix = pterm.Prefix{
		Text:  "ERROR",
		Style: pterm.NewStyle(pterm.BgRed, pterm.FgWhite),
	}
	pterm.Warning.Prefix = pterm.Prefix{
		Text:  "WARN",
		Style: pterm.NewStyle(pterm.BgYellow, pterm.FgBlack),
	}
}
