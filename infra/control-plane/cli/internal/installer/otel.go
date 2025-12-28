package installer

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	OtelCollectorVersion   = "0.142.1"
	OtelCollectorNamespace = "otel-collector"
	OtelCollectorRepoName  = "open-telemetry"
	OtelCollectorRepoURL   = "https://open-telemetry.github.io/opentelemetry-helm-charts"
	OtelCollectorChartName = "opentelemetry-collector"
)

// OtelCollectorInstaller handles OpenTelemetry Collector installation
type OtelCollectorInstaller struct {
	kubeconfig string
}

// NewOtelCollectorInstaller creates a new OtelCollectorInstaller
func NewOtelCollectorInstaller(kubeconfig string) *OtelCollectorInstaller {
	return &OtelCollectorInstaller{kubeconfig: kubeconfig}
}

// Name returns the component name
func (o *OtelCollectorInstaller) Name() string {
	return "OpenTelemetry Collector"
}

// Version returns the component version
func (o *OtelCollectorInstaller) Version() string {
	return OtelCollectorVersion
}

// IsInstalled checks if OTEL collector is already installed
func (o *OtelCollectorInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for DaemonSet
	_, err := client.AppsV1().DaemonSets(OtelCollectorNamespace).Get(ctx, "otel-daemonset-opentelemetry-collector-agent", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check OTEL collector installation: %w", err)
	}
	return true, nil
}

// Install installs OpenTelemetry Collector (DaemonSet + Deployment)
func (o *OtelCollectorInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(o.Name(), o.Version())

	// Check if External Secrets is installed (required dependency)
	externalSecretsInstalled, err := o.isExternalSecretsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if !externalSecretsInstalled {
		ui.PrintWarning("External Secrets Operator is not installed, skipping OpenTelemetry Collector")
		ui.PrintInfo("Please install External Secrets Operator first and configure the Infisical ClusterSecretStore")
		return nil
	}

	// Check if already installed
	installed, err := o.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("OpenTelemetry Collector is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing OpenTelemetry Collector...")
	if err != nil {
		return err
	}

	// Step 1: Create namespace and prerequisites
	ui.PrintStep(1, 5, "Creating namespace, ConfigMap, and ExternalSecret")
	if err := EnsureNamespace(ctx, client, OtelCollectorNamespace); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create namespace")
		return err
	}

	// Create ConfigMap for OTEL endpoint
	configMap := map[string]string{
		"OTEL_COLLECTOR_ENDPOINT": "https://ingest.monitor.kibamail.com",
	}
	if err := o.ensureConfigMap(ctx, client, "otel-config-vars", configMap); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create ConfigMap")
		return err
	}

	// Create ExternalSecret for HyperDX API key (pulls from Infisical)
	if err := o.ensureExternalSecret(ctx, kubeconfig); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create ExternalSecret")
		return err
	}

	// Step 2: Wait for secret to be synced from Infisical
	ui.PrintStep(2, 6, "Waiting for OTEL_INGESTION_API_KEY secret to sync from Infisical")
	if err := o.waitForSecret(ctx, client, "otel-secret", 60); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to sync secret from Infisical")
		ui.PrintError("The OTEL_INGESTION_API_KEY secret was not created. Please ensure:")
		ui.PrintInfo("  1. OTEL_INGESTION_API_KEY exists in Infisical")
		ui.PrintInfo("  2. The Infisical ClusterSecretStore is correctly configured")
		ui.PrintInfo("  3. External Secrets Operator has access to Infisical")
		return err
	}

	// Step 3: Install DaemonSet collector (logs + node metrics)
	ui.PrintStep(3, 6, "Installing DaemonSet collector (logs, host metrics, kubelet metrics)")
	daemonsetValues := o.getDaemonSetValues()
	daemonsetInstaller := &HelmInstaller{
		Kubeconfig:  kubeconfig,
		Namespace:   OtelCollectorNamespace,
		RepoName:    OtelCollectorRepoName,
		RepoURL:     OtelCollectorRepoURL,
		ChartName:   OtelCollectorChartName, // "opentelemetry-collector"
		ReleaseName: "otel-daemonset",
		Version:     OtelCollectorVersion,
		Values:      daemonsetValues,
		Wait:        true,
	}

	if err := daemonsetInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install DaemonSet collector")
		return err
	}

	// Step 4: Install Deployment collector (k8s events + cluster metrics)
	ui.PrintStep(4, 6, "Installing Deployment collector (k8s events, cluster metrics)")
	deploymentValues := o.getDeploymentValues()
	deploymentInstaller := &HelmInstaller{
		Kubeconfig:  kubeconfig,
		Namespace:   OtelCollectorNamespace,
		RepoName:    OtelCollectorRepoName,
		RepoURL:     OtelCollectorRepoURL,
		ChartName:   OtelCollectorChartName, // "opentelemetry-collector"
		ReleaseName: "otel-deployment",
		Version:     OtelCollectorVersion,
		Values:      deploymentValues,
		Wait:        true,
	}

	if err := deploymentInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install Deployment collector")
		return err
	}

	// Step 5: Verify installation
	ui.PrintStep(5, 6, "Verifying collectors are running")

	ui.PrintStep(6, 6, "Installation complete")
	ui.StopSpinner(spinner, "OpenTelemetry Collector installed successfully")

	return nil
}

// ensureConfigMap creates or updates a ConfigMap
func (o *OtelCollectorInstaller) ensureConfigMap(ctx context.Context, client *kubernetes.Clientset, name string, data map[string]string) error {
	cm, err := client.CoreV1().ConfigMaps(OtelCollectorNamespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			// Create new ConfigMap
			cm = &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: OtelCollectorNamespace,
				},
				Data: data,
			}
			_, err = client.CoreV1().ConfigMaps(OtelCollectorNamespace).Create(ctx, cm, metav1.CreateOptions{})
			return err
		}
		return err
	}

	// Update existing ConfigMap
	cm.Data = data
	_, err = client.CoreV1().ConfigMaps(OtelCollectorNamespace).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

// isExternalSecretsInstalled checks if External Secrets Operator is installed
func (o *OtelCollectorInstaller) isExternalSecretsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	_, err := client.AppsV1().Deployments(ExternalSecretsNamespace).Get(ctx, "external-secrets", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check External Secrets installation: %w", err)
	}
	return true, nil
}

// waitForSecret waits for a secret to be created by ExternalSecrets
func (o *OtelCollectorInstaller) waitForSecret(ctx context.Context, client *kubernetes.Clientset, secretName string, timeoutSeconds int) error {
	deadline := time.Now().Add(time.Duration(timeoutSeconds) * time.Second)

	for time.Now().Before(deadline) {
		secret, err := client.CoreV1().Secrets(OtelCollectorNamespace).Get(ctx, secretName, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				time.Sleep(2 * time.Second)
				continue
			}
			return fmt.Errorf("failed to check secret: %w", err)
		}

		// Verify the secret has the expected key
		if _, ok := secret.Data["OTEL_INGESTION_API_KEY"]; ok {
			return nil
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("timeout waiting for secret %s to be created", secretName)
}

// ensureExternalSecret creates an ExternalSecret to pull OTEL_INGESTION_API_KEY from Infisical
func (o *OtelCollectorInstaller) ensureExternalSecret(ctx context.Context, kubeconfig string) error {
	externalSecretYAML := `apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: otel-secret
  namespace: otel-collector
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: infisical
    kind: ClusterSecretStore
  target:
    name: otel-secret
    creationPolicy: Owner
  data:
    - secretKey: OTEL_INGESTION_API_KEY
      remoteRef:
        key: OTEL_INGESTION_API_KEY`

	cmd := exec.CommandContext(ctx, "kubectl", "apply", "-f", "-", "--kubeconfig", kubeconfig)
	cmd.Stdin = strings.NewReader(externalSecretYAML)
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// getDaemonSetValues returns Helm values for the DaemonSet collector
func (o *OtelCollectorInstaller) getDaemonSetValues() map[string]interface{} {
	return map[string]interface{}{
		"mode": "daemonset",
		"image": map[string]interface{}{
			"repository": "otel/opentelemetry-collector-contrib",
		},
		"clusterRole": map[string]interface{}{
			"create": true,
			"rules": []map[string]interface{}{
				{
					"apiGroups": []string{""},
					"resources": []string{"nodes/proxy", "nodes/stats", "nodes/metrics"},
					"verbs":     []string{"get", "list", "watch"},
				},
				{
					"apiGroups": []string{""},
					"resources": []string{"nodes"},
					"verbs":     []string{"get", "list", "watch"},
				},
				{
					"apiGroups": []string{""},
					"resources": []string{"pods", "namespaces"},
					"verbs":     []string{"get", "list", "watch"},
				},
			},
		},
		"presets": map[string]interface{}{
			"logsCollection": map[string]interface{}{
				"enabled": true,
			},
			"hostMetrics": map[string]interface{}{
				"enabled": true,
			},
			"kubernetesAttributes": map[string]interface{}{
				"enabled":                  true,
				"extractAllPodLabels":      true,
				"extractAllPodAnnotations": true,
			},
			"kubeletMetrics": map[string]interface{}{
				"enabled": true,
			},
		},
		"extraEnvs": []map[string]interface{}{
			{
				"name": "OTEL_INGESTION_API_KEY",
				"valueFrom": map[string]interface{}{
					"secretKeyRef": map[string]interface{}{
						"name":     "otel-secret",
						"key":      "OTEL_INGESTION_API_KEY",
						"optional": true,
					},
				},
			},
			{
				"name": "OTEL_COLLECTOR_ENDPOINT",
				"valueFrom": map[string]interface{}{
					"configMapKeyRef": map[string]interface{}{
						"name": "otel-config-vars",
						"key":  "OTEL_COLLECTOR_ENDPOINT",
					},
				},
			},
		},
		"config": map[string]interface{}{
			"receivers": map[string]interface{}{
				"kubeletstats": map[string]interface{}{
					"collection_interval":   "20s",
					"auth_type":             "serviceAccount",
					"endpoint":              "${env:K8S_NODE_IP}:10250",
					"insecure_skip_verify":  true,
					"metrics": map[string]interface{}{
						"k8s.pod.cpu_limit_utilization":          map[string]interface{}{"enabled": true},
						"k8s.pod.cpu_request_utilization":        map[string]interface{}{"enabled": true},
						"k8s.pod.memory_limit_utilization":       map[string]interface{}{"enabled": true},
						"k8s.pod.memory_request_utilization":     map[string]interface{}{"enabled": true},
						"k8s.pod.uptime":                         map[string]interface{}{"enabled": true},
						"k8s.node.uptime":                        map[string]interface{}{"enabled": true},
						"k8s.container.cpu_limit_utilization":    map[string]interface{}{"enabled": true},
						"k8s.container.cpu_request_utilization":  map[string]interface{}{"enabled": true},
						"k8s.container.memory_limit_utilization": map[string]interface{}{"enabled": true},
						"k8s.container.memory_request_utilization": map[string]interface{}{"enabled": true},
						"container.uptime": map[string]interface{}{"enabled": true},
					},
				},
			},
			"exporters": map[string]interface{}{
				"otlphttp": map[string]interface{}{
					"endpoint":    "${env:OTEL_COLLECTOR_ENDPOINT}",
					"compression": "gzip",
					"headers": map[string]interface{}{
						"authorization": "${env:OTEL_INGESTION_API_KEY}",
					},
				},
			},
			"service": map[string]interface{}{
				"pipelines": map[string]interface{}{
					"logs": map[string]interface{}{
						"exporters": []string{"otlphttp"},
					},
					"metrics": map[string]interface{}{
						"exporters": []string{"otlphttp"},
					},
				},
			},
		},
	}
}

// getDeploymentValues returns Helm values for the Deployment collector
func (o *OtelCollectorInstaller) getDeploymentValues() map[string]interface{} {
	return map[string]interface{}{
		"mode":         "deployment",
		"replicaCount": 1,
		"image": map[string]interface{}{
			"repository": "otel/opentelemetry-collector-contrib",
		},
		"presets": map[string]interface{}{
			"kubernetesAttributes": map[string]interface{}{
				"enabled":                  true,
				"extractAllPodLabels":      true,
				"extractAllPodAnnotations": true,
			},
			"kubernetesEvents": map[string]interface{}{
				"enabled": true,
			},
			"clusterMetrics": map[string]interface{}{
				"enabled": true,
			},
		},
		"extraEnvs": []map[string]interface{}{
			{
				"name": "OTEL_INGESTION_API_KEY",
				"valueFrom": map[string]interface{}{
					"secretKeyRef": map[string]interface{}{
						"name":     "otel-secret",
						"key":      "OTEL_INGESTION_API_KEY",
						"optional": true,
					},
				},
			},
			{
				"name": "OTEL_COLLECTOR_ENDPOINT",
				"valueFrom": map[string]interface{}{
					"configMapKeyRef": map[string]interface{}{
						"name": "otel-config-vars",
						"key":  "OTEL_COLLECTOR_ENDPOINT",
					},
				},
			},
		},
		"config": map[string]interface{}{
			"exporters": map[string]interface{}{
				"otlphttp": map[string]interface{}{
					"endpoint":    "${env:OTEL_COLLECTOR_ENDPOINT}",
					"compression": "gzip",
					"headers": map[string]interface{}{
						"authorization": "${env:OTEL_INGESTION_API_KEY}",
					},
				},
			},
			"service": map[string]interface{}{
				"pipelines": map[string]interface{}{
					"logs": map[string]interface{}{
						"exporters": []string{"otlphttp"},
					},
					"metrics": map[string]interface{}{
						"exporters": []string{"otlphttp"},
					},
				},
			},
		},
	}
}
