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
	ExternalSecretsVersion   = "0.12.1"
	ExternalSecretsNamespace = "external-secrets"
	ExternalSecretsRepoName  = "external-secrets"
	ExternalSecretsRepoURL   = "https://charts.external-secrets.io"
	ExternalSecretsChartName = "external-secrets"
)

// ExternalSecretsInstaller handles External Secrets Operator installation
type ExternalSecretsInstaller struct {
	kubeconfig string
}

// NewExternalSecretsInstaller creates a new ExternalSecretsInstaller
func NewExternalSecretsInstaller(kubeconfig string) *ExternalSecretsInstaller {
	return &ExternalSecretsInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (e *ExternalSecretsInstaller) Name() string {
	return "External Secrets"
}

// Version returns the component version
func (e *ExternalSecretsInstaller) Version() string {
	return ExternalSecretsVersion
}

// IsInstalled checks if External Secrets Operator is already installed
func (e *ExternalSecretsInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	_, err := client.AppsV1().Deployments(ExternalSecretsNamespace).Get(ctx, "external-secrets", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check External Secrets installation: %w", err)
	}
	return true, nil
}

// Install installs External Secrets Operator
func (e *ExternalSecretsInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(e.Name(), e.Version())

	// Check if already installed
	installed, err := e.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("External Secrets is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing External Secrets Operator...")
	if err != nil {
		return err
	}

	values := map[string]interface{}{
		"installCRDs": true,
	}

	ui.PrintStep(1, 1, "Installing External Secrets Helm chart")
	helmInstaller := &HelmInstaller{
		Kubeconfig: kubeconfig,
		Namespace:  ExternalSecretsNamespace,
		RepoName:   ExternalSecretsRepoName,
		RepoURL:    ExternalSecretsRepoURL,
		ChartName:  ExternalSecretsChartName,
		Version:    ExternalSecretsVersion,
		Values:     values,
		Wait:       true,
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install External Secrets")
		return err
	}

	ui.StopSpinner(spinner, "External Secrets installed successfully")
	return nil
}
