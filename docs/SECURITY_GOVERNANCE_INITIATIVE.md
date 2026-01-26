# Security Hardening & Deployment Governance Initiative

## Overview

This directory contains the implementation of the cross-org security hardening, deployment improvement, and governance initiative for Data-Scientist-MSL repositories.

## Initiative Goals

- ✅ Harden security posture org-wide
- ✅ Implement port/deployment conflict detection
- ✅ Enable flexible deployment patterns (integrated & modular)
- ✅ Standardize deployment governance policies

## Documentation

### Core Documents

1. **[Deployment Governance](./DEPLOYMENT_GOVERNANCE.md)**
   - Port allocation policy
   - Security baseline policies
   - Deployment patterns (integrated/modular)
   - CI/CD requirements
   - Governance workflows

2. **[Monitoring & Conflict Resolution](./MONITORING_CONFLICT_RESOLUTION.md)**
   - Monitoring strategy
   - Port conflict resolution procedures
   - Service degradation handling
   - Incident response
   - Escalation matrix

### Tools & Resources

- **Port Conflict Detector**: `scripts/port-conflict-detector.js`
- **Port Registry**: `port-registry.json`
- **Deployment Templates**: `deployment-templates/`
- **CI/CD Workflows**: `.github/workflows/ci.yml`

## Quick Start

### For Developers

**Check for port conflicts before deploying**:
```bash
npm run check:ports
```

**View port allocation table**:
```bash
npm run show:port-registry
```

**Check specific environment**:
```bash
npm run check:ports:dev
npm run check:ports:staging
npm run check:ports:prod
```

### For DevOps

**Add port conflict detection to your repo**:

1. Copy the port conflict detector script:
   ```bash
   cp scripts/port-conflict-detector.js <your-repo>/scripts/
   ```

2. Add npm scripts to package.json:
   ```json
   {
     "scripts": {
       "check:ports": "node scripts/port-conflict-detector.js",
       "check:ports:ci": "node scripts/port-conflict-detector.js --ci"
     }
   }
   ```

3. Add to CI workflow:
   ```yaml
   - name: Port conflict detection
     run: npm run check:ports:ci
   ```

### For New Projects

**Use deployment templates**:

1. Copy appropriate template:
   ```bash
   # For integrated deployment
   cp deployment-templates/docker-compose.integrated.yml ./
   
   # For modular deployment
   cp deployment-templates/docker-compose.modular.yml ./
   
   # For Kubernetes
   cp -r deployment-templates/kubernetes ./
   ```

2. Update service names and ports
3. Run port conflict detection
4. Update port registry

## Port Allocation

Current port allocations:

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| reposense | 3000-3099 | 3100-3199 | 3200-3299 |
| gai-observe-online | 4000-4099 | 4100-4199 | 4200-4299 |
| muammarlone | 5000-5099 | 5100-5199 | 5200-5299 |

See `port-registry.json` for complete details.

## Security Best Practices

### 1. Dependency Management
- Run `npm audit --audit-level=critical` before every deployment
- Fix critical vulnerabilities immediately
- Address high vulnerabilities within 7 days

### 2. Secrets Management
- Never commit secrets to source code
- Use environment variables
- Use GitHub Secrets for CI/CD
- Rotate secrets quarterly

### 3. Container Security
- Use official base images only
- Pin specific versions (no `latest` tag)
- Run as non-root user
- Scan images for vulnerabilities

### 4. Network Security
- Expose only necessary ports
- Use TLS/SSL for external communications
- Implement rate limiting
- Use network policies in Kubernetes

## CI/CD Integration

The port conflict detector is integrated into the CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    steps:
      - name: Port conflict detection
        run: npm run check:ports:ci
```

This ensures:
- No port conflicts are merged to main
- All deployments follow port allocation policy
- Automated enforcement of governance

## Deployment Patterns

### Integrated Pattern
All services run together with local networking:
```bash
docker-compose -f deployment-templates/docker-compose.integrated.yml up -d
```

**Use when**:
- Services are tightly coupled
- Development environment
- Testing integration

### Modular Pattern
Services run independently:
```bash
docker-compose -f deployment-templates/docker-compose.modular.yml up -d
```

**Use when**:
- Microservices architecture
- Independent scaling needed
- Production deployment

### Kubernetes
Production-grade orchestration:
```bash
kubectl apply -f deployment-templates/kubernetes/
```

**Use when**:
- High availability required
- Auto-scaling needed
- Production at scale

## Monitoring

### Automated Checks
- Port conflicts (CI/CD)
- Security vulnerabilities (CI/CD)
- Service health (runtime)
- Resource usage (runtime)

### Manual Reviews
- Weekly: Security scan results
- Monthly: Port allocation audit
- Quarterly: Governance policy review

## Incident Response

1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Determine severity and impact
3. **Communication**: Update stakeholders
4. **Resolution**: Apply fix and verify
5. **Post-Mortem**: Document and learn

See [Monitoring & Conflict Resolution](./MONITORING_CONFLICT_RESOLUTION.md) for detailed procedures.

## Contributing

### Adding a New Service

1. **Reserve ports** in `port-registry.json`
2. **Create deployment manifest** using templates
3. **Add port conflict detection** to CI
4. **Run security scan**
5. **Deploy to dev** and test
6. **Document** in this README

### Updating Policies

1. **Propose changes** via pull request
2. **Get review** from DevOps team
3. **Update documentation**
4. **Communicate** to all teams
5. **Update** onboarding materials

## Team Onboarding

New team members should:

1. ✅ Read [Deployment Governance](./DEPLOYMENT_GOVERNANCE.md)
2. ✅ Review port allocation table
3. ✅ Set up local development environment
4. ✅ Run port conflict detector locally
5. ✅ Review [Monitoring & Conflict Resolution](./MONITORING_CONFLICT_RESOLUTION.md)
6. ✅ Complete security training
7. ✅ Join #deployment-alerts Slack channel

## Acceptance Criteria Status

- ✅ Documented policies for security and deployment governance published
- ✅ Port and deployment conflict detection operational
- ✅ Tooling usable across integrated and modular deployments
- ✅ Automated checks integrated into CI

## Maintenance

### Regular Tasks
- **Weekly**: Review security scan results
- **Monthly**: Audit port allocations
- **Quarterly**: Review and update policies

### Continuous Improvement
- Collect feedback from teams
- Update tools based on usage
- Refine processes as needed
- Share learnings across org

## Support & Contact

- **Questions**: #deployment-help on Slack
- **Incidents**: #deployment-alerts on Slack
- **Security**: #security on Slack
- **On-call**: See PagerDuty schedule

## References

- [GitHub Repository](https://github.com/Data-Scientist-MSL/RepoSense)
- [Issue Tracker](https://github.com/Data-Scientist-MSL/RepoSense/issues)
- [CI/CD Pipeline](https://github.com/Data-Scientist-MSL/RepoSense/actions)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-26 | Initial implementation | @copilot |

---

**Initiative Lead**: @muammarlone  
**Last Updated**: 2026-01-26  
**Status**: Active
