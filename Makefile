.PHONY: help build test deploy-local deploy-staging deploy-production push rollback logs health-check clean backup

# Default target
help:
	@echo "Currency Converter Deployment Commands"
	@echo "======================================"
	@echo "build                 - Build Docker image"
	@echo "test                  - Run all tests"
	@echo "deploy-local          - Deploy locally for testing"
	@echo "deploy-staging        - Deploy to staging environment"
	@echo "deploy-production     - Deploy to production"
	@echo "push                  - Push image to Docker Hub"
	@echo "rollback              - Rollback to previous version"
	@echo "logs                  - View production logs"
	@echo "health-check          - Check application health"
	@echo "clean                 - Clean up containers and images"
	@echo "backup                - Backup configuration and image"

# Build Docker image
build:
	@echo "Building Docker image..."
	docker build -t currency-converter:latest .
	@echo "Build completed successfully!"

# Run tests
test:
	@echo "Running tests..."
	chmod +x scripts/test-runner.sh
	./scripts/test-runner.sh all

# Deploy locally for testing
deploy-local:
	@echo "Deploying locally..."
	docker build -t currency-converter:latest .
	docker stop currency-converter-local || true
	docker rm currency-converter-local || true
	docker run -d \
		--name currency-converter-local \
		-p 3000:3000 \
		--env-file .env.local \
		--restart unless-stopped \
		currency-converter:latest
	@echo "Local deployment completed! Visit http://localhost:3000"

# Deploy to staging
deploy-staging:
	@echo "Deploying to staging..."
	docker-compose -f docker-compose.staging.yml down || true
	docker-compose -f docker-compose.staging.yml pull
	docker-compose -f docker-compose.staging.yml up -d
	@echo "Staging deployment completed!"

# Deploy to production
deploy-production:
	@echo "Deploying to production..."
	@echo "WARNING: This will deploy to production. Continue? (y/N)"
	@read confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose -f docker-compose.prod.yml pull
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production deployment completed!"

# Push image to Docker Hub
push:
	@echo "Pushing to Docker Hub..."
	@read -p "Enter Docker Hub username: " username; \
	docker tag currency-converter:latest $$username/currency-converter:latest; \
	docker tag currency-converter:latest $$username/currency-converter:v1.0.0; \
	docker push $$username/currency-converter:latest; \
	docker push $$username/currency-converter:v1.0.0
	@echo "Push completed!"

# Rollback deployment
rollback:
	@echo "Rolling back deployment..."
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Rollback completed!"

# View logs
logs:
	@echo "Viewing production logs..."
	docker-compose -f docker-compose.prod.yml logs -f

# Health check
health-check:
	@echo "Performing health check..."
	@curl -f http://localhost:3000/api/rates > /dev/null 2>&1 && \
		echo "✅ Health check passed!" || \
		echo "❌ Health check failed!"

# Clean up
clean:
	@echo "Cleaning up containers and images..."
	docker stop currency-converter-local || true
	docker rm currency-converter-local || true
	docker system prune -f
	@echo "Cleanup completed!"

# Backup
backup:
	@echo "Creating backup..."
	chmod +x scripts/backup.sh
	./scripts/backup.sh
	@echo "Backup completed!" 