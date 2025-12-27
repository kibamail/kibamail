# kbctl - Kibamail Infrastructure CLI

A CLI tool for managing Kibamail's Kubernetes infrastructure. It creates local Kind clusters and installs all required operators and components for the control plane.

## Prerequisites

- Go 1.23+
- Docker (for Kind clusters)
- kubectl
- kind
- helm v3.x

## Building

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Install to GOPATH
make install
```

The binary is created at `./bin/kbctl`.

## Commands

### Version

Display version and bundled component information:

```bash
kbctl version
```

**Bundled Components:**
| Component | Version |
|-----------|---------|
| Cilium | 1.18.4 |
| cert-manager | v1.19.1 |
| CloudNativePG | 0.26.1 |
| Barman Cloud Plugin | v0.9.0 |
| RabbitMQ Operator | v2.17.2 |
| Valkey Operator | v0.0.61 |
| External Secrets | 0.12.1 |
| Gateway API | v1.2.0 |

### Cluster Management

#### Create a local cluster

Creates a Kind cluster named `kibamail-local` with 1 control plane and 2 worker nodes:

```bash
kbctl cluster create
```

The cluster is configured with:
- CNI disabled (Cilium will be installed)
- Port mappings for Gateway API (80, 443)
- Pod subnet: `10.244.0.0/16`
- Service subnet: `10.96.0.0/12`

#### Check cluster status

```bash
kbctl cluster status
```

Shows node status and installation state of all infrastructure components.

#### Delete the cluster

```bash
kbctl cluster delete
```

### Install Infrastructure Components

Installs all required Kubernetes operators:

```bash
kbctl install
```

**Components installed:**
1. **Cilium** - CNI with Gateway API support
2. **cert-manager** - Certificate management
3. **CloudNativePG** - PostgreSQL operator
4. **Barman Cloud Plugin** - PostgreSQL backups to S3/R2
5. **RabbitMQ Operator** - Message queuing
6. **Valkey Operator** - In-memory data store
7. **External Secrets** - Secrets management with Infisical

#### Skip specific components

```bash
kbctl install --skip-cilium --skip-valkey
```

Available skip flags:
- `--skip-cilium`
- `--skip-cert-manager`
- `--skip-cloudnativepg`
- `--skip-barman-cloud`
- `--skip-rabbitmq`
- `--skip-valkey`
- `--skip-external-secrets`

#### Dry run

Preview what would be installed without actually installing:

```bash
kbctl install --dry-run
```

## Global Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--kubeconfig` | `~/.kube/config` | Path to kubeconfig file |

## Quick Start

```bash
# 1. Build the CLI
make build

# 2. Create a local Kind cluster
./bin/kbctl cluster create

# 3. Set kubeconfig
export KUBECONFIG="${HOME}/.kube/kind-config-kibamail-local"

# 4. Install all infrastructure components
./bin/kbctl install

# 5. Verify installation
./bin/kbctl cluster status
```

## Notes

- All install operations are **idempotent** - safe to run multiple times
- The CLI handles Ctrl+C gracefully during installations
- Component installation checks for existing deployments before installing
