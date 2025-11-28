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
	RabbitMQOperatorVersion   = "v2.17.2"
	RabbitMQOperatorNamespace = "rabbitmq-system"
)

// RabbitMQOperatorInstaller handles RabbitMQ cluster operator installation
type RabbitMQOperatorInstaller struct {
	kubeconfig string
}

// NewRabbitMQOperatorInstaller creates a new RabbitMQOperatorInstaller
func NewRabbitMQOperatorInstaller(kubeconfig string) *RabbitMQOperatorInstaller {
	return &RabbitMQOperatorInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (r *RabbitMQOperatorInstaller) Name() string {
	return "RabbitMQ Cluster Operator"
}

// Version returns the component version
func (r *RabbitMQOperatorInstaller) Version() string {
	return RabbitMQOperatorVersion
}

// IsInstalled checks if RabbitMQ operator is already installed
func (r *RabbitMQOperatorInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for RabbitMQ operator deployment
	_, err := client.AppsV1().Deployments(RabbitMQOperatorNamespace).Get(ctx, "rabbitmq-cluster-operator", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check RabbitMQ operator installation: %w", err)
	}
	return true, nil
}

// Install installs RabbitMQ cluster operator using official manifest
func (r *RabbitMQOperatorInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(r.Name(), r.Version())

	// Check if already installed
	installed, err := r.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("RabbitMQ Cluster Operator is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing RabbitMQ Cluster Operator...")
	if err != nil {
		return err
	}

	// RabbitMQ operator is installed via kubectl manifest (official method)
	manifestURL := fmt.Sprintf(
		"https://github.com/rabbitmq/cluster-operator/releases/download/%s/cluster-operator.yml",
		RabbitMQOperatorVersion,
	)

	ui.PrintStep(1, 1, "Applying RabbitMQ Cluster Operator manifest")
	if err := execCommand(ctx, "kubectl", "apply", "-f", manifestURL, "--kubeconfig="+kubeconfig); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to apply RabbitMQ operator manifest")
		return fmt.Errorf("failed to apply RabbitMQ operator manifest: %w", err)
	}

	ui.StopSpinner(spinner, "RabbitMQ Cluster Operator installed successfully")
	return nil
}
