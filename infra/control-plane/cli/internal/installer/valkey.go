package installer

import (
	"context"
	"fmt"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	ValkeyOperatorVersion   = "v0.0.61"
	ValkeyOperatorNamespace = "valkey-operator-system"
	ValkeyOperatorRepoName  = "hyperspike"
	ValkeyOperatorRepoURL   = "oci://ghcr.io/hyperspike/valkey-operator"
	ValkeyOperatorChartName = "valkey-operator"
)

// ValkeyOperatorInstaller handles Valkey operator installation
type ValkeyOperatorInstaller struct {
	kubeconfig string
}

// NewValkeyOperatorInstaller creates a new ValkeyOperatorInstaller
func NewValkeyOperatorInstaller(kubeconfig string) *ValkeyOperatorInstaller {
	return &ValkeyOperatorInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (v *ValkeyOperatorInstaller) Name() string {
	return "Valkey Operator"
}

// Version returns the component version
func (v *ValkeyOperatorInstaller) Version() string {
	return ValkeyOperatorVersion
}

// IsInstalled checks if Valkey operator is already installed
func (v *ValkeyOperatorInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for Valkey operator deployment
	_, err := client.AppsV1().Deployments(ValkeyOperatorNamespace).Get(ctx, "valkey-operator-controller-manager", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check Valkey operator installation: %w", err)
	}
	return true, nil
}

// Install installs Valkey operator
func (v *ValkeyOperatorInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(v.Name(), v.Version())

	// Check if already installed
	installed, err := v.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("Valkey Operator is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing Valkey Operator...")
	if err != nil {
		return err
	}

	// Valkey operator Helm values - minimal configuration
	values := map[string]interface{}{}

	ui.PrintStep(1, 1, "Installing Valkey Operator Helm chart from OCI registry")
	helmInstaller := &HelmInstaller{
		Kubeconfig: kubeconfig,
		Namespace:  ValkeyOperatorNamespace,
		RepoName:   ValkeyOperatorRepoName,
		RepoURL:    ValkeyOperatorRepoURL,
		ChartName:  ValkeyOperatorChartName,
		Version:    ValkeyOperatorVersion,
		Values:     values,
		IsOCI:      true, // Use OCI registry
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install Valkey Operator")
		return err
	}

	ui.StopSpinner(spinner, "Valkey Operator installed successfully")
	return nil
}
