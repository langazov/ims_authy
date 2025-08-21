#!/bin/bash

set -e

NAMESPACE="ims-authy"
SERVICE_ACCOUNT="ims-authy-sa"

echo "Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "Creating service account: $SERVICE_ACCOUNT"
kubectl create serviceaccount $SERVICE_ACCOUNT -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "Creating role with namespace-scoped permissions"
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: $NAMESPACE
  name: ims-authy-role
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
EOF

echo "Creating role binding"
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ims-authy-binding
  namespace: $NAMESPACE
subjects:
- kind: ServiceAccount
  name: $SERVICE_ACCOUNT
  namespace: $NAMESPACE
roleRef:
  kind: Role
  name: ims-authy-role
  apiGroup: rbac.authorization.k8s.io
EOF

echo "Setup completed successfully!"
echo "Namespace: $NAMESPACE"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""
echo "To get the service account token:"
echo "kubectl create token $SERVICE_ACCOUNT -n $NAMESPACE"