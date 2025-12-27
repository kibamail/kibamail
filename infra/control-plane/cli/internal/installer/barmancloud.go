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
	BarmanCloudVersion   = "v0.9.0"
	BarmanCloudNamespace = "cnpg-system"
)

// BarmanCloudInstaller handles Barman Cloud Plugin installation
type BarmanCloudInstaller struct {
	kubeconfig string
}

// NewBarmanCloudInstaller creates a new BarmanCloudInstaller
func NewBarmanCloudInstaller(kubeconfig string) *BarmanCloudInstaller {
	return &BarmanCloudInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (b *BarmanCloudInstaller) Name() string {
	return "Barman Cloud Plugin"
}

// Version returns the component version
func (b *BarmanCloudInstaller) Version() string {
	return BarmanCloudVersion
}

// IsInstalled checks if Barman Cloud Plugin is already installed
func (b *BarmanCloudInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	_, err := client.AppsV1().Deployments(BarmanCloudNamespace).Get(ctx, "barman-cloud", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check Barman Cloud Plugin installation: %w", err)
	}
	return true, nil
}

// Install installs Barman Cloud Plugin using official manifest
func (b *BarmanCloudInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(b.Name(), b.Version())

	// Check if already installed
	installed, err := b.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("Barman Cloud Plugin is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing Barman Cloud Plugin...")
	if err != nil {
		return err
	}

	manifestURL := fmt.Sprintf(
		"https://github.com/cloudnative-pg/plugin-barman-cloud/releases/download/%s/manifest.yaml",
		BarmanCloudVersion,
	)

	ui.PrintStep(1, 1, "Applying Barman Cloud Plugin manifest")
	if err := execCommand(ctx, "kubectl", "apply", "-f", manifestURL, "--kubeconfig="+kubeconfig); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to apply Barman Cloud Plugin manifest")
		return fmt.Errorf("failed to apply Barman Cloud Plugin manifest: %w", err)
	}

	ui.StopSpinner(spinner, "Barman Cloud Plugin installed successfully")
	return nil
}
