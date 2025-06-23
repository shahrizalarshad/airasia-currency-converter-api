#!/bin/bash

# Google Cloud Run Deployment Script for Currency Converter
# Usage: ./scripts/deploy-cloud-run.sh [docker-hub-username] [project-id] [api-key]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR: $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] SUCCESS: $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}[$timestamp] INFO: $message${NC}"
            ;;
        *)
            echo "[$timestamp] $message"
            ;;
    esac
}

# Get parameters
DOCKER_USERNAME=${1:-"shahrizalarshad"}
PROJECT_ID=${2:-"airasia-currency-converter"}
API_KEY=${3:-"745cf012b1244993b3337b89024bfb22"}
SERVICE_NAME="currency-converter"
REGION="asia-southeast1"

log_message "INFO" "🚀 Starting Google Cloud Run deployment for Currency Converter"
log_message "INFO" "Docker Hub username: $DOCKER_USERNAME"
log_message "INFO" "Google Cloud Project: $PROJECT_ID"
log_message "INFO" "Service name: $SERVICE_NAME"
log_message "INFO" "Region: $REGION"

# Check if Docker image exists
if ! docker image inspect currency-converter:latest >/dev/null 2>&1; then
    log_message "ERROR" "Docker image 'currency-converter:latest' not found. Please build it first with: make build"
    exit 1
fi

# Step 1: Tag and push to Docker Hub
log_message "INFO" "📦 Step 1: Tagging and pushing Docker image to Docker Hub..."

docker tag currency-converter:latest $DOCKER_USERNAME/currency-converter:latest
docker tag currency-converter:latest $DOCKER_USERNAME/currency-converter:v1.0.0

log_message "SUCCESS" "Images tagged successfully"

# Check if logged into Docker Hub
if ! docker info | grep -q "Username:"; then
    log_message "WARNING" "Not logged into Docker Hub. Please run: docker login"
    echo "Press Enter after logging in to Docker Hub..."
    read
fi

log_message "INFO" "Pushing images to Docker Hub..."
if docker push $DOCKER_USERNAME/currency-converter:latest && docker push $DOCKER_USERNAME/currency-converter:v1.0.0; then
    log_message "SUCCESS" "Images pushed to Docker Hub successfully"
else
    log_message "ERROR" "Failed to push images to Docker Hub"
    exit 1
fi

# Step 2: Check Google Cloud CLI
log_message "INFO" "☁️  Step 2: Checking Google Cloud CLI setup..."

if ! command -v gcloud &> /dev/null; then
    log_message "ERROR" "Google Cloud CLI not found. Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    log_message "WARNING" "Not authenticated with Google Cloud. Please run: gcloud auth login"
    echo "Press Enter after authenticating with Google Cloud..."
    read
fi

# Set project
log_message "INFO" "Setting Google Cloud project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Step 3: Deploy to Cloud Run
log_message "INFO" "🌟 Step 3: Deploying to Google Cloud Run..."

DEPLOY_CMD="gcloud run deploy $SERVICE_NAME \
  --image $DOCKER_USERNAME/currency-converter:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,OPEN_EXCHANGE_RATES_API_KEY=$API_KEY"

log_message "INFO" "Running deployment command..."
echo "Command: $DEPLOY_CMD"
echo ""

if eval $DEPLOY_CMD; then
    log_message "SUCCESS" "🎉 Deployment successful!"
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    
    log_message "SUCCESS" "🌐 Service URL: $SERVICE_URL"
    log_message "INFO" "Testing endpoints..."
    
    # Test the deployed service
    echo ""
    echo "🧪 Testing deployed service:"
    echo "============================"
    
    # Test rates endpoint
    if curl -s "$SERVICE_URL/api/rates" | grep -q "success"; then
        log_message "SUCCESS" "✅ Rates endpoint working: $SERVICE_URL/api/rates"
    else
        log_message "ERROR" "❌ Rates endpoint failed"
    fi
    
    # Test conversion endpoint
    if curl -s "$SERVICE_URL/api/convert?from=USD&to=EUR&amount=100" | grep -q "convertedAmount"; then
        log_message "SUCCESS" "✅ Convert endpoint working: $SERVICE_URL/api/convert"
    else
        log_message "ERROR" "❌ Convert endpoint failed"
    fi
    
    echo ""
    log_message "SUCCESS" "🎊 Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "======================"
    echo "🌐 Service URL: $SERVICE_URL"
    echo "📊 Rates API: $SERVICE_URL/api/rates"
    echo "💱 Convert API: $SERVICE_URL/api/convert?from=USD&to=EUR&amount=100"
    echo "🖥️  Admin Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
    echo ""
    echo "🔧 Management Commands:"
    echo "======================="
    echo "View logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
    echo "Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
    echo "Delete service: gcloud run services delete $SERVICE_NAME --region=$REGION"
    
else
    log_message "ERROR" "❌ Deployment failed"
    exit 1
fi 