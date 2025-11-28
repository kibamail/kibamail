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
	TiDBOperatorVersion   = "v1.6.3"
	TiDBOperatorNamespace = "tidb-admin"
	TiDBOperatorRepoName  = "pingcap"
	TiDBOperatorRepoURL   = "https://charts.pingcap.org/"
	TiDBOperatorChartName = "tidb-operator"
)

// TiDBOperatorInstaller handles TiDB operator installation
type TiDBOperatorInstaller struct {
	kubeconfig string
}

// NewTiDBOperatorInstaller creates a new TiDBOperatorInstaller
func NewTiDBOperatorInstaller(kubeconfig string) *TiDBOperatorInstaller {
	return &TiDBOperatorInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (t *TiDBOperatorInstaller) Name() string {
	return "TiDB Operator"
}

// Version returns the component version
func (t *TiDBOperatorInstaller) Version() string {
	return TiDBOperatorVersion
}

// IsInstalled checks if TiDB operator is already installed
func (t *TiDBOperatorInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for TiDB operator deployment
	_, err := client.AppsV1().Deployments(TiDBOperatorNamespace).Get(ctx, "tidb-controller-manager", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check TiDB operator installation: %w", err)
	}
	return true, nil
}

// Install installs TiDB operator
func (t *TiDBOperatorInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(t.Name(), t.Version())

	// Check if already installed
	installed, err := t.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("TiDB Operator is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing TiDB Operator...")
	if err != nil {
		return err
	}

	// Ensure namespace exists
	ui.PrintStep(1, 3, "Creating namespace")
	if err := EnsureNamespace(ctx, client, TiDBOperatorNamespace); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create namespace")
		return err
	}

	// Install TiDB CRDs first
	ui.PrintStep(2, 3, "Installing TiDB CRDs")
	if err := t.installCRDs(ctx, kubeconfig); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install TiDB CRDs")
		return err
	}

	// TiDB operator Helm values
	// Note: scheduler.create is false by default and not recommended for v1.6+
	values := map[string]interface{}{
		"controllerManager": map[string]interface{}{
			"create": true,
		},
	}

	ui.PrintStep(3, 3, "Installing TiDB Operator Helm chart")
	helmInstaller := &HelmInstaller{
		Kubeconfig: kubeconfig,
		Namespace:  TiDBOperatorNamespace,
		RepoName:   TiDBOperatorRepoName,
		RepoURL:    TiDBOperatorRepoURL,
		ChartName:  TiDBOperatorChartName,
		Version:    TiDBOperatorVersion,
		Values:     values,
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install TiDB Operator")
		return err
	}

	ui.StopSpinner(spinner, "TiDB Operator installed successfully")
	return nil
}

// installCRDs installs TiDB CRDs
func (t *TiDBOperatorInstaller) installCRDs(ctx context.Context, kubeconfig string) error {
	crdURL := fmt.Sprintf(
		"https://raw.githubusercontent.com/pingcap/tidb-operator/%s/manifests/crd.yaml",
		TiDBOperatorVersion,
	)
	return execCommand(ctx, "kubectl", "create", "-f", crdURL, "--kubeconfig="+kubeconfig)
}
