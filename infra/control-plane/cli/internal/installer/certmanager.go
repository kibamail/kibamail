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
	CertManagerVersion   = "v1.19.1"
	CertManagerNamespace = "cert-manager"
	CertManagerRepoName  = "jetstack"
	CertManagerRepoURL   = "oci://quay.io/jetstack/charts/cert-manager"
	CertManagerChartName = "cert-manager"
)

// CertManagerInstaller handles cert-manager installation
type CertManagerInstaller struct {
	kubeconfig string
}

// NewCertManagerInstaller creates a new CertManagerInstaller
func NewCertManagerInstaller(kubeconfig string) *CertManagerInstaller {
	return &CertManagerInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (c *CertManagerInstaller) Name() string {
	return "cert-manager"
}

// Version returns the component version
func (c *CertManagerInstaller) Version() string {
	return CertManagerVersion
}

// IsInstalled checks if cert-manager is already installed
func (c *CertManagerInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for cert-manager deployment
	_, err := client.AppsV1().Deployments(CertManagerNamespace).Get(ctx, "cert-manager", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check cert-manager installation: %w", err)
	}
	return true, nil
}

// Install installs cert-manager
func (c *CertManagerInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(c.Name(), c.Version())

	// Check if already installed
	installed, err := c.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("cert-manager is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing cert-manager...")
	if err != nil {
		return err
	}

	// cert-manager Helm values - minimal configuration as per requirements
	values := map[string]interface{}{
		"crds": map[string]interface{}{
			"enabled": true,
		},
	}

	ui.PrintStep(1, 1, "Installing cert-manager Helm chart from OCI registry")
	helmInstaller := &HelmInstaller{
		Kubeconfig: kubeconfig,
		Namespace:  CertManagerNamespace,
		RepoName:   CertManagerRepoName,
		RepoURL:    CertManagerRepoURL,
		ChartName:  CertManagerChartName,
		Version:    CertManagerVersion,
		Values:     values,
		IsOCI:      true, // Use OCI registry
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install cert-manager")
		return err
	}

	ui.StopSpinner(spinner, "cert-manager installed successfully")
	return nil
}
