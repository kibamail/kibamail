package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/kibamail/infra/control-plane/cli/internal/installer"
	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

var (
	skipCilium       bool
	skipCertManager  bool
	skipTiDB         bool
	skipCloudNativePG bool
	skipRabbitMQ     bool
	skipValkey       bool
	dryRun           bool
)

var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install all infrastructure components",
	Long: `Install all required infrastructure components for the Kibamail control plane.

Components installed:
  - Cilium CNI with Gateway API support
  - cert-manager for certificate management
  - TiDB Operator for distributed database
  - CloudNativePG for PostgreSQL
  - RabbitMQ Cluster Operator for message queuing
  - Valkey Operator for in-memory data store

All installations are idempotent - running install multiple times is safe.`,
	RunE: runInstall,
}

func init() {
	rootCmd.AddCommand(installCmd)

	installCmd.Flags().BoolVar(&skipCilium, "skip-cilium", false, "Skip Cilium installation")
	installCmd.Flags().BoolVar(&skipCertManager, "skip-cert-manager", false, "Skip cert-manager installation")
	installCmd.Flags().BoolVar(&skipTiDB, "skip-tidb", false, "Skip TiDB Operator installation")
	installCmd.Flags().BoolVar(&skipCloudNativePG, "skip-cloudnativepg", false, "Skip CloudNativePG installation")
	installCmd.Flags().BoolVar(&skipRabbitMQ, "skip-rabbitmq", false, "Skip RabbitMQ Operator installation")
	installCmd.Flags().BoolVar(&skipValkey, "skip-valkey", false, "Skip Valkey Operator installation")
	installCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Print what would be installed without actually installing")
}

func runInstall(cmd *cobra.Command, args []string) error {
	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle interrupt signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		pterm.Warning.Println("Received interrupt signal, cancelling...")
		cancel()
	}()

	// Print banner
	ui.Banner()

	// Verify kubeconfig exists
	if _, err := os.Stat(kubeconfig); os.IsNotExist(err) {
		return fmt.Errorf("kubeconfig not found at %s", kubeconfig)
	}

	// Create Kubernetes client
	client, err := installer.NewKubernetesClient(kubeconfig)
	if err != nil {
		return fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	// Verify cluster connection
	ui.PrintInfo(fmt.Sprintf("Using kubeconfig: %s", kubeconfig))
	spinner, err := ui.StartSpinner("Connecting to Kubernetes cluster...")
	if err != nil {
		return err
	}

	_, err = client.Discovery().ServerVersion()
	if err != nil {
		ui.StopSpinnerFail(spinner, "Failed to connect to cluster")
		return fmt.Errorf("failed to connect to kubernetes cluster: %w", err)
	}
	ui.StopSpinner(spinner, "Connected to Kubernetes cluster")

	// Define components to install
	type componentDef struct {
		skip      bool
		installer installer.Component
	}

	components := []componentDef{
		{skip: skipCilium, installer: installer.NewCiliumInstaller(kubeconfig)},
		{skip: skipCertManager, installer: installer.NewCertManagerInstaller(kubeconfig)},
		{skip: skipTiDB, installer: installer.NewTiDBOperatorInstaller(kubeconfig)},
		{skip: skipCloudNativePG, installer: installer.NewCloudNativePGInstaller(kubeconfig)},
		{skip: skipRabbitMQ, installer: installer.NewRabbitMQOperatorInstaller(kubeconfig)},
		{skip: skipValkey, installer: installer.NewValkeyOperatorInstaller(kubeconfig)},
	}

	// Print installation plan
	pterm.Println()
	pterm.DefaultSection.Println("Installation Plan")

	var planData [][]string
	for _, c := range components {
		status := pterm.Green("Will install")
		if c.skip {
			status = pterm.Yellow("Skipped")
		}
		planData = append(planData, []string{c.installer.Name(), c.installer.Version(), status})
	}
	ui.PrintTable([]string{"Component", "Version", "Action"}, planData)

	if dryRun {
		pterm.Println()
		pterm.Info.Println("Dry run mode - no changes will be made")
		return nil
	}

	// Install components
	var results []ui.ComponentStatus

	for _, c := range components {
		if c.skip {
			results = append(results, ui.ComponentStatus{
				Name:      c.installer.Name(),
				Version:   c.installer.Version(),
				Installed: false,
				Skipped:   true,
			})
			continue
		}

		// Check if cancelled
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Check if already installed
		installed, err := c.installer.IsInstalled(ctx, client)
		if err != nil {
			ui.PrintError(fmt.Sprintf("Failed to check %s: %v", c.installer.Name(), err))
			results = append(results, ui.ComponentStatus{
				Name:      c.installer.Name(),
				Version:   c.installer.Version(),
				Installed: false,
				Skipped:   false,
			})
			continue
		}

		if installed {
			results = append(results, ui.ComponentStatus{
				Name:      c.installer.Name(),
				Version:   c.installer.Version(),
				Installed: false,
				Skipped:   true,
			})
			continue
		}

		// Install component
		if err := c.installer.Install(ctx, client, kubeconfig); err != nil {
			ui.PrintError(fmt.Sprintf("Failed to install %s: %v", c.installer.Name(), err))
			results = append(results, ui.ComponentStatus{
				Name:      c.installer.Name(),
				Version:   c.installer.Version(),
				Installed: false,
				Skipped:   false,
			})
			continue
		}

		results = append(results, ui.ComponentStatus{
			Name:      c.installer.Name(),
			Version:   c.installer.Version(),
			Installed: true,
			Skipped:   false,
		})
	}

	// Print summary
	ui.PrintSummary(results)

	// Check for failures
	hasFailures := false
	for _, r := range results {
		if !r.Installed && !r.Skipped {
			hasFailures = true
			break
		}
	}

	if hasFailures {
		return fmt.Errorf("some components failed to install")
	}

	pterm.Println()
	pterm.Success.Println("All components installed successfully!")

	return nil
}
