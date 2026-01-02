package installer

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	SignozK8sInfraVersion   = "0.15.0"
	SignozK8sInfraNamespace = "signoz-infra"
	SignozRepoName          = "signoz"
	SignozRepoURL           = "https://charts.signoz.io"
	SignozK8sInfraChartName = "k8s-infra"
	SignozReleaseName       = "kibamail-k8s-infra"
)

// SignozK8sInfraInstaller handles SigNoz K8s-Infra installation
type SignozK8sInfraInstaller struct {
	kubeconfig  string
	clusterName string
	environment string
}

// NewSignozK8sInfraInstaller creates a new SignozK8sInfraInstaller
func NewSignozK8sInfraInstaller(kubeconfig, clusterName, environment string) *SignozK8sInfraInstaller {
	return &SignozK8sInfraInstaller{
		kubeconfig:  kubeconfig,
		clusterName: clusterName,
		environment: environment,
	}
}

// Name returns the component name
func (s *SignozK8sInfraInstaller) Name() string {
	return "SigNoz K8s-Infra (OpenTelemetry)"
}

// Version returns the component version
func (s *SignozK8sInfraInstaller) Version() string {
	return SignozK8sInfraVersion
}

// IsInstalled checks if SigNoz K8s-Infra is already installed
func (s *SignozK8sInfraInstaller) IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error) {
	// Check for the otel-agent DaemonSet
	_, err := client.AppsV1().DaemonSets(SignozK8sInfraNamespace).Get(ctx, SignozReleaseName+"-otel-agent", metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check SigNoz K8s-Infra installation: %w", err)
	}
	return true, nil
}

// Install installs SigNoz K8s-Infra (otelAgent DaemonSet + otelDeployment)
func (s *SignozK8sInfraInstaller) Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error {
	ui.ComponentHeader(s.Name(), s.Version())

	// Check if already installed
	installed, err := s.IsInstalled(ctx, client)
	if err != nil {
		return err
	}
	if installed {
		ui.PrintWarning("SigNoz K8s-Infra is already installed, skipping")
		return nil
	}

	spinner, err := ui.StartSpinner("Installing SigNoz K8s-Infra...")
	if err != nil {
		return err
	}

	// Step 1: Create namespace
	ui.PrintStep(1, 4, "Creating namespace")
	if err := EnsureNamespace(ctx, client, SignozK8sInfraNamespace); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to create namespace")
		return err
	}

	// Step 2: Add SigNoz Helm repo
	ui.PrintStep(2, 4, "Adding SigNoz Helm repository")
	if err := s.addHelmRepo(ctx); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to add Helm repository")
		return err
	}

	// Step 3: Install SigNoz K8s-Infra chart
	ui.PrintStep(3, 4, "Installing SigNoz K8s-Infra Helm chart")
	values := s.getHelmValues()
	helmInstaller := &HelmInstaller{
		Kubeconfig:  kubeconfig,
		Namespace:   SignozK8sInfraNamespace,
		RepoName:    SignozRepoName,
		RepoURL:     SignozRepoURL,
		ChartName:   SignozK8sInfraChartName,
		ReleaseName: SignozReleaseName,
		Version:     SignozK8sInfraVersion,
		Values:      values,
		Wait:        true,
	}

	if err := helmInstaller.UpgradeOrInstallHelmChart(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to install SigNoz K8s-Infra")
		return err
	}

	// Step 4: Verify installation
	ui.PrintStep(4, 4, "Verifying installation")
	if err := s.verifyInstallation(ctx, client); err != nil {
		ui.StopSpinnerFail(spinner, "Failed to verify installation")
		return err
	}

	ui.StopSpinner(spinner, "SigNoz K8s-Infra installed successfully")

	// Print next steps
	ui.PrintInfo("")
	ui.PrintInfo("Applications can send telemetry to the otel-agent DaemonSet:")
	ui.PrintInfo("  OTEL_EXPORTER_OTLP_ENDPOINT: $(HOST_IP):4317")
	ui.PrintInfo("  Or use the service: " + SignozReleaseName + "-otel-agent." + SignozK8sInfraNamespace + ".svc.cluster.local:4317")

	return nil
}

// addHelmRepo adds the SigNoz Helm repository
func (s *SignozK8sInfraInstaller) addHelmRepo(ctx context.Context) error {
	// Add repo
	if err := execHelmCommand(ctx, "repo", "add", SignozRepoName, SignozRepoURL); err != nil {
		if !strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("failed to add SigNoz Helm repo: %w", err)
		}
	}

	// Update repos
	if err := execHelmCommand(ctx, "repo", "update"); err != nil {
		return fmt.Errorf("failed to update Helm repos: %w", err)
	}

	return nil
}

// getHelmValues returns the Helm values for SigNoz K8s-Infra
func (s *SignozK8sInfraInstaller) getHelmValues() map[string]interface{} {
	return map[string]interface{}{
		// Global configuration
		"global": map[string]interface{}{
			"clusterName":           s.clusterName,
			"deploymentEnvironment": s.environment,
			"cloud":                 "other",
		},

		// Cluster identification
		"clusterName": s.clusterName,

		// OTLP endpoint configuration - sends to self-hosted SigNoz backend
		// Using HTTPS port 443 with OTLP/HTTP protocol
		"otelCollectorEndpoint": "https://ingest.monitor.kibamail.com:443",
		"otelInsecure":          false,
		"insecureSkipVerify":    false,

		// Presets configuration
		"presets": map[string]interface{}{
			// Disable gRPC exporter - we use HTTP instead
			"otlpExporter": map[string]interface{}{
				"enabled": false,
			},
			// Enable HTTP exporter to send data to backend
			"otlphttpExporter": map[string]interface{}{
				"enabled": true,
			},
			// Disable logging exporter (only needed for debugging)
			"loggingExporter": map[string]interface{}{
				"enabled": false,
			},
			// Enable log collection from pods
			"logsCollection": map[string]interface{}{
				"enabled":         true,
				"startAt":         "end",
				"includeFilePath": true,
				"blacklist": map[string]interface{}{
					"enabled":    true,
					"signozLogs": true,
					"namespaces": []string{
						"kube-system",
					},
					"pods":       []string{},
					"containers": []string{},
				},
			},
			// Enable host metrics (CPU, memory, disk, network)
			"hostMetrics": map[string]interface{}{
				"enabled":            true,
				"collectionInterval": "30s",
			},
			// Enable kubelet metrics (pod/container resource usage)
			"kubeletMetrics": map[string]interface{}{
				"enabled":            true,
				"collectionInterval": "30s",
				"authType":           "serviceAccount",
				"insecureSkipVerify": true,
				"metrics": map[string]interface{}{
					"k8s.pod.cpu_limit_utilization": map[string]interface{}{
						"enabled": true,
					},
					"k8s.pod.cpu_request_utilization": map[string]interface{}{
						"enabled": true,
					},
					"k8s.pod.memory_limit_utilization": map[string]interface{}{
						"enabled": true,
					},
					"k8s.pod.memory_request_utilization": map[string]interface{}{
						"enabled": true,
					},
					"k8s.pod.uptime": map[string]interface{}{
						"enabled": true,
					},
					"k8s.node.uptime": map[string]interface{}{
						"enabled": true,
					},
					"container.uptime": map[string]interface{}{
						"enabled": true,
					},
				},
			},
			// Enable Kubernetes attributes processor
			"kubernetesAttributes": map[string]interface{}{
				"enabled":     true,
				"passthrough": false,
			},
			// Enable cluster metrics (node conditions, allocatable resources)
			"clusterMetrics": map[string]interface{}{
				"enabled":            true,
				"collectionInterval": "30s",
				"nodeConditionsToReport": []string{
					"Ready",
					"MemoryPressure",
					"DiskPressure",
					"PIDPressure",
					"NetworkUnavailable",
				},
				"allocatableTypesToReport": []string{
					"cpu",
					"memory",
				},
			},
			// Enable Kubernetes events collection
			"k8sEvents": map[string]interface{}{
				"enabled":    true,
				"authType":   "serviceAccount",
				"namespaces": []string{}, // All namespaces
			},
			// Enable resource detection
			"resourceDetection": map[string]interface{}{
				"enabled":  true,
				"timeout":  "2s",
				"override": false,
			},
			// Enable Prometheus scraping from pod annotations
			"prometheus": map[string]interface{}{
				"enabled":           true,
				"annotationsPrefix": "signoz.io",
				"scrapeInterval":    "30s",
				// Custom scrape configs for CloudNativePG
				"scrapeConfigs": []map[string]interface{}{
					{
						"job_name": "cloudnativepg",
						"kubernetes_sd_configs": []map[string]interface{}{
							{
								"role": "pod",
								"namespaces": map[string]interface{}{
									"names": []string{"cnpg-system"},
								},
							},
						},
						"relabel_configs": []map[string]interface{}{
							{
								// Only scrape pods with cnpg.io/cluster label
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_cluster"},
								"action":        "keep",
								"regex":         ".+",
							},
							{
								// Only scrape the metrics port (9187)
								"source_labels": []string{"__meta_kubernetes_pod_container_port_number"},
								"action":        "keep",
								"regex":         "9187",
							},
							{
								// Add namespace label
								"source_labels": []string{"__meta_kubernetes_namespace"},
								"target_label":  "namespace",
							},
							{
								// Add pod label
								"source_labels": []string{"__meta_kubernetes_pod_name"},
								"target_label":  "pod",
							},
							{
								// Add cluster label from cnpg.io/cluster
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_cluster"},
								"target_label":  "cnpg_cluster",
							},
							{
								// Add role label (primary/replica)
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_instanceRole"},
								"target_label":  "role",
							},
							{
								// Add instance name
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_instanceName"},
								"target_label":  "instance_name",
							},
						},
					},
					{
						// Scrape CloudNativePG operator metrics
						"job_name": "cloudnativepg-operator",
						"kubernetes_sd_configs": []map[string]interface{}{
							{
								"role": "pod",
								"namespaces": map[string]interface{}{
									"names": []string{"cnpg-system"},
								},
							},
						},
						"relabel_configs": []map[string]interface{}{
							{
								// Only scrape pods with app.kubernetes.io/name=cloudnative-pg
								"source_labels": []string{"__meta_kubernetes_pod_label_app_kubernetes_io_name"},
								"action":        "keep",
								"regex":         "cloudnative-pg",
							},
							{
								// Only scrape the metrics port (8080)
								"source_labels": []string{"__meta_kubernetes_pod_container_port_number"},
								"action":        "keep",
								"regex":         "8080",
							},
							{
								"source_labels": []string{"__meta_kubernetes_namespace"},
								"target_label":  "namespace",
							},
							{
								"source_labels": []string{"__meta_kubernetes_pod_name"},
								"target_label":  "pod",
							},
						},
					},
					{
						// Scrape PgBouncer pooler metrics
						"job_name": "cloudnativepg-pooler",
						"kubernetes_sd_configs": []map[string]interface{}{
							{
								"role": "pod",
								"namespaces": map[string]interface{}{
									"names": []string{"cnpg-system"},
								},
							},
						},
						"relabel_configs": []map[string]interface{}{
							{
								// Only scrape pods with cnpg.io/poolerName label
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_poolerName"},
								"action":        "keep",
								"regex":         ".+",
							},
							{
								// Only scrape the metrics port (9127)
								"source_labels": []string{"__meta_kubernetes_pod_container_port_number"},
								"action":        "keep",
								"regex":         "9127",
							},
							{
								"source_labels": []string{"__meta_kubernetes_namespace"},
								"target_label":  "namespace",
							},
							{
								"source_labels": []string{"__meta_kubernetes_pod_name"},
								"target_label":  "pod",
							},
							{
								"source_labels": []string{"__meta_kubernetes_pod_label_cnpg_io_poolerName"},
								"target_label":  "pooler_name",
							},
						},
					},
				},
			},
		},

		// OtelAgent (DaemonSet) configuration
		"otelAgent": map[string]interface{}{
			"enabled": true,
			"resources": map[string]interface{}{
				"requests": map[string]interface{}{
					"cpu":    "100m",
					"memory": "256Mi",
				},
				"limits": map[string]interface{}{
					"cpu":    "500m",
					"memory": "512Mi",
				},
			},
			"tolerations": []map[string]interface{}{
				{
					"operator": "Exists",
				},
			},
		},

		// OtelDeployment (Deployment) configuration
		"otelDeployment": map[string]interface{}{
			"enabled": true,
			"resources": map[string]interface{}{
				"requests": map[string]interface{}{
					"cpu":    "100m",
					"memory": "256Mi",
				},
				"limits": map[string]interface{}{
					"cpu":    "500m",
					"memory": "512Mi",
				},
			},
		},
	}
}

// verifyInstallation verifies that the SigNoz K8s-Infra components are running
func (s *SignozK8sInfraInstaller) verifyInstallation(ctx context.Context, client *kubernetes.Clientset) error {
	// Wait for DaemonSet to be ready
	if err := s.waitForDaemonSet(ctx, client, SignozReleaseName+"-otel-agent", 120); err != nil {
		return fmt.Errorf("otel-agent DaemonSet not ready: %w", err)
	}

	// Wait for Deployment to be ready
	if err := WaitForDeployment(ctx, client, SignozK8sInfraNamespace, SignozReleaseName+"-otel-deployment", 120*time.Second); err != nil {
		return fmt.Errorf("otel-deployment not ready: %w", err)
	}

	return nil
}

// waitForDaemonSet waits for a DaemonSet to be ready
func (s *SignozK8sInfraInstaller) waitForDaemonSet(ctx context.Context, client *kubernetes.Clientset, name string, timeoutSeconds int) error {
	deadline := time.Now().Add(time.Duration(timeoutSeconds) * time.Second)

	for time.Now().Before(deadline) {
		ds, err := client.AppsV1().DaemonSets(SignozK8sInfraNamespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				time.Sleep(2 * time.Second)
				continue
			}
			return fmt.Errorf("failed to get DaemonSet: %w", err)
		}

		// Check if all desired pods are ready
		if ds.Status.NumberReady == ds.Status.DesiredNumberScheduled && ds.Status.DesiredNumberScheduled > 0 {
			return nil
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("timeout waiting for DaemonSet %s/%s to be ready", SignozK8sInfraNamespace, name)
}
