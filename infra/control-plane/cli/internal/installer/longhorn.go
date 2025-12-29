package installer

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"k8s.io/client-go/kubernetes"
)

const (
	LonghornStorageClassName = "kibamail-nvme-storage"
	LonghornStorageVersion   = "1.0.0"
)

// LonghornStorageClassInstaller handles Longhorn StorageClass installation
type LonghornStorageClassInstaller struct {
	kubeconfig string
}

// NewLonghornStorageClassInstaller creates a new LonghornStorageClassInstaller
func NewLonghornStorageClassInstaller(kubeconfig string) *LonghornStorageClassInstaller {
	return &LonghornStorageClassInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (l *LonghornStorageClassInstaller) Name() string {
	return "Longhorn StorageClass"
}

// Version returns the component version
func (l *LonghornStorageClassInstaller) Version() string {
	return LonghornStorageVersion
}

// IsInstalled checks if the Longhorn StorageClass already exists
func (l *LonghornStorageClassInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	cmd := exec.CommandContext(ctx, "kubectl", "get", "storageclass", LonghornStorageClassName, "--kubeconfig", l.kubeconfig)
	output, err := cmd.CombinedOutput()
	if err != nil {
		if strings.Contains(string(output), "NotFound") || strings.Contains(string(output), "not found") {
			return false, nil
		}
		return false, fmt.Errorf("failed to check StorageClass: %w", err)
	}
	return true, nil
}

// Install creates the Longhorn StorageClass
func (l *LonghornStorageClassInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(l.Name(), l.Version())

	// Check if already installed
	installed, err := l.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("Longhorn StorageClass is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Creating Longhorn StorageClass...")
	if err != nil {
		return err
	}

	ui.PrintStep(1, 1, "Creating StorageClass kibamail-nvme-storage")

	storageClassYAML := `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: kibamail-nvme-storage
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
parameters:
  numberOfReplicas: "1"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  dataLocality: "best-effort"
  fsType: "ext4"`

	cmd := exec.CommandContext(ctx, "kubectl", "apply", "-f", "-", "--kubeconfig", kubeconfig)
	cmd.Stdin = strings.NewReader(storageClassYAML)
	output, err := cmd.CombinedOutput()
	if err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create Longhorn StorageClass")
		return fmt.Errorf("failed to create StorageClass: %s: %w", strings.TrimSpace(string(output)), err)
	}

	ui.StopSpinner(spinner, "Longhorn StorageClass created successfully")
	return nil
}
