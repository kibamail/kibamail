package installer

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	CiliumVersion   = "1.18.4"
	CiliumNamespace = "kube-system"
	CiliumRepoName  = "cilium"
	CiliumRepoURL   = "https://helm.cilium.io/"
	CiliumChartName = "cilium"
)

// CiliumInstaller handles Cilium CNI installation with Gateway API support
type CiliumInstaller struct {
	kubeconfig string
}

// NewCiliumInstaller creates a new CiliumInstaller
func NewCiliumInstaller(kubeconfig string) *CiliumInstaller {
	return &CiliumInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (c *CiliumInstaller) Name() string {
	return "Cilium"
}

// Version returns the component version
func (c *CiliumInstaller) Version() string {
	return CiliumVersion
}

// IsInstalled checks if Cilium is already installed
func (c *CiliumInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for Cilium DaemonSet
	_, err := client.AppsV1().DaemonSets(CiliumNamespace).Get(ctx, "cilium", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check cilium installation: %w", err)
	}
	return true, nil
}

// Install installs Cilium with Gateway API support
func (c *CiliumInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(c.Name(), c.Version())

	// Check if already installed
	installed, err := c.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("Cilium is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing Cilium CNI with Gateway API support...")
	if err != nil {
		return err
	}

	// Install Gateway API CRDs first (required for Cilium Gateway API support)
	ui.PrintStep(1, 3, "Installing Gateway API CRDs")
	if err := c.installGatewayAPICRDs(ctx); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install Gateway API CRDs")
		return fmt.Errorf("failed to install Gateway API CRDs: %w", err)
	}

	// Cilium Helm values - minimal configuration as per requirements
	values := map[string]interface{}{
		"kubeProxyReplacement": true,
		"gatewayAPI": map[string]interface{}{
			"enabled": true,
			"hostNetwork": map[string]interface{}{
				"enabled": true,
			},
		},
	}

	ui.PrintStep(2, 3, "Installing Cilium Helm chart")
	helmInstaller := &HelmInstaller{
		Kubeconfig:  kubeconfig,
		Namespace:   CiliumNamespace,
		RepoName:    CiliumRepoName,
		RepoURL:     CiliumRepoURL,
		ChartName:   CiliumChartName,
		Version:     CiliumVersion,
		Values:      values,
		ReuseValues: true, // Reuse values from previous installation if exists
		Wait:        true, // Wait for Cilium to be ready
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install Cilium")
		return err
	}

	ui.PrintStep(3, 3, "Waiting for Cilium to be ready")
	if err := c.waitForCilium(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Cilium installation timed out")
		return err
	}

	ui.StopSpinner(spinner, "Cilium installed successfully")
	return nil
}

// installGatewayAPICRDs installs the Gateway API CRDs
func (c *CiliumInstaller) installGatewayAPICRDs(ctx context.Context) error {
	// Gateway API standard channel CRDs - individual files
	gatewayAPIVersion := "v1.2.0"
	baseURL := fmt.Sprintf(
		"https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/%s/config/crd/standard",
		gatewayAPIVersion,
	)

	// List of Gateway API CRDs to install
	crds := []string{
		"gateway.networking.k8s.io_gatewayclasses.yaml",
		"gateway.networking.k8s.io_gateways.yaml",
		"gateway.networking.k8s.io_httproutes.yaml",
		"gateway.networking.k8s.io_referencegrants.yaml",
		"gateway.networking.k8s.io_grpcroutes.yaml",
	}

	// Apply each CRD individually
	for _, crd := range crds {
		crdURL := fmt.Sprintf("%s/%s", baseURL, crd)
		if err := execCommand(ctx, "kubectl", "apply", "-f", crdURL, "--kubeconfig="+c.kubeconfig); err != nil {
			return fmt.Errorf("failed to apply %s: %w", crd, err)
		}
	}

	return nil
}

// waitForCilium waits for Cilium components to be ready
func (c *CiliumInstaller) waitForCilium(ctx context.Context, client *kubernetes.Clientset) error {
	timeout := 5 * time.Minute
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		ds, err := client.AppsV1().DaemonSets(CiliumNamespace).Get(ctx, "cilium", metav1.GetOptions{})
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		if ds.Status.NumberReady == ds.Status.DesiredNumberScheduled && ds.Status.NumberReady > 0 {
			return nil
		}

		time.Sleep(5 * time.Second)
	}

	return fmt.Errorf("timeout waiting for Cilium to be ready")
}

// execCommand executes a shell command
func execCommand(ctx context.Context, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("command failed: %s: %w", strings.TrimSpace(string(output)), err)
	}
	return nil
}
