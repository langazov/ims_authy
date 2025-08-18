#!/bin/bash

set -e

NAMESPACE="ims-authy"
SERVICE_ACCOUNT="ims-authy-sa"
KUBECONFIG_FILE="ims-authy-kubeconfig.yaml"

echo "Generating kubeconfig for service account: $SERVICE_ACCOUNT"

# Get the current cluster name and server URL
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
SERVER_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

echo "Cluster: $CLUSTER_NAME"
echo "Server: $SERVER_URL"

# Create token for the service account
echo "Creating token for service account..."
TOKEN=$(kubectl create token $SERVICE_ACCOUNT -n $NAMESPACE --duration=8760h)

# Get cluster CA certificate
echo "Extracting cluster CA certificate..."
kubectl get secret -n $NAMESPACE -o jsonpath='{.items[?(@.type=="kubernetes.io/service-account-token")].data.ca\.crt}' | base64 -d > ca.crt

# Alternative method to get CA cert from current kubeconfig
if [ ! -s ca.crt ]; then
    echo "Getting CA cert from current kubeconfig..."
    kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > ca.crt
fi

# Encode CA certificate to base64 (remove line breaks)
CA_DATA=$(base64 -i ca.crt | tr -d '\n')

# Generate kubeconfig
echo "Generating kubeconfig file: $KUBECONFIG_FILE"
cat > $KUBECONFIG_FILE <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: $CA_DATA
    server: $SERVER_URL
  name: $CLUSTER_NAME
contexts:
- context:
    cluster: $CLUSTER_NAME
    namespace: $NAMESPACE
    user: $SERVICE_ACCOUNT
  name: ${SERVICE_ACCOUNT}@${CLUSTER_NAME}
current-context: ${SERVICE_ACCOUNT}@${CLUSTER_NAME}
users:
- name: $SERVICE_ACCOUNT
  user:
    token: $TOKEN
EOF

# Clean up temporary files
rm -f ca.crt



echo ""
echo "✅ Kubeconfig generated successfully: $KUBECONFIG_FILE"
echo ""
echo "To use this kubeconfig:"
echo "export KUBECONFIG=\$(pwd)/$KUBECONFIG_FILE"
echo "kubectl get pods"
echo ""
echo "Or test with:"
echo "kubectl --kubeconfig=$KUBECONFIG_FILE get pods -n $NAMESPACE"
echo "\n\n"
cat  $KUBECONFIG_FILE | base64 | tr -d '\n'  > $KUBECONFIG_FILE.b64

