#!/bin/bash

# Currency Converter Test Runner
# Comprehensive testing script for unit, integration, and Docker tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    npm test -- --testPathIgnorePatterns=integration
    print_success "Unit tests completed"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    npm run test:integration
    print_success "Integration tests completed"
}

# Function to run all tests with coverage
run_coverage_tests() {
    print_status "Running all tests with coverage..."
    npm run test:coverage
    print_success "Coverage tests completed"
}

# Function to run type checking
run_type_check() {
    print_status "Running TypeScript type checking..."
    npm run type-check
    print_success "Type checking completed"
}

# Function to run linting
run_lint() {
    print_status "Running ESLint..."
    npm run lint
    print_success "Linting completed"
}

# Function to build the application
build_app() {
    print_status "Building application..."
    npm run build
    print_success "Application build completed"
}

# Function to test Docker build
test_docker_build() {
    if ! command_exists docker; then
        print_warning "Docker not found, skipping Docker tests"
        return 0
    fi
    
    print_status "Testing Docker build..."
    docker build -t currency-converter-test .
    print_success "Docker build test completed"
    
    print_status "Cleaning up Docker test image..."
    docker rmi currency-converter-test
    print_success "Docker cleanup completed"
}

# Function to run Docker Compose tests
test_docker_compose() {
    if ! command_exists docker-compose; then
        print_warning "Docker Compose not found, skipping Docker Compose tests"
        return 0
    fi
    
    print_status "Testing Docker Compose configuration..."
    docker-compose config
    print_success "Docker Compose configuration is valid"
}

# Function to run API health checks
test_api_health() {
    if ! command_exists curl; then
        print_warning "curl not found, skipping API health tests"
        return 0
    fi
    
    print_status "Starting development server for health check..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    sleep 10
    
    print_status "Testing API endpoints..."
    
    # Test rates endpoint
    if curl -f -s "http://localhost:3000/api/rates" > /dev/null; then
        print_success "Rates API endpoint is healthy"
    else
        print_error "Rates API endpoint failed"
        kill $DEV_PID
        exit 1
    fi
    
    # Test convert endpoint
    if curl -f -s "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100" > /dev/null; then
        print_success "Convert API endpoint is healthy"
    else
        print_error "Convert API endpoint failed"
        kill $DEV_PID
        exit 1
    fi
    
    # Stop development server
    kill $DEV_PID
    print_success "API health checks completed"
}

# Main function
main() {
    print_status "Starting Currency Converter Test Suite"
    echo "========================================"
    
    case "${1:-all}" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "coverage")
            run_coverage_tests
            ;;
        "lint")
            run_lint
            ;;
        "type-check")
            run_type_check
            ;;
        "build")
            build_app
            ;;
        "docker")
            test_docker_build
            test_docker_compose
            ;;
        "api")
            test_api_health
            ;;
        "ci")
            print_status "Running CI test suite..."
            run_type_check
            run_lint
            run_unit_tests
            run_integration_tests
            build_app
            test_docker_build
            print_success "CI test suite completed"
            ;;
        "all")
            print_status "Running complete test suite..."
            run_type_check
            run_lint
            run_unit_tests
            run_integration_tests
            run_coverage_tests
            build_app
            test_docker_build
            test_docker_compose
            print_success "Complete test suite completed"
            ;;
        *)
            echo "Usage: $0 {unit|integration|coverage|lint|type-check|build|docker|api|ci|all}"
            echo ""
            echo "Options:"
            echo "  unit        - Run unit tests only"
            echo "  integration - Run integration tests only"
            echo "  coverage    - Run all tests with coverage"
            echo "  lint        - Run ESLint"
            echo "  type-check  - Run TypeScript type checking"
            echo "  build       - Build the application"
            echo "  docker      - Test Docker build and compose"
            echo "  api         - Test API health checks"
            echo "  ci          - Run CI test suite (no coverage, no API tests)"
            echo "  all         - Run complete test suite (default)"
            exit 1
            ;;
    esac
    
    echo "========================================"
    print_success "Test suite completed successfully!"
}

# Run main function with all arguments
main "$@" 