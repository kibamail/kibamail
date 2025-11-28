package installer

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/kibamail/infra/control-plane/cli/internal/ui"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Component represents an installable component
type Component interface {
	Name() string
	Version() string
	Install(ctx context.Context, client *kubernetes.Clientset, kubeconfig string) error
	IsInstalled(ctx context.Context, client *kubernetes.Clientset) (bool, error)
}

// HelmInstaller provides common Helm installation functionality
type HelmInstaller struct {
	Kubeconfig  string
	Namespace   string
	RepoName    string
	RepoURL     string
	ChartName   string
	Version     string
	Values      map[string]interface{}
	ReuseValues bool // Set to true to use --reuse-values flag
	IsOCI       bool // Set to true for OCI registries (skips repo add step)
	Wait        bool // Set to true to wait for resources to be ready
}

// NewKubernetesClient creates a new Kubernetes client from the kubeconfig
func NewKubernetesClient(kubeconfig string) (*kubernetes.Clientset, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to build kubeconfig: %w", err)
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	return client, nil
}

// EnsureNamespace creates a namespace if it doesn't exist
func EnsureNamespace(ctx context.Context, client *kubernetes.Clientset, name string) error {
	_, err := client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err == nil {
		return nil // Namespace exists
	}

	if !errors.IsNotFound(err) {
		return fmt.Errorf("failed to check namespace: %w", err)
	}

	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}

	_, err = client.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	if err != nil && !errors.IsAlreadyExists(err) {
		return fmt.Errorf("failed to create namespace: %w", err)
	}

	return nil
}

// AddHelmRepo adds a Helm repository
func AddHelmRepo(repoName, repoURL string) error {
	settings := cli.New()

	repoFile := settings.RepositoryConfig

	// Ensure the repo file exists
	if _, err := os.Stat(repoFile); os.IsNotExist(err) {
		if err := os.MkdirAll(settings.RepositoryCache, 0755); err != nil {
			return err
		}
	}

	// Load existing repo file
	f, err := repo.LoadFile(repoFile)
	if err != nil {
		f = repo.NewFile()
	}

	// Check if repo already exists
	for _, r := range f.Repositories {
		if r.Name == repoName {
			return nil // Repo already exists
		}
	}

	// Add the repo
	entry := &repo.Entry{
		Name: repoName,
		URL:  repoURL,
	}

	r, err := repo.NewChartRepository(entry, getter.All(settings))
	if err != nil {
		return fmt.Errorf("failed to create chart repository: %w", err)
	}

	if _, err := r.DownloadIndexFile(); err != nil {
		return fmt.Errorf("failed to download index file: %w", err)
	}

	f.Update(entry)

	if err := f.WriteFile(repoFile, 0644); err != nil {
		return fmt.Errorf("failed to write repo file: %w", err)
	}

	return nil
}

// InstallHelmChart installs a Helm chart
func (h *HelmInstaller) InstallHelmChart(ctx context.Context) error {
	settings := cli.New()
	settings.KubeConfig = h.Kubeconfig

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(settings.RESTClientGetter(), h.Namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		// Silent logging
	}); err != nil {
		return fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	// Check if release already exists
	listAction := action.NewList(actionConfig)
	listAction.Filter = h.ChartName
	releases, err := listAction.Run()
	if err != nil {
		return fmt.Errorf("failed to list releases: %w", err)
	}

	for _, r := range releases {
		if r.Name == h.ChartName || r.Name == h.RepoName+"-"+h.ChartName {
			ui.PrintWarning(fmt.Sprintf("%s is already installed, skipping", h.ChartName))
			return nil
		}
	}

	// Add the repo
	if err := AddHelmRepo(h.RepoName, h.RepoURL); err != nil {
		return fmt.Errorf("failed to add helm repo: %w", err)
	}

	// Update repo
	settings = cli.New()
	settings.KubeConfig = h.Kubeconfig

	// Locate the chart
	chartPath, err := action.NewPull().ChartPathOptions.LocateChart(
		fmt.Sprintf("%s/%s", h.RepoName, h.ChartName),
		settings,
	)
	if err != nil {
		return fmt.Errorf("failed to locate chart: %w", err)
	}

	// Load the chart
	chart, err := loader.Load(chartPath)
	if err != nil {
		return fmt.Errorf("failed to load chart: %w", err)
	}

	// Install the chart
	installAction := action.NewInstall(actionConfig)
	installAction.Namespace = h.Namespace
	installAction.CreateNamespace = true
	installAction.ReleaseName = h.ChartName
	installAction.Version = h.Version
	installAction.Wait = true
	installAction.Timeout = 10 * time.Minute

	_, err = installAction.RunWithContext(ctx, chart, h.Values)
	if err != nil {
		return fmt.Errorf("failed to install chart: %w", err)
	}

	return nil
}

// UpgradeOrInstallHelmChart upgrades or installs a Helm chart using helm CLI (idempotent)
func (h *HelmInstaller) UpgradeOrInstallHelmChart(ctx context.Context, client *kubernetes.Clientset) error {
	// Ensure namespace exists
	if err := EnsureNamespace(ctx, client, h.Namespace); err != nil {
		return fmt.Errorf("failed to ensure namespace: %w", err)
	}

	// Determine chart reference based on registry type
	var chartRef string
	if h.IsOCI {
		// For OCI registries, use the full OCI URL directly
		chartRef = h.RepoURL
	} else {
		// For traditional registries, add repo and update
		if err := execHelmCommand(ctx, "repo", "add", h.RepoName, h.RepoURL); err != nil {
			// Ignore error if repo already exists
			if !strings.Contains(err.Error(), "already exists") {
				return fmt.Errorf("failed to add helm repo: %w", err)
			}
		}

		// Update helm repos
		if err := execHelmCommand(ctx, "repo", "update"); err != nil {
			return fmt.Errorf("failed to update helm repos: %w", err)
		}

		chartRef = fmt.Sprintf("%s/%s", h.RepoName, h.ChartName)
	}

	// Build helm upgrade command with values
	args := []string{
		"upgrade", "--install",
		h.ChartName,
		chartRef,
		"--version", h.Version,
		"--namespace", h.Namespace,
		"--create-namespace",
		"--kubeconfig", h.Kubeconfig,
	}

	// Add wait flag if enabled
	if h.Wait {
		args = append(args, "--wait", "--timeout", "10m")
	}

	// Add reuse-values flag if enabled
	if h.ReuseValues {
		args = append(args, "--reuse-values")
	}

	// Flatten and add values as --set flags
	var setValues []string
	flattenHelmValues("", h.Values, &setValues)
	for _, setValue := range setValues {
		args = append(args, "--set", setValue)
	}

	// Execute helm upgrade --install
	if err := execHelmCommand(ctx, args...); err != nil {
		return fmt.Errorf("failed to install chart: %w", err)
	}

	return nil
}

// formatHelmValue formats a value for helm --set flag and returns key=value string
func formatHelmValue(key string, value interface{}) string {
	switch v := value.(type) {
	case bool:
		return fmt.Sprintf("%s=%t", key, v)
	case string:
		return fmt.Sprintf("%s=%s", key, v)
	case int:
		return fmt.Sprintf("%s=%d", key, v)
	case int64:
		return fmt.Sprintf("%s=%d", key, v)
	case float64:
		return fmt.Sprintf("%s=%g", key, v)
	default:
		return fmt.Sprintf("%s=%v", key, v)
	}
}

// flattenHelmValues flattens nested map values into dot-notation key=value pairs
func flattenHelmValues(prefix string, values map[string]interface{}, result *[]string) {
	for key, value := range values {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "." + key
		}

		switch v := value.(type) {
		case map[string]interface{}:
			flattenHelmValues(fullKey, v, result)
		default:
			*result = append(*result, formatHelmValue(fullKey, v))
		}
	}
}

// execHelmCommand executes a helm command
func execHelmCommand(ctx context.Context, args ...string) error {
	cmd := exec.CommandContext(ctx, "helm", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(output)), err)
	}
	return nil
}

// WaitForDeployment waits for a deployment to be ready
func WaitForDeployment(ctx context.Context, client *kubernetes.Clientset, namespace, name string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		deployment, err := client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				time.Sleep(2 * time.Second)
				continue
			}
			return fmt.Errorf("failed to get deployment: %w", err)
		}

		if deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
			return nil
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("timeout waiting for deployment %s/%s", namespace, name)
}
