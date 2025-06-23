#!/bin/bash

# Backup script for Currency Converter production deployment
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/currency-converter}"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="${APP_DIR:-/opt/currency-converter}"

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

create_backup_directory() {
    if ! mkdir -p "$BACKUP_DIR"; then
        log_message "ERROR" "Failed to create backup directory: $BACKUP_DIR"
        exit 1
    fi
    log_message "SUCCESS" "Backup directory created: $BACKUP_DIR"
}

backup_configuration() {
    log_message "INFO" "Backing up configuration files..."
    
    local config_files=(
        "$APP_DIR/docker-compose.prod.yml"
        "$APP_DIR/.env.prod"
        "$APP_DIR/nginx.conf"
        "$APP_DIR/docker-compose.yml"
        "$(pwd)/Dockerfile"
        "$(pwd)/Dockerfile.dev"
        "$(pwd)/package.json"
        "$(pwd)/package-lock.json"
    )
    
    local existing_files=()
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            existing_files+=("$file")
        fi
    done
    
    if [ ${#existing_files[@]} -eq 0 ]; then
        log_message "WARNING" "No configuration files found to backup"
        return 1
    fi
    
    if tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" "${existing_files[@]}" 2>/dev/null; then
        log_message "SUCCESS" "Configuration files backed up to config_$DATE.tar.gz"
        return 0
    else
        log_message "ERROR" "Failed to backup configuration files"
        return 1
    fi
}

backup_docker_image() {
    log_message "INFO" "Backing up Docker image..."
    
    local image_name="currency-converter:latest"
    
    # Check if image exists
    if ! docker image inspect "$image_name" >/dev/null 2>&1; then
        log_message "WARNING" "Docker image $image_name not found, skipping image backup"
        return 1
    fi
    
    # Export Docker image
    if docker save "$image_name" | gzip > "$BACKUP_DIR/image_$DATE.tar.gz"; then
        local image_size=$(du -h "$BACKUP_DIR/image_$DATE.tar.gz" | cut -f1)
        log_message "SUCCESS" "Docker image backed up to image_$DATE.tar.gz ($image_size)"
        return 0
    else
        log_message "ERROR" "Failed to backup Docker image"
        return 1
    fi
}

backup_application_data() {
    log_message "INFO" "Backing up application data..."
    
    # Backup logs if they exist
    local log_files=(
        "/var/log/currency-converter*.log"
        "$APP_DIR/logs/*.log"
    )
    
    local existing_logs=()
    for pattern in "${log_files[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                existing_logs+=("$file")
            fi
        done
    done
    
    if [ ${#existing_logs[@]} -gt 0 ]; then
        if tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" "${existing_logs[@]}" 2>/dev/null; then
            log_message "SUCCESS" "Application logs backed up to logs_$DATE.tar.gz"
        else
            log_message "WARNING" "Failed to backup application logs"
        fi
    else
        log_message "INFO" "No application logs found to backup"
    fi
}

backup_database() {
    # This function can be extended if you add a database to your application
    log_message "INFO" "No database configured, skipping database backup"
}

create_backup_manifest() {
    log_message "INFO" "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/manifest_$DATE.txt"
    
    cat > "$manifest_file" << EOF
Currency Converter Backup Manifest
==================================
Backup Date: $(date)
Backup Directory: $BACKUP_DIR
Application Directory: $APP_DIR

Files in this backup:
EOF
    
    ls -la "$BACKUP_DIR"/*_$DATE.* >> "$manifest_file" 2>/dev/null
    
    # Add system information
    cat >> "$manifest_file" << EOF

System Information:
==================
Hostname: $(hostname)
OS: $(uname -a)
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "Not installed")

Container Status:
================
EOF
    
    docker ps --filter "name=currency-converter" >> "$manifest_file" 2>/dev/null
    
    log_message "SUCCESS" "Backup manifest created: manifest_$DATE.txt"
}

cleanup_old_backups() {
    log_message "INFO" "Cleaning up old backups (keeping last 7 days)..."
    
    local deleted_count=0
    
    # Find and delete files older than 7 days
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -print0 2>/dev/null)
    
    # Clean up old manifest files
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "manifest_*.txt" -mtime +7 -print0 2>/dev/null)
    
    if [ $deleted_count -gt 0 ]; then
        log_message "SUCCESS" "Cleaned up $deleted_count old backup files"
    else
        log_message "INFO" "No old backup files to clean up"
    fi
}

verify_backup() {
    log_message "INFO" "Verifying backup integrity..."
    
    local backup_files=(
        "$BACKUP_DIR/config_$DATE.tar.gz"
        "$BACKUP_DIR/image_$DATE.tar.gz"
        "$BACKUP_DIR/logs_$DATE.tar.gz"
    )
    
    local verified_count=0
    local total_size=0
    
    for file in "${backup_files[@]}"; do
        if [ -f "$file" ]; then
            if tar -tzf "$file" >/dev/null 2>&1; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
                total_size=$((total_size + size))
                ((verified_count++))
                log_message "SUCCESS" "Verified: $(basename "$file")"
            else
                log_message "ERROR" "Corrupted backup file: $(basename "$file")"
            fi
        fi
    done
    
    local total_size_mb=$((total_size / 1024 / 1024))
    log_message "INFO" "Backup verification complete: $verified_count files verified, total size: ${total_size_mb}MB"
}

main() {
    log_message "INFO" "Starting Currency Converter backup process..."
    
    # Create backup directory
    create_backup_directory
    
    # Perform backups
    backup_configuration
    backup_docker_image
    backup_application_data
    backup_database
    
    # Create manifest
    create_backup_manifest
    
    # Verify backup integrity
    verify_backup
    
    # Cleanup old backups
    cleanup_old_backups
    
    log_message "SUCCESS" "Backup process completed successfully!"
    log_message "INFO" "Backup location: $BACKUP_DIR"
    
    # Display backup summary
    echo
    echo "Backup Summary:"
    echo "==============="
    ls -lh "$BACKUP_DIR"/*_$DATE.*
}

# Check if running as root for system directories
if [ "$EUID" -ne 0 ] && [ ! -w "$(dirname "$BACKUP_DIR")" ]; then
    log_message "WARNING" "Running without root privileges, some backups may fail"
    log_message "INFO" "Consider running with sudo for full system backup"
fi

# Run main function
main 