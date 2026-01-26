# Security & Governance Quick Reference

## 🚀 Quick Commands

### Port Conflict Detection
```bash
# Check for conflicts
npm run check:ports

# Check specific environment  
npm run check:ports:dev
npm run check:ports:staging
npm run check:ports:prod

# CI mode (fails on conflicts)
npm run check:ports:ci

# Show port allocation table
npm run show:port-registry
```

### Security Checks
```bash
# Run security audit
npm audit --audit-level=critical

# Fix vulnerabilities
npm audit fix

# View audit report
npm audit
```

## 📋 Port Allocations

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| **reposense** | 3000-3099 | 3100-3199 | 3200-3299 |
| **gai-observe-online** | 4000-4099 | 4100-4199 | 4200-4299 |
| **muammarlone** | 5000-5099 | 5100-5199 | 5200-5299 |

### Infrastructure Services
- **Redis (cache)**: 6379
- **PostgreSQL (db)**: 5432
- **MongoDB**: 27017
- **MySQL**: 3306

## ✅ Pre-Deployment Checklist

- [ ] Run `npm run check:ports:ci` - no conflicts
- [ ] Run `npm audit --audit-level=critical` - no critical vulnerabilities
- [ ] Run tests - all passing
- [ ] Update `port-registry.json` if using new ports
- [ ] Review deployment manifest (docker-compose/k8s)
- [ ] Test in dev environment
- [ ] Document deployment in changelog

## 🔧 Deployment Templates

### Integrated (All services together)
```bash
docker-compose -f deployment-templates/docker-compose.integrated.yml up -d
```

### Modular (Single service)
```bash
docker-compose -f deployment-templates/docker-compose.modular.yml up -d
```

### Kubernetes
```bash
kubectl apply -f deployment-templates/kubernetes/
```

## 🚨 When Things Go Wrong

### Port Conflict Detected

1. **Identify** conflicting services
2. **Choose** which service to change
3. **Update** port in deployment manifest
4. **Update** `port-registry.json`
5. **Run** `npm run check:ports:ci` to verify
6. **Redeploy** affected service
7. **Commit** changes

### Service Down

1. **Check** logs: `docker-compose logs -f <service>`
2. **Check** health: `curl http://localhost:<port>/health`
3. **Restart**: `docker-compose restart <service>`
4. **Rollback** if needed: `git checkout <previous-commit>`

### Security Vulnerability

**Critical (CVSS >= 9.0)**:
- Stop deployment immediately
- Fix or remove vulnerable dependency
- Re-run security audit
- Deploy fix ASAP

**High (CVSS >= 7.0)**:
- Create ticket
- Fix within 7 days
- Monitor for exploits

## 📞 Contact

- **Deployment Help**: #deployment-help
- **Security Issues**: #security
- **On-Call**: PagerDuty rotation
- **Questions**: @muammarlone

## 📚 Documentation

- [Full Governance Guide](./DEPLOYMENT_GOVERNANCE.md)
- [Monitoring & Incidents](./MONITORING_CONFLICT_RESOLUTION.md)
- [Initiative Overview](./SECURITY_GOVERNANCE_INITIATIVE.md)

## 🎯 Common Tasks

### Add New Service

1. Reserve ports in `port-registry.json`:
   ```json
   "my-service": {
     "dev": { "start": 6000, "end": 6099 }
   }
   ```

2. Create deployment manifest
3. Add port check to CI
4. Run `npm run check:ports:ci`
5. Deploy to dev

### Update Existing Service

1. Check current port assignment
2. If changing port, update `port-registry.json`
3. Update deployment manifest
4. Run `npm run check:ports:ci`
5. Test in dev
6. Deploy to staging/prod

### Onboard New Developer

1. Clone repository
2. Run `npm install`
3. Read [DEPLOYMENT_GOVERNANCE.md](./DEPLOYMENT_GOVERNANCE.md)
4. Run `npm run show:port-registry`
5. Set up local environment
6. Run `npm run check:ports`

## 💡 Best Practices

### DO ✅
- Always run port conflict detection before deploying
- Use environment variables for configuration
- Pin specific image versions
- Run as non-root user in containers
- Use health checks in all services
- Document all changes

### DON'T ❌
- Commit secrets to source code
- Use `latest` tag in production
- Skip security scans
- Deploy without testing
- Ignore port conflicts
- Expose unnecessary ports

## 🔐 Security Checklist

- [ ] No secrets in code
- [ ] All dependencies up to date
- [ ] No critical vulnerabilities
- [ ] TLS/SSL enabled
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] Logs sanitized (no sensitive data)
- [ ] Containers run as non-root

## 📊 Monitoring

### Key Metrics
- **Availability**: Target 99.9%
- **Response Time (p95)**: < 500ms
- **Error Rate**: < 1%
- **CPU Usage**: < 80%
- **Memory Usage**: < 85%

### Health Check
```bash
# Check service health
curl http://localhost:<port>/health

# Expected response
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0"
}
```

## 🔄 CI/CD

### GitHub Actions Workflow
```yaml
- name: Port conflict detection
  run: npm run check:ports:ci

- name: Security audit
  run: npm audit --audit-level=critical

- name: Run tests
  run: npm test
```

### Pre-commit Hook
```bash
#!/bin/bash
npm run check:ports:ci || exit 1
npm audit --audit-level=critical || exit 1
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-26  
**Maintained by**: DevOps Team
