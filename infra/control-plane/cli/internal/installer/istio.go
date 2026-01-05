package installer

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	IstioVersion   = "1.28.2"
	IstioNamespace = "istio-system"
)

// IstioInstaller handles Istio installation for Gateway API support
// Istio is used instead of Cilium Gateway API due to hostNetwork bugs in Cilium
type IstioInstaller struct {
	kubeconfig string
}

// NewIstioInstaller creates a new IstioInstaller
func NewIstioInstaller(kubeconfig string) *IstioInstaller {
	return &IstioInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (i *IstioInstaller) Name() string {
	return "Istio"
}

// Version returns the component version
func (i *IstioInstaller) Version() string {
	return IstioVersion
}

// IsInstalled checks if Istio is already installed
func (i *IstioInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for istiod deployment
	_, err := client.AppsV1().Deployments(IstioNamespace).Get(ctx, "istiod", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check istio installation: %w", err)
	}
	return true, nil
}

// Install installs Istio with Gateway API support (minimal profile, no sidecars)
func (i *IstioInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(i.Name(), i.Version())

	// Check if already installed
	installed, err := i.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("Istio is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing Istio Gateway API controller...")
	if err != nil {
		return err
	}

	// Check if istioctl is available
	ui.PrintStep(1, 3, "Checking istioctl")
	if err := i.checkIstioctl(ctx); err != nil {
		ui.StopSpinnerFail(spinner, "istioctl not found")
		return fmt.Errorf("istioctl not found: %w. Please install istioctl v%s or later", err, IstioVersion)
	}

	// Create Istio configuration file
	ui.PrintStep(2, 3, "Installing Istio")
	configFile, err := i.createIstioConfig()
	if err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create Istio config")
		return fmt.Errorf("failed to create istio config: %w", err)
	}
	defer os.Remove(configFile)

	// Install Istio using istioctl
	if err := i.installIstio(ctx, configFile); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install Istio")
		return fmt.Errorf("failed to install istio: %w", err)
	}

	// Wait for Istio to be ready
	ui.PrintStep(3, 3, "Waiting for Istio to be ready")
	if err := i.waitForIstio(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Istio installation timed out")
		return err
	}

	ui.StopSpinner(spinner, "Istio installed successfully")
	return nil
}

// checkIstioctl verifies that istioctl is installed
func (i *IstioInstaller) checkIstioctl(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "istioctl", "version", "--short")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("istioctl not found: %w", err)
	}
	ui.PrintInfo(fmt.Sprintf("Found istioctl: %s", strings.TrimSpace(string(output))))
	return nil
}

// createIstioConfig creates the IstioOperator configuration file
func (i *IstioInstaller) createIstioConfig() (string, error) {
	// Istio configuration for Gateway API only (no sidecars, no mesh)
	// The managed gateway deployment will be customized per Gateway resource
	// using ConfigMap + infrastructure.parametersRef for hostNetwork support
	config := `apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gateway-only
spec:
  profile: minimal
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    pilot:
      enabled: true
    # Don't install default ingressGateway - we use managed gateways per Gateway resource
    ingressGateways: []
  values:
    global:
      proxy:
        autoInject: disabled  # No sidecar injection - we only use Gateway API
    pilot:
      env:
        PILOT_ENABLE_GATEWAY_API: "true"
        PILOT_ENABLE_GATEWAY_API_STATUS: "true"
        PILOT_ENABLE_ALPHA_GATEWAY_API: "true"
`

	tmpFile, err := os.CreateTemp("", "istio-config-*.yaml")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}

	if _, err := tmpFile.WriteString(config); err != nil {
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("failed to write config: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("failed to close file: %w", err)
	}

	return tmpFile.Name(), nil
}

// installIstio installs Istio using istioctl
func (i *IstioInstaller) installIstio(ctx context.Context, configFile string) error {
	cmd := exec.CommandContext(ctx, "istioctl", "install",
		"-f", configFile,
		"--kubeconfig", i.kubeconfig,
		"--skip-confirmation",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("istioctl install failed: %s: %w", strings.TrimSpace(string(output)), err)
	}

	return nil
}

// waitForIstio waits for Istio components to be ready
func (i *IstioInstaller) waitForIstio(ctx context.Context, client *kubernetes.Clientset) error {
	timeout := 5 * time.Minute
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		deployment, err := client.AppsV1().Deployments(IstioNamespace).Get(ctx, "istiod", metav1.GetOptions{})
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		if deployment.Status.ReadyReplicas > 0 && deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
			return nil
		}

		time.Sleep(5 * time.Second)
	}

	return fmt.Errorf("timeout waiting for Istio to be ready")
}
