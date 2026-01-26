# Deployment Governance & Security Hardening

## Overview

This document establishes the baseline policies and practices for secure, conflict-free deployments across the Data-Scientist-MSL organization, including RepoSense, gaI-observe-online, and muammarlone repositories.

## Goals

- Harden security posture org-wide
- Prevent port and resource conflicts across environments
- Enable flexible deployment patterns (integrated and modular)
- Standardize CI/CD practices

## Port Assignment Policy

### Port Allocation Strategy

All services must register their port usage to prevent conflicts:

| Service/Repo | Environment | Port Range | Status |
|--------------|-------------|------------|---------|
| RepoSense API | Dev | 3000-3099 | Reserved |
| RepoSense API | Staging | 3100-3199 | Reserved |
| RepoSense API | Production | 3200-3299 | Reserved |
| gaI-observe-online | Dev | 4000-4099 | Reserved |
| gaI-observe-online | Staging | 4100-4199 | Reserved |
| gaI-observe-online | Production | 4200-4299 | Reserved |
| muammarlone | Dev | 5000-5099 | Reserved |
| muammarlone | Staging | 5100-5199 | Reserved |
| muammarlone | Production | 5200-5299 | Reserved |

### Port Conflict Detection

Before deploying any service:

1. **Run port conflict detection tool** (see `scripts/port-conflict-detector.js`)
2. **Check port allocation table** above
3. **Update allocation table** if using new ports
4. **Document in deployment manifest**

## Security Baseline Policies

### 1. Dependency Security

- **CRITICAL**: All critical vulnerabilities must be resolved before deployment
- **HIGH**: High vulnerabilities should be addressed within 7 days
- **MEDIUM/LOW**: Track and remediate during regular maintenance

**Enforcement**: `npm audit --audit-level=critical` runs in CI pipeline

### 2. Secrets Management

- **NEVER** commit secrets to source code
- Use environment variables for all sensitive configuration
- Use GitHub Secrets for CI/CD credentials
- Rotate secrets quarterly or on suspected compromise

### 3. Container Security

- Use official base images only
- Pin specific image versions (avoid `latest` tag)
- Run containers as non-root users
- Scan images for vulnerabilities before deployment

### 4. Network Security

- Expose only necessary ports
- Use TLS/SSL for all external communications
- Implement rate limiting on public endpoints
- Use network policies in Kubernetes deployments

## Deployment Patterns

### Integrated Deployment

When services need tight coupling:

```yaml
# docker-compose.integrated.yml
version: '3.8'
services:
  reposense:
    image: reposense:latest
    ports:
      - "3000:3000"
    environment:
      - OBSERVE_API_URL=http://observe:4000
  
  observe:
    image: gai-observe:latest
    ports:
      - "4000:4000"
```

### Modular Deployment

When services run independently:

```yaml
# docker-compose.modular.yml
version: '3.8'
services:
  reposense:
    image: reposense:latest
    ports:
      - "3000:3000"
    environment:
      - OBSERVE_API_URL=${EXTERNAL_OBSERVE_URL}
```

## CI/CD Requirements

### Mandatory Checks (All Repos)

1. **Build Verification**: Code must compile/build successfully
2. **Linting**: Pass linting with no errors
3. **Security Scan**: No critical vulnerabilities
4. **Port Conflict Detection**: No port conflicts detected
5. **Unit Tests**: Minimum 70% coverage for new code

### Pre-Deployment Checklist

- [ ] All CI checks pass
- [ ] Security scan complete
- [ ] Port conflicts resolved
- [ ] Environment variables documented
- [ ] Deployment manifest reviewed
- [ ] Rollback plan documented

## Monitoring & Alerting

### Deployment Health Monitoring

Monitor these metrics:

- **Service Availability**: 99.9% uptime target
- **Response Time**: p95 < 500ms
- **Error Rate**: < 1% of requests
- **Resource Usage**: CPU < 80%, Memory < 85%

### Conflict Detection

Runtime monitoring for:

- Port binding failures
- Resource contention
- API endpoint conflicts
- Version mismatches

### Alert Escalation

1. **Level 1** (Warning): Log and notify team channel
2. **Level 2** (Error): Page on-call engineer
3. **Level 3** (Critical): Immediate escalation to senior engineer

## Governance Workflows

### New Service Deployment

1. Reserve port range in allocation table
2. Create deployment manifest (Docker/K8s)
3. Add port conflict checks to CI
4. Run security scan
5. Deploy to dev environment
6. Validate with smoke tests
7. Promote through staging to production

### Port Conflict Resolution

**Immediate Actions**:
1. Identify conflicting services
2. Shut down lower-priority service
3. Reassign ports
4. Update allocation table
5. Restart services

**Prevention**:
- Run `npm run check:ports` before every deployment
- Automate port registration in CI
- Maintain up-to-date port registry

### Security Incident Response

1. **Detect**: Automated scanning + security alerts
2. **Assess**: Determine severity and impact
3. **Contain**: Isolate affected services
4. **Remediate**: Apply patches/fixes
5. **Verify**: Re-scan and test
6. **Document**: Post-mortem and lessons learned

## Compliance & Auditing

### Regular Reviews

- **Weekly**: Review security scan results
- **Monthly**: Audit port allocation table
- **Quarterly**: Full governance policy review

### Audit Trail

Maintain logs for:
- All deployments with timestamps
- Port assignments and changes
- Security scan results
- Incident responses

## Onboarding

### New Team Members

1. Read this governance document
2. Complete security training
3. Review port allocation table
4. Set up local development environment
5. Run port conflict detector locally

### New Repositories

1. Add port conflict detection to CI
2. Reserve port range
3. Implement security scanning
4. Follow deployment checklist
5. Document in central registry

## Tools & Resources

- **Port Conflict Detector**: `scripts/port-conflict-detector.js`
- **Security Scanner**: GitHub Dependabot + `npm audit`
- **Deployment Templates**: `deployment-templates/`
- **Monitoring Dashboard**: (To be implemented)

## Contact & Support

For questions or assistance:
- **Security Issues**: @muammarlone, security team
- **Deployment Help**: DevOps team channel
- **Policy Questions**: Architecture team

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-26 | Initial governance framework | @copilot |

---

**Last Updated**: 2026-01-26  
**Status**: Active  
**Review Date**: 2026-04-26
