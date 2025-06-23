#!/bin/bash

# Health monitoring script for production deployment
CONTAINER_NAME="currency-converter-prod"
HEALTH_URL="http://localhost:3000/api/rates"
LOG_FILE="/var/log/currency-converter-health.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    return 0
}

check_http_health() {
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    
    if [ "$response_code" != "200" ]; then
        log_message "ERROR" "Health check failed for $HEALTH_URL (HTTP $response_code)"
        return 1
    fi
    return 0
}

check_api_functionality() {
    local convert_url="http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"
    local response=$(curl -s $convert_url)
    
    if ! echo "$response" | grep -q "converted_amount"; then
        log_message "ERROR" "API functionality check failed"
        return 1
    fi
    return 0
}

restart_container() {
    log_message "WARNING" "Attempting to restart unhealthy container..."
    
    if docker restart $CONTAINER_NAME; then
        log_message "SUCCESS" "Container restarted successfully"
        sleep 30 # Wait for container to fully start
        return 0
    else
        log_message "ERROR" "Failed to restart container"
        return 1
    fi
}

send_alert() {
    local message=$1
    
    # Add your alerting mechanism here
    # Examples:
    # - Send email
    # - Post to Slack
    # - Send SMS
    # - Write to monitoring system
    
    log_message "ERROR" "ALERT: $message"
    
    # Example: Send to webhook (uncomment and configure)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"Currency Converter Alert: $message\"}" \
    #     YOUR_WEBHOOK_URL
}

main() {
    log_message "INFO" "Starting health check..."
    
    # Check container status
    if ! check_container_status; then
        send_alert "Container is not running"
        exit 1
    fi
    
    # Check HTTP health
    if ! check_http_health; then
        # Try to restart container
        if restart_container; then
            # Check again after restart
            sleep 10
            if check_http_health; then
                log_message "SUCCESS" "Health restored after container restart"
            else
                send_alert "Container still unhealthy after restart"
                exit 1
            fi
        else
            send_alert "Failed to restart unhealthy container"
            exit 1
        fi
    fi
    
    # Check API functionality
    if ! check_api_functionality; then
        send_alert "API functionality check failed"
        exit 1
    fi
    
    log_message "SUCCESS" "All health checks passed"
    
    # Optional: Log resource usage
    local memory_usage=$(docker stats --no-stream --format "table {{.MemUsage}}" $CONTAINER_NAME | tail -n 1)
    local cpu_usage=$(docker stats --no-stream --format "table {{.CPUPerc}}" $CONTAINER_NAME | tail -n 1)
    
    log_message "INFO" "Resource usage - Memory: $memory_usage, CPU: $cpu_usage"
}

# Create log directory if it doesn't exist
sudo mkdir -p $(dirname $LOG_FILE)
sudo touch $LOG_FILE
sudo chmod 666 $LOG_FILE

# Run main function
main 