# Deployment Templates

This directory contains example deployment configurations for different deployment patterns across the Data-Scientist-MSL organization.

## Available Templates

### Integrated Deployment
- `docker-compose.integrated.yml` - Multi-service integrated deployment
- Suitable for tightly coupled services that need to communicate locally
- All services run together in a single Docker Compose stack

### Modular Deployment
- `docker-compose.modular.yml` - Single service modular deployment
- Suitable for independent service deployment
- Services communicate via external URLs

### Kubernetes
- `kubernetes/` - Kubernetes deployment manifests
- Production-ready configurations with resource limits
- Includes service discovery and networking

## Usage

### Using Integrated Pattern

```bash
# Deploy all services together
docker-compose -f deployment-templates/docker-compose.integrated.yml up -d

# Check service health
docker-compose -f deployment-templates/docker-compose.integrated.yml ps

# View logs
docker-compose -f deployment-templates/docker-compose.integrated.yml logs -f
```

### Using Modular Pattern

```bash
# Deploy individual service
docker-compose -f deployment-templates/docker-compose.modular.yml up -d

# Configure external service URLs via environment
export EXTERNAL_OBSERVE_URL=https://observe-api.example.com
docker-compose -f deployment-templates/docker-compose.modular.yml up -d
```

## Port Allocation

All templates follow the organization's port allocation policy documented in `docs/DEPLOYMENT_GOVERNANCE.md`.

Before using any template:
1. Run `npm run check:ports` to verify no conflicts
2. Update port mappings if needed
3. Document any changes in `port-registry.json`

## Customization

1. Copy the appropriate template to your repository
2. Update service names and image references
3. Configure environment variables
4. Run port conflict detection
5. Test in development environment first

## Security Notes

- Never commit secrets to these files
- Use `.env` files for sensitive configuration (ensure `.env` is in `.gitignore`)
- Always pin specific image versions (avoid `latest` tag)
- Run security scans on images before deployment

## Support

For questions or issues with deployment templates:
- Review `docs/DEPLOYMENT_GOVERNANCE.md`
- Contact DevOps team
- Create issue in central RepoSense repository
