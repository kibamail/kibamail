# Step by step process for setting up staging server

1. install canonical k8s:

```bash
sudo snap install k8s --classic --channel=1.35-classic/stable
```

2. bootstrap the cluster:

you will need to use a bootstrap config that enables/disables certain default features.

```bash
sudo k8s bootstrap --file bootstrap.yaml
```

if installing in vagrant, use --address to specify the external host address and not internal private address:

```bash
sudo k8s bootstrap --address 192.168.56.10
```

then install a cni. we will use cilium with gateway api support.

start by setting up gateway crds:

```bash
sudo k8s kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.2.0/config/crd/standard/gateway.networking.k8s.io_gatewayclasses.yaml
sudo k8s kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.2.0/config/crd/standard/gateway.networking.k8s.io_gateways.yaml
sudo k8s kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.2.0/config/crd/standard/gateway.networking.k8s.io_httproutes.yaml
sudo k8s kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.2.0/config/crd/standard/gateway.networking.k8s.io_referencegrants.yaml
sudo k8s kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.2.0/config/crd/standard/gateway.networking.k8s.io_grpcroutes.yaml
```

add cilium repo:

```bash
sudo k8s helm repo add cilium https://helm.cilium.io/
```

then install cilium:

```bash
sudo k8s helm upgrade cilium cilium/cilium --version 1.18.5 \
    --install \
    --namespace kube-system \
    --reuse-values \
    --set kubeProxyReplacement=true \
    --set gatewayAPI.enabled=true \
    --set gatewayAPI.hostNetwork.enabled=true
```

3. wait for the cluster to be ready:

```bash
sudo k8s status --wait-ready
```

4. enable local storage

```bash
sudo k8s enable local-storage
```

```
7?D42uHUwm978w
```

5. enable gateway

```bash
sudo k8s enable gateway
```

inspect gateway:

```bash
sudo k8s kubectl get GatewayClass
```

6. setup infisical secret for accessing environment variables

the client id and client secret must be for a machine identity with a role of viewer.

```bash
kubectl create secret generic infisical-auth \
    --namespace external-secrets \
    --from-literal=clientId=1d65afca-e9c0-4ad9-963a-2ecbcb18615a \
    --from-literal=clientSecret=f6a16bac433106533b5e5f07dc1e002e29e7cc19858eb6ee05374ff9432ff654
```

7. setup R2 object storage

create a bucket with the name as used in the kuztomize resources. create an api key granting object read & write permissions to that specific bucket.

Then add these values to infisical

8. prepare for longhorn:

first identify the disk to use:

in the below snippet its nvme1n1

```bash
# Wipe the existing partition table
wipefs -a /dev/nvme1n1

# Format the entire drive
mkfs.ext4 /dev/nvme1n1

# Create mount point
mkdir -p /mnt/longhorn

# Mount it
mount /dev/nvme1n1 /mnt/longhorn

# Get UUID and add to fstab
UUID=$(blkid -s UUID -o value /dev/nvme1n1)
echo "UUID=$UUID /mnt/longhorn ext4 defaults 0 2" >> /etc/fstab

# Verify
df -h | grep longhorn
```

install longhorn prerequisites:

```bash
apt update
apt install -y open-iscsi nfs-common
systemctl enable --now iscsid
```

install prerequisites:

```bash
# Update package lists
apt-get update

# Install open-iscsi (required)
apt-get install -y open-iscsi

# Enable and start iscsid
systemctl enable iscsid
systemctl start iscsid

# Load iscsi_tcp module
modprobe iscsi_tcp

# Install NFSv4 client (required for RWX volumes and backups)
apt-get install -y nfs-common

# Install cryptsetup (for volume encryption)
apt-get install -y cryptsetup

# Install device-mapper (for dm-crypt)
apt-get install -y dmsetup

# Verify required utilities are present (should already be on Ubuntu)
which bash curl findmnt grep awk blkid lsblk
```

verify prerequisites:

```bash
# Verify iscsid is running
systemctl status iscsid

# Verify iscsi_tcp module is loaded
lsmod | grep iscsi_tcp

# Check NFSv4 kernel support
cat /boot/config-$(uname -r) | grep CONFIG_NFS_V4

# Check Kubernetes version (must be >= 1.25)
kubectl version
```

install helm:

```bash
# Install Helm if not already installed
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add Longhorn Helm repo
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install Longhorn with single-replica config
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=1 \
  --set defaultSettings.defaultDataPath="/mnt/longhorn" \
  --version 1.10.1
```
