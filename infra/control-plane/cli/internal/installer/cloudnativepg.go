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
	CloudNativePGVersion   = "0.26.1"
	CloudNativePGNamespace = "cnpg-system"
	CloudNativePGRepoName  = "cnpg"
	CloudNativePGRepoURL   = "https://cloudnative-pg.github.io/charts"
	CloudNativePGChartName = "cloudnative-pg"
)

// CloudNativePGInstaller handles CloudNativePG operator installation
type CloudNativePGInstaller struct {
	kubeconfig string
}

// NewCloudNativePGInstaller creates a new CloudNativePGInstaller
func NewCloudNativePGInstaller(kubeconfig string) *CloudNativePGInstaller {
	return &CloudNativePGInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (c *CloudNativePGInstaller) Name() string {
	return "CloudNativePG"
}

// Version returns the component version
func (c *CloudNativePGInstaller) Version() string {
	return CloudNativePGVersion
}

// IsInstalled checks if CloudNativePG is already installed
func (c *CloudNativePGInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for CloudNativePG deployment (helm release name is "cloudnative-pg")
	_, err := client.AppsV1().Deployments(CloudNativePGNamespace).Get(ctx, "cloudnative-pg", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check CloudNativePG installation: %w", err)
	}
	return true, nil
}

// Install installs CloudNativePG operator
func (c *CloudNativePGInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(c.Name(), c.Version())

	// Check if already installed
	installed, err := c.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("CloudNativePG is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing CloudNativePG Operator...")
	if err != nil {
		return err
	}

	// CloudNativePG Helm values
	values := map[string]interface{}{
		"monitoring": map[string]interface{}{
			"podMonitorEnabled": false, // Enable if Prometheus Operator is installed
		},
	}

	ui.PrintStep(1, 1, "Installing CloudNativePG Helm chart")
	helmInstaller := &HelmInstaller{
		Kubeconfig: kubeconfig,
		Namespace:  CloudNativePGNamespace,
		RepoName:   CloudNativePGRepoName,
		RepoURL:    CloudNativePGRepoURL,
		ChartName:  CloudNativePGChartName,
		Version:    CloudNativePGVersion,
		Values:     values,
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install CloudNativePG")
		return err
	}

	ui.StopSpinner(spinner, "CloudNativePG installed successfully")
	return nil
}
