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
	skipCilium            bool
	skipIstio             bool
	skipCertManager       bool
	skipCloudNativePG     bool
	skipBarmanCloud       bool
	skipRabbitMQ          bool
	skipValkey            bool
	skipExternalSecrets   bool
	enableSignozK8sInfra  bool
	signozClusterName     string
	signozEnvironment     string
	dryRun                bool
)

var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install all infrastructure components",
	Long: `Install all required infrastructure components for the Kibamail control plane.

Components installed:
  - Cilium CNI (networking only, Gateway API disabled)
  - Istio Gateway API controller (with hostNetwork support)
  - cert-manager for certificate management
  - CloudNativePG for PostgreSQL
  - Barman Cloud Plugin for PostgreSQL backups
  - RabbitMQ Cluster Operator for message queuing
  - Valkey Operator for in-memory data store
  - External Secrets Operator for secrets management

Optional components (require explicit flag):
  - SigNoz K8s-Infra for observability (--enable-signoz-k8s-infra)
    Deploys OpenTelemetry collectors (DaemonSet + Deployment) for logs, metrics, and traces.
    Requires: --cluster-name and --environment flags.

All installations are idempotent - running install multiple times is safe.`,
	RunE: runInstall,
}

func init() {
	rootCmd.AddCommand(installCmd)

	installCmd.Flags().BoolVar(&skipCilium, "skip-cilium", false, "Skip Cilium installation")
	installCmd.Flags().BoolVar(&skipIstio, "skip-istio", false, "Skip Istio installation")
	installCmd.Flags().BoolVar(&skipCertManager, "skip-cert-manager", false, "Skip cert-manager installation")
	installCmd.Flags().BoolVar(&skipCloudNativePG, "skip-cloudnativepg", false, "Skip CloudNativePG installation")
	installCmd.Flags().BoolVar(&skipBarmanCloud, "skip-barman-cloud", false, "Skip Barman Cloud Plugin installation")
	installCmd.Flags().BoolVar(&skipRabbitMQ, "skip-rabbitmq", false, "Skip RabbitMQ Operator installation")
	installCmd.Flags().BoolVar(&skipValkey, "skip-valkey", false, "Skip Valkey Operator installation")
	installCmd.Flags().BoolVar(&skipExternalSecrets, "skip-external-secrets", false, "Skip External Secrets Operator installation")
	installCmd.Flags().BoolVar(&enableSignozK8sInfra, "enable-signoz-k8s-infra", false, "Enable SigNoz K8s-Infra installation (OpenTelemetry collectors)")
	installCmd.Flags().StringVar(&signozClusterName, "cluster-name", "", "Cluster name for SigNoz K8s-Infra (e.g., kibamail-production)")
	installCmd.Flags().StringVar(&signozEnvironment, "environment", "", "Environment for SigNoz K8s-Infra (e.g., production, staging)")
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

	// Validate SigNoz K8s-Infra flags
	if enableSignozK8sInfra {
		if signozClusterName == "" {
			return fmt.Errorf("--cluster-name is required when --enable-signoz-k8s-infra is set")
		}
		if signozEnvironment == "" {
			return fmt.Errorf("--environment is required when --enable-signoz-k8s-infra is set")
		}
	}

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
		{skip: skipIstio, installer: installer.NewIstioInstaller(kubeconfig)},
		{skip: skipCertManager, installer: installer.NewCertManagerInstaller(kubeconfig)},
		{skip: skipCloudNativePG, installer: installer.NewCloudNativePGInstaller(kubeconfig)},
		{skip: skipBarmanCloud, installer: installer.NewBarmanCloudInstaller(kubeconfig)},
		{skip: skipRabbitMQ, installer: installer.NewRabbitMQOperatorInstaller(kubeconfig)},
		{skip: skipValkey, installer: installer.NewValkeyOperatorInstaller(kubeconfig)},
		{skip: skipExternalSecrets, installer: installer.NewExternalSecretsInstaller(kubeconfig)},
		{skip: !enableSignozK8sInfra, installer: installer.NewSignozK8sInfraInstaller(kubeconfig, signozClusterName, signozEnvironment)},
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
