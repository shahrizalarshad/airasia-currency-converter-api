#!/bin/bash

# Simple health monitoring script for demonstration
CONTAINER_NAME="${CONTAINER_NAME:-currency-converter-local}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3002/api/rates}"
LOG_FILE="${LOG_FILE:-./health-check.log}"

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
            echo "[$timestamp] ERROR: $message" >> $LOG_FILE
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] SUCCESS: $message${NC}"
            echo "[$timestamp] SUCCESS: $message" >> $LOG_FILE
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}"
            echo "[$timestamp] WARNING: $message" >> $LOG_FILE
            ;;
        "INFO")
            echo -e "${BLUE}[$timestamp] INFO: $message${NC}"
            echo "[$timestamp] INFO: $message" >> $LOG_FILE
            ;;
        *)
            echo "[$timestamp] $message"
            echo "[$timestamp] $message" >> $LOG_FILE
            ;;
    esac
}

check_container_status() {
    if ! docker ps | grep -q $CONTAINER_NAME; then
        log_message "ERROR" "Container $CONTAINER_NAME is not running"
        return 1
    fi
    log_message "SUCCESS" "Container $CONTAINER_NAME is running"
    return 0
}

check_http_health() {
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    
    if [ "$response_code" != "200" ]; then
        log_message "ERROR" "Health check failed for $HEALTH_URL (HTTP $response_code)"
        return 1
    fi
    log_message "SUCCESS" "HTTP health check passed (HTTP $response_code)"
    return 0
}

check_api_functionality() {
    local convert_url="http://localhost:3002/api/convert?from=USD&to=EUR&amount=100"
    local response=$(curl -s $convert_url)
    
    if ! echo "$response" | grep -q "convertedAmount"; then
        log_message "ERROR" "API functionality check failed"
        return 1
    fi
    log_message "SUCCESS" "API functionality check passed"
    return 0
}

get_resource_usage() {
    local memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" $CONTAINER_NAME 2>/dev/null)
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_NAME 2>/dev/null)
    
    if [ -n "$memory_usage" ] && [ -n "$cpu_usage" ]; then
        log_message "INFO" "Resource usage - Memory: $memory_usage, CPU: $cpu_usage"
    else
        log_message "WARNING" "Could not retrieve resource usage"
    fi
}

main() {
    log_message "INFO" "Starting health check for $CONTAINER_NAME..."
    
    local health_status=0
    
    # Check container status
    if ! check_container_status; then
        health_status=1
    fi
    
    # Check HTTP health
    if ! check_http_health; then
        health_status=1
    fi
    
    # Check API functionality
    if ! check_api_functionality; then
        health_status=1
    fi
    
    # Get resource usage
    get_resource_usage
    
    if [ $health_status -eq 0 ]; then
        log_message "SUCCESS" "All health checks passed ✅"
    else
        log_message "ERROR" "Some health checks failed ❌"
    fi
    
    return $health_status
}

# Run main function
main 