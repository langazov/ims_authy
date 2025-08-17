#!/bin/bash

# OAuth2 Server Helm Chart Installation Script

set -e

# Default values
NAMESPACE="oauth2-system"
RELEASE_NAME="oauth2-server"
VALUES_FILE=""
DRY_RUN=""
UPGRADE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: oauth2-system)"
    echo "  -r, --release RELEASE        Helm release name (default: oauth2-server)"
    echo "  -f, --values VALUES_FILE     Custom values file"
    echo "  -e, --environment ENV        Environment preset (development|production)"
    echo "  -u, --upgrade               Upgrade existing installation"
    echo "  --dry-run                   Perform a dry run"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Install with default values"
    echo "  $0 -e development                    # Install with development preset"
    echo "  $0 -e production -n prod             # Install production in 'prod' namespace"
    echo "  $0 -f custom-values.yaml             # Install with custom values"
    echo "  $0 -u -f values.yaml                 # Upgrade with custom values"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v helm &> /dev/null; then
        print_error "Helm is required but not installed. Please install Helm 3.8+"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is required but not installed."
        exit 1
    fi
    
    # Check Helm version
    HELM_VERSION=$(helm version --short --client | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')
    print_info "Found Helm $HELM_VERSION"
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_success "All dependencies satisfied"
}

create_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        print_success "Namespace created: $NAMESPACE"
    else
        print_info "Namespace already exists: $NAMESPACE"
    fi
}

install_chart() {
    local chart_dir="./oauth2-server"
    local cmd_args=()
    
    if [[ "$UPGRADE" == "true" ]]; then
        cmd_args+=("upgrade")
    else
        cmd_args+=("install")
    fi
    
    cmd_args+=("$RELEASE_NAME" "$chart_dir")
    cmd_args+=("--namespace" "$NAMESPACE")
    
    if [[ "$UPGRADE" != "true" ]]; then
        cmd_args+=("--create-namespace")
    fi
    
    if [[ -n "$VALUES_FILE" ]]; then
        cmd_args+=("--values" "$VALUES_FILE")
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        cmd_args+=("--dry-run")
    fi
    
    print_info "Running: helm ${cmd_args[*]}"
    helm "${cmd_args[@]}"
}

wait_for_deployment() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    print_info "Waiting for deployments to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s \
        deployment/"$RELEASE_NAME" \
        deployment/"$RELEASE_NAME-frontend" \
        -n "$NAMESPACE"
    
    if [[ $? -eq 0 ]]; then
        print_success "All deployments are ready!"
    else
        print_warning "Deployments may not be fully ready yet. Check with: kubectl get pods -n $NAMESPACE"
    fi
}

show_status() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    echo ""
    print_info "Deployment Status:"
    kubectl get all -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE"
    
    echo ""
    print_info "Getting access information..."
    helm get notes "$RELEASE_NAME" -n "$NAMESPACE"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -f|--values)
            VALUES_FILE="$2"
            shift 2
            ;;
        -e|--environment)
            case $2 in
                development)
                    VALUES_FILE="./oauth2-server/values-development.yaml"
                    ;;
                production)
                    VALUES_FILE="./oauth2-server/values-production.yaml"
                    ;;
                *)
                    print_error "Unknown environment: $2. Use 'development' or 'production'"
                    exit 1
                    ;;
            esac
            shift 2
            ;;
        -u|--upgrade)
            UPGRADE="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "OAuth2 Server Helm Chart Installer"
    echo "=================================="
    echo ""
    
    print_info "Configuration:"
    print_info "  Namespace: $NAMESPACE"
    print_info "  Release: $RELEASE_NAME"
    print_info "  Values File: ${VALUES_FILE:-default}"
    print_info "  Operation: $([ "$UPGRADE" == "true" ] && echo "upgrade" || echo "install")"
    print_info "  Dry Run: $([ "$DRY_RUN" == "true" ] && echo "yes" || echo "no")"
    echo ""
    
    check_dependencies
    
    if [[ ! -d "./oauth2-server" ]]; then
        print_error "Chart directory './oauth2-server' not found. Please run this script from the helm directory."
        exit 1
    fi
    
    # Lint the chart
    print_info "Linting Helm chart..."
    helm lint ./oauth2-server
    if [[ $? -ne 0 ]]; then
        print_error "Chart linting failed"
        exit 1
    fi
    print_success "Chart linting passed"
    
    # Create namespace if needed
    if [[ "$DRY_RUN" != "true" ]]; then
        create_namespace
    fi
    
    # Install/upgrade the chart
    if [[ "$UPGRADE" == "true" ]]; then
        print_info "Upgrading OAuth2 Server..."
    else
        print_info "Installing OAuth2 Server..."
    fi
    
    install_chart
    
    if [[ $? -eq 0 ]]; then
        if [[ "$UPGRADE" == "true" ]]; then
            print_success "OAuth2 Server upgraded successfully!"
        else
            print_success "OAuth2 Server installed successfully!"
        fi
    else
        print_error "Installation/upgrade failed"
        exit 1
    fi
    
    # Wait for deployments and show status
    wait_for_deployment
    show_status
    
    echo ""
    print_success "OAuth2 Server is ready to use! 🚀"
    echo ""
    print_info "Next steps:"
    echo "  1. Follow the access instructions above"
    echo "  2. Change default passwords and secrets"
    echo "  3. Configure social login providers (optional)"
    echo "  4. Set up monitoring and backups"
}

# Run main function
main "$@"