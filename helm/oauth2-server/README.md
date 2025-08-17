# OAuth2 Server Helm Chart

A Helm chart for deploying a complete OAuth2 + OpenID Connect server with PKCE support, social login integration, and administrative interface to Kubernetes.

## Features

- 🔐 **OAuth2 + OpenID Connect** server with PKCE support
- 🌐 **Social Login** integration (Google, GitHub, Facebook, Apple)
- 👥 **User Management** with roles and permissions
- 🏢 **Group Management** with scope inheritance
- 📱 **OAuth Client Management** with secret regeneration
- 🔧 **Scope Management** with categorization
- 🎨 **Modern React Frontend** with responsive UI
- 🗄️ **MongoDB** database with optional external configuration
- 🚀 **Kubernetes-native** deployment with best practices

## Prerequisites

- Kubernetes 1.20+
- Helm 3.8+
- StorageClass for persistent volumes (if persistence is enabled)

## Installation

### Add the Helm repository (if available)
```bash
helm repo add oauth2-server https://your-helm-repo.com/
helm repo update
```

### Install from local chart
```bash
# Clone the repository
git clone https://github.com/your-org/oauth2-server.git
cd oauth2-server/helm/oauth2-server

# Install the chart
helm install oauth2-server . -n oauth2-system --create-namespace
```

### Install with custom values
```bash
helm install oauth2-server . -n oauth2-system --create-namespace -f values-production.yaml
```

## Configuration

### Basic Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of server replicas | `1` |
| `frontendReplicaCount` | Number of frontend replicas | `1` |
| `image.repository` | Server image repository | `oauth2-server` |
| `image.tag` | Server image tag | `latest` |
| `frontend.image.repository` | Frontend image repository | `oauth2-frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `8080` |
| `frontend.service.type` | Frontend service type | `ClusterIP` |
| `frontend.service.port` | Frontend service port | `80` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.hosts` | Ingress hosts | `[oauth2.example.com]` |
| `frontend.ingress.enabled` | Enable frontend ingress | `false` |
| `frontend.ingress.hosts` | Frontend ingress hosts | `[auth.example.com]` |

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.port` | Server port | `8080` |
| `config.jwtSecret` | JWT signing secret | `your-super-secret-jwt-key-change-this-in-production` |
| `config.database.name` | Database name | `oauth2_server` |
| `config.oauth2.clientId` | Default OAuth2 client ID | `frontend-client` |
| `config.oauth2.clientSecret` | Default OAuth2 client secret | `oauth2-secret` |

### Social Login Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.socialLogin.google.clientId` | Google OAuth client ID | `""` |
| `config.socialLogin.google.clientSecret` | Google OAuth client secret | `""` |
| `config.socialLogin.github.clientId` | GitHub OAuth client ID | `""` |
| `config.socialLogin.github.clientSecret` | GitHub OAuth client secret | `""` |
| `config.socialLogin.facebook.clientId` | Facebook OAuth client ID | `""` |
| `config.socialLogin.facebook.clientSecret` | Facebook OAuth client secret | `""` |
| `config.socialLogin.apple.clientId` | Apple OAuth client ID | `""` |
| `config.socialLogin.apple.clientSecret` | Apple OAuth client secret | `""` |

### MongoDB Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mongodb.enabled` | Deploy MongoDB with the chart | `true` |
| `mongodb.auth.rootUsername` | MongoDB root username | `admin` |
| `mongodb.auth.rootPassword` | MongoDB root password | `password123` |
| `mongodb.auth.database` | MongoDB database name | `oauth2_server` |
| `mongodb.persistence.enabled` | Enable MongoDB persistence | `true` |
| `mongodb.persistence.size` | MongoDB storage size | `10Gi` |

### External MongoDB Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalMongodb.host` | External MongoDB host | `localhost` |
| `externalMongodb.port` | External MongoDB port | `27017` |
| `externalMongodb.database` | External MongoDB database | `oauth2_server` |
| `externalMongodb.auth.enabled` | Enable authentication | `true` |
| `externalMongodb.auth.username` | MongoDB username | `admin` |
| `externalMongodb.auth.password` | MongoDB password | `password123` |

## Examples

### Production Deployment with Ingress and TLS

```yaml
# values-production.yaml
replicaCount: 3
frontendReplicaCount: 2

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: oauth2.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: oauth2-server-tls
      hosts:
        - oauth2.company.com

frontend:
  ingress:
    enabled: true
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
    hosts:
      - host: auth.company.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: oauth2-frontend-tls
        hosts:
          - auth.company.com

config:
  jwtSecret: "production-jwt-secret-change-this"
  oauth2:
    clientSecret: "production-oauth2-secret-change-this"
    redirectUrl: "https://auth.company.com/callback"
    authServerUrl: "https://oauth2.company.com/oauth/authorize"
    tokenServerUrl: "https://oauth2.company.com/oauth/token"
  socialLogin:
    google:
      clientId: "your-google-client-id"
      clientSecret: "your-google-client-secret"
      redirectUrl: "https://oauth2.company.com/auth/google/callback"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi

mongodb:
  persistence:
    size: 50Gi
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 200m
      memory: 256Mi
```

### External MongoDB Configuration

```yaml
# values-external-mongodb.yaml
mongodb:
  enabled: false

externalMongodb:
  host: "mongodb.company.com"
  port: 27017
  database: "oauth2_production"
  auth:
    enabled: true
    username: "oauth2_user"
    password: "secure-mongodb-password"
    authSource: "admin"
```

### High Availability Setup

```yaml
# values-ha.yaml
replicaCount: 3
frontendReplicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 15
  targetCPUUtilizationPercentage: 60

podDisruptionBudget:
  enabled: true
  minAvailable: 2

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - oauth2-server
        topologyKey: kubernetes.io/hostname

mongodb:
  replicaSet:
    enabled: true
    replicas:
      secondary: 2
  persistence:
    size: 100Gi
```

## Security Considerations

1. **Change Default Secrets**: Always change the default JWT secret and OAuth2 client secret in production
2. **Use External Secrets**: Consider using external secret management systems like HashiCorp Vault or AWS Secrets Manager
3. **Enable TLS**: Always use HTTPS/TLS in production environments
4. **Network Policies**: Enable network policies to restrict pod-to-pod communication
5. **Resource Limits**: Set appropriate resource limits and requests
6. **Security Context**: The chart runs containers as non-root users with read-only root filesystem

## Monitoring

Enable Prometheus monitoring by setting:

```yaml
serviceMonitor:
  enabled: true
  labels:
    release: prometheus
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n oauth2-system
kubectl describe pod <pod-name> -n oauth2-system
```

### Check Logs
```bash
kubectl logs -f deployment/oauth2-server -n oauth2-system
kubectl logs -f deployment/oauth2-server-frontend -n oauth2-system
```

### Check MongoDB Connection
```bash
kubectl exec -it deployment/oauth2-server -n oauth2-system -- env | grep MONGO
```

### Check Service Discovery
```bash
kubectl get svc -n oauth2-system
kubectl get endpoints -n oauth2-system
```

## Upgrading

```bash
helm upgrade oauth2-server . -n oauth2-system -f values.yaml
```

## Uninstalling

```bash
helm uninstall oauth2-server -n oauth2-system
```

To completely remove all data:
```bash
kubectl delete pvc -l app.kubernetes.io/instance=oauth2-server -n oauth2-system
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `helm lint` and `helm template`
5. Submit a pull request

## License

This Helm chart is licensed under the MIT License.