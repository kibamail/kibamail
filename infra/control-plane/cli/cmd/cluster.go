package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

const (
	kindClusterName = "kibamail-local"
)

var clusterCmd = &cobra.Command{
	Use:   "cluster",
	Short: "Manage local Kubernetes cluster",
	Long:  `Create, delete, and manage the local Kind cluster for development.`,
}

var clusterCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a local Kind cluster",
	Long: `Create a local Kind cluster optimized for Kibamail development.

The cluster is configured with:
  - 1 control plane node
  - 2 worker nodes
  - CNI disabled (for Cilium)
  - Port mappings for Gateway API (80, 443)`,
	RunE: runClusterCreate,
}

var clusterDeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete the local Kind cluster",
	RunE:  runClusterDelete,
}

var clusterStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show cluster status",
	RunE:  runClusterStatus,
}

func init() {
	rootCmd.AddCommand(clusterCmd)
	clusterCmd.AddCommand(clusterCreateCmd)
	clusterCmd.AddCommand(clusterDeleteCmd)
	clusterCmd.AddCommand(clusterStatusCmd)
}

func runClusterCreate(cmd *cobra.Command, args []string) error {
	ui.Banner()

	// Check if Kind is installed
	if _, err := exec.LookPath("kind"); err != nil {
		return fmt.Errorf("kind is not installed. Install it from: https://kind.sigs.k8s.io/docs/user/quick-start/#installation")
	}

	// Check if cluster already exists
	ctx := context.Background()
	if clusterExists(ctx) {
		ui.PrintWarning(fmt.Sprintf("Cluster '%s' already exists", kindClusterName))

		// Ask if user wants to recreate
		pterm.Println()
		result, _ := pterm.DefaultInteractiveConfirm.
			WithDefaultText("Do you want to delete and recreate it?").
			Show()

		if !result {
			ui.PrintInfo("Keeping existing cluster")
			return nil
		}

		// Delete existing cluster
		if err := deleteCluster(ctx); err != nil {
			return err
		}
	}

	// Find the Kind config file
	configPath, err := findKindConfig()
	if err != nil {
		return err
	}

	ui.PrintInfo(fmt.Sprintf("Using Kind config: %s", configPath))

	spinner, err := ui.StartSpinner("Creating Kind cluster (this may take a few minutes)...")
	if err != nil {
		return err
	}

	// Create the cluster
	createCmd := exec.CommandContext(ctx, "kind", "create", "cluster",
		"--name", kindClusterName,
		"--config", configPath,
		"--wait", "5m",
	)

	output, err := createCmd.CombinedOutput()
	if err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create cluster")
		return fmt.Errorf("failed to create cluster: %s: %w", string(output), err)
	}

	ui.StopSpinner(spinner, "Kind cluster created successfully")

	// Print cluster info
	pterm.Println()
	pterm.DefaultSection.Println("Cluster Information")

	kubeconfigPath := getKubeconfigPath()
	ui.PrintTable([]string{"Property", "Value"}, [][]string{
		{"Cluster Name", kindClusterName},
		{"Kubeconfig", kubeconfigPath},
		{"Control Plane", fmt.Sprintf("%s-control-plane", kindClusterName)},
		{"Workers", "2"},
	})

	pterm.Println()
	ui.PrintInfo("Next steps:")
	pterm.Printf("  1. Export kubeconfig: %s\n", pterm.LightCyan(fmt.Sprintf("export KUBECONFIG=%s", kubeconfigPath)))
	pterm.Printf("  2. Install components: %s\n", pterm.LightCyan("kbctl install"))

	return nil
}

func runClusterDelete(cmd *cobra.Command, args []string) error {
	ui.Banner()

	ctx := context.Background()

	if !clusterExists(ctx) {
		ui.PrintWarning(fmt.Sprintf("Cluster '%s' does not exist", kindClusterName))
		return nil
	}

	// Confirm deletion
	result, _ := pterm.DefaultInteractiveConfirm.
		WithDefaultText(fmt.Sprintf("Are you sure you want to delete cluster '%s'?", kindClusterName)).
		Show()

	if !result {
		ui.PrintInfo("Deletion cancelled")
		return nil
	}

	return deleteCluster(ctx)
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	ui.Banner()

	ctx := context.Background()

	if !clusterExists(ctx) {
		ui.PrintWarning(fmt.Sprintf("Cluster '%s' does not exist", kindClusterName))
		return nil
	}

	// Get cluster info
	spinner, err := ui.StartSpinner("Getting cluster status...")
	if err != nil {
		return err
	}

	// Get nodes
	nodesCmd := exec.CommandContext(ctx, "kubectl", "get", "nodes", "-o", "wide",
		"--kubeconfig", getKubeconfigPath())
	nodesOutput, err := nodesCmd.Output()
	if err != nil {
		ui.StopSpinnerFail(spinner, "Failed to get cluster status")
		return fmt.Errorf("failed to get nodes: %w", err)
	}

	ui.StopSpinner(spinner, "Cluster is running")

	pterm.Println()
	pterm.DefaultSection.Println("Cluster Nodes")
	pterm.Println(string(nodesOutput))

	// Get installed components
	pterm.DefaultSection.Println("Installed Components")

	components := []struct {
		name      string
		namespace string
		deploy    string
	}{
		{"Cilium", "kube-system", "cilium-operator"},
		{"cert-manager", "cert-manager", "cert-manager"},
		{"CloudNativePG", "cnpg-system", "cnpg-controller-manager"},
		{"RabbitMQ Operator", "rabbitmq-system", "rabbitmq-cluster-operator"},
	}

	var componentData [][]string
	for _, c := range components {
		status := pterm.Red("Not Installed")
		checkCmd := exec.CommandContext(ctx, "kubectl", "get", "deployment", c.deploy,
			"-n", c.namespace, "--kubeconfig", getKubeconfigPath())
		if err := checkCmd.Run(); err == nil {
			status = pterm.Green("Installed")
		}
		componentData = append(componentData, []string{c.name, c.namespace, status})
	}

	ui.PrintTable([]string{"Component", "Namespace", "Status"}, componentData)

	return nil
}

func clusterExists(ctx context.Context) bool {
	cmd := exec.CommandContext(ctx, "kind", "get", "clusters")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	clusters := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, c := range clusters {
		if c == kindClusterName {
			return true
		}
	}
	return false
}

func deleteCluster(ctx context.Context) error {
	spinner, err := ui.StartSpinner("Deleting Kind cluster...")
	if err != nil {
		return err
	}

	deleteCmd := exec.CommandContext(ctx, "kind", "delete", "cluster", "--name", kindClusterName)
	if output, err := deleteCmd.CombinedOutput(); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to delete cluster")
		return fmt.Errorf("failed to delete cluster: %s: %w", string(output), err)
	}

	ui.StopSpinner(spinner, "Kind cluster deleted successfully")
	return nil
}

func findKindConfig() (string, error) {
	// Look for config relative to the executable or in known locations
	possiblePaths := []string{
		"infra/control-plane/clusters/local/kind-config.yaml",
		"../clusters/local/kind-config.yaml",
		"clusters/local/kind-config.yaml",
	}

	// Try to find from current directory
	cwd, err := os.Getwd()
	if err == nil {
		for _, p := range possiblePaths {
			fullPath := filepath.Join(cwd, p)
			if _, err := os.Stat(fullPath); err == nil {
				return fullPath, nil
			}
		}
	}

	// Try to find from executable location
	execPath, err := os.Executable()
	if err == nil {
		execDir := filepath.Dir(execPath)
		for _, p := range possiblePaths {
			fullPath := filepath.Join(execDir, p)
			if _, err := os.Stat(fullPath); err == nil {
				return fullPath, nil
			}
		}
	}

	return "", fmt.Errorf("kind-config.yaml not found. Expected at: infra/control-plane/clusters/local/kind-config.yaml")
}

func getKubeconfigPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kube", "config")
}

// WaitForCluster waits for the cluster to be ready
func WaitForCluster(ctx context.Context, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		cmd := exec.CommandContext(ctx, "kubectl", "cluster-info",
			"--kubeconfig", getKubeconfigPath())
		if err := cmd.Run(); err == nil {
			return nil
		}
		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("timeout waiting for cluster to be ready")
}
