#!/usr/bin/env node

/**
 * Port Conflict Detection Tool
 * 
 * Detects potential port conflicts across deployment configurations
 * and validates against the organization's port allocation table.
 * 
 * Usage:
 *   node scripts/port-conflict-detector.js [options]
 * 
 * Options:
 *   --config <file>     Path to port allocation config (default: port-registry.json)
 *   --manifest <file>   Path to deployment manifest to validate
 *   --env <env>         Environment to check (dev, staging, prod)
 *   --ci                CI mode - exit with error code on conflicts
 */

const fs = require('fs');
const path = require('path');

// Default port allocation registry
const DEFAULT_PORT_REGISTRY = {
  reposense: {
    dev: { start: 3000, end: 3099 },
    staging: { start: 3100, end: 3199 },
    production: { start: 3200, end: 3299 }
  },
  'gai-observe-online': {
    dev: { start: 4000, end: 4099 },
    staging: { start: 4100, end: 4199 },
    production: { start: 4200, end: 4299 }
  },
  muammarlone: {
    dev: { start: 5000, end: 5099 },
    staging: { start: 5100, end: 5199 },
    production: { start: 5200, end: 5299 }
  }
};

// Common ports that should be avoided
const RESERVED_PORTS = [
  22,   // SSH
  25,   // SMTP
  80,   // HTTP
  443,  // HTTPS
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  27017 // MongoDB
];

class PortConflictDetector {
  constructor(options = {}) {
    this.ciMode = options.ci || false;
    this.environment = options.env || 'dev';
    this.registry = this.loadRegistry(options.config);
    this.conflicts = [];
    this.warnings = [];
  }

  loadRegistry(configPath) {
    // Default to port-registry.json if no path specified
    if (!configPath) {
      const defaultPath = path.join(process.cwd(), 'port-registry.json');
      if (fs.existsSync(defaultPath)) {
        configPath = defaultPath;
      }
    }
    
    if (configPath && fs.existsSync(configPath)) {
      try {
        const data = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.portAllocations || config;
      } catch (error) {
        console.warn(`⚠️  Failed to load config: ${error.message}`);
      }
    }
    return DEFAULT_PORT_REGISTRY;
  }

  /**
   * Check if a port is in a reserved range for a service
   */
  isPortInServiceRange(port, service, env) {
    // Normalize service names for matching
    const normalizedService = service.toLowerCase().replace(/-api$/, '').replace(/_/g, '-');
    
    // Try exact match first
    let serviceConfig = this.registry[service];
    
    // Try normalized match
    if (!serviceConfig) {
      serviceConfig = this.registry[normalizedService];
    }
    
    // Try partial matches
    if (!serviceConfig) {
      for (const [key, config] of Object.entries(this.registry)) {
        if (key.includes(normalizedService) || normalizedService.includes(key)) {
          serviceConfig = config;
          break;
        }
      }
    }
    
    if (!serviceConfig || !serviceConfig[env]) {
      return false;
    }
    const { start, end } = serviceConfig[env];
    return port >= start && port <= end;
  }

  /**
   * Check if a port conflicts with system reserved ports
   */
  isReservedPort(port, service = null) {
    // Allow infrastructure services to use their standard ports
    const infraServices = ['db', 'database', 'cache', 'redis', 'postgres', 'mysql', 'mongo'];
    if (service && infraServices.some(s => service.toLowerCase().includes(s))) {
      return false;
    }
    return RESERVED_PORTS.includes(port);
  }

  /**
   * Validate a single port assignment
   */
  validatePort(port, service, env) {
    // Check reserved ports
    if (this.isReservedPort(port, service)) {
      this.conflicts.push({
        type: 'reserved',
        port,
        service,
        env,
        message: `Port ${port} is reserved for system services`
      });
      return false;
    }

    // Check if port is in correct range for service
    if (!this.isPortInServiceRange(port, service, env)) {
      this.conflicts.push({
        type: 'out_of_range',
        port,
        service,
        env,
        message: `Port ${port} is outside allocated range for ${service} in ${env}`
      });
      return false;
    }

    return true;
  }

  /**
   * Check for port conflicts across services
   */
  checkCrossServiceConflicts(portAssignments) {
    const portMap = new Map();

    for (const assignment of portAssignments) {
      const { port, service, env, file } = assignment;
      const key = `${env}:${port}`;

      if (portMap.has(key)) {
        const existing = portMap.get(key);
        
        // Normalize service names for comparison
        const normalizedCurrent = service.toLowerCase().replace(/-api$/, '');
        const normalizedExisting = existing.service.toLowerCase().replace(/-api$/, '');
        
        // Only flag as conflict if it's truly different services
        if (normalizedCurrent !== normalizedExisting) {
          this.conflicts.push({
            type: 'conflict',
            port,
            services: [existing.service, service],
            env,
            message: `Port ${port} conflict between ${existing.service} and ${service} in ${env}`
          });
        }
      } else {
        portMap.set(key, assignment);
      }
    }
  }

  /**
   * Parse Docker Compose file for port assignments
   */
  parseDockerCompose(filePath) {
    const assignments = [];
    
    if (!fs.existsSync(filePath)) {
      // Don't warn for every possible file, only when actively scanning
      return assignments;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      let currentService = null;
      let inPortsSection = false;
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Detect service name (indented at 2 spaces, followed by colon)
        const serviceMatch = line.match(/^\s{2}([a-zA-Z0-9_-]+):\s*$/);
        if (serviceMatch && !line.includes('version:')) {
          currentService = serviceMatch[1];
          inPortsSection = false;
        }
        
        // Detect ports section
        if (trimmed === 'ports:' && currentService) {
          inPortsSection = true;
          continue;
        }
        
        // Exit ports section when we hit another top-level key
        if (inPortsSection && line.match(/^\s{4}[a-z_]+:/) && !line.includes('-')) {
          inPortsSection = false;
        }
        
        // Parse port mappings in ports section
        if (inPortsSection && trimmed.startsWith('-')) {
          // Match patterns: "3000:3000", "${VAR:-3000}:3000", etc.
          const portMatch = trimmed.match(/["']?(\d+):(\d+)["']?/) || 
                           trimmed.match(/\$\{[A-Z_]+:-(\d+)\}:(\d+)/);
          
          if (portMatch && currentService) {
            const externalPort = parseInt(portMatch[1]);
            if (!isNaN(externalPort)) {
              assignments.push({
                port: externalPort,
                service: currentService,
                env: this.environment,
                file: filePath
              });
            }
          }
        }
      }
    } catch (error) {
      this.warnings.push(`Error parsing ${filePath}: ${error.message}`);
    }

    return assignments;
  }

  /**
   * Parse package.json scripts for port usage
   */
  parsePackageJson(filePath) {
    const assignments = [];
    
    if (!fs.existsSync(filePath)) {
      return assignments;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const scripts = pkg.scripts || {};
      
      for (const [name, script] of Object.entries(scripts)) {
        const portMatches = script.match(/--port[=\s]+(\d+)|PORT[=\s]+(\d+)/g);
        if (portMatches) {
          portMatches.forEach(match => {
            const port = parseInt(match.match(/\d+/)[0]);
            assignments.push({
              port,
              service: pkg.name || 'unknown',
              env: this.environment,
              file: filePath,
              script: name
            });
          });
        }
      }
    } catch (error) {
      this.warnings.push(`Error parsing ${filePath}: ${error.message}`);
    }

    return assignments;
  }

  /**
   * Scan directory for deployment configurations
   */
  scanDirectory(dirPath) {
    const allAssignments = [];

    // Check for docker-compose files
    const composeFiles = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'docker-compose.dev.yml',
      'docker-compose.staging.yml',
      'docker-compose.prod.yml',
      'docker-compose.integrated.yml',
      'docker-compose.modular.yml'
    ];

    for (const file of composeFiles) {
      const filePath = path.join(dirPath, file);
      const assignments = this.parseDockerCompose(filePath);
      allAssignments.push(...assignments);
    }

    // Check for Kubernetes manifests
    const k8sDir = path.join(dirPath, 'kubernetes');
    if (fs.existsSync(k8sDir) && fs.statSync(k8sDir).isDirectory()) {
      const k8sFiles = fs.readdirSync(k8sDir).filter(f => 
        f.endsWith('.yml') || f.endsWith('.yaml')
      );
      
      for (const file of k8sFiles) {
        const filePath = path.join(k8sDir, file);
        const assignments = this.parseKubernetesManifest(filePath);
        allAssignments.push(...assignments);
      }
    }

    // Check package.json
    const pkgPath = path.join(dirPath, 'package.json');
    const pkgAssignments = this.parsePackageJson(pkgPath);
    allAssignments.push(...pkgAssignments);

    return allAssignments;
  }

  /**
   * Parse Kubernetes manifest for port assignments
   */
  parseKubernetesManifest(filePath) {
    const assignments = [];
    
    if (!fs.existsSync(filePath)) {
      return assignments;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let currentService = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect service name from metadata
        if (line.includes('name:') && i > 0 && lines[i-1].includes('metadata:')) {
          const nameMatch = line.match(/name:\s*([a-zA-Z0-9-]+)/);
          if (nameMatch) {
            currentService = nameMatch[1];
          }
        }
        
        // Detect container ports
        const portMatch = line.match(/containerPort:\s*(\d+)/);
        if (portMatch && currentService) {
          const port = parseInt(portMatch[1]);
          assignments.push({
            port,
            service: currentService,
            env: this.environment,
            file: filePath,
            type: 'kubernetes'
          });
        }
      }
    } catch (error) {
      this.warnings.push(`Error parsing ${filePath}: ${error.message}`);
    }

    return assignments;
  }

  /**
   * Run full conflict detection
   */
  detect(targetPath = '.') {
    console.log('🔍 Port Conflict Detection Tool');
    console.log('================================\n');
    console.log(`Environment: ${this.environment}`);
    console.log(`Scanning: ${targetPath}\n`);

    // Scan for port assignments
    const assignments = this.scanDirectory(targetPath);

    if (assignments.length === 0) {
      console.log('ℹ️  No port assignments found in deployment configurations');
      return { success: true, conflicts: [], warnings: this.warnings };
    }

    console.log(`Found ${assignments.length} port assignment(s):\n`);
    assignments.forEach(a => {
      console.log(`  - ${a.service}: ${a.port} (${a.file})`);
    });
    console.log();

    // Validate each port
    assignments.forEach(a => {
      this.validatePort(a.port, a.service, a.env);
    });

    // Check for cross-service conflicts
    this.checkCrossServiceConflicts(assignments);

    // Report results
    this.report();

    return {
      success: this.conflicts.length === 0,
      conflicts: this.conflicts,
      warnings: this.warnings,
      assignments
    };
  }

  /**
   * Print detection results
   */
  report() {
    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`   ${w}`));
      console.log();
    }

    if (this.conflicts.length === 0) {
      console.log('✅ No port conflicts detected!\n');
      return;
    }

    console.log(`❌ Found ${this.conflicts.length} conflict(s):\n`);
    this.conflicts.forEach((c, i) => {
      console.log(`${i + 1}. ${c.message}`);
      console.log(`   Type: ${c.type}`);
      console.log(`   Port: ${c.port}`);
      if (c.services) {
        console.log(`   Services: ${c.services.join(', ')}`);
      }
      console.log();
    });

    if (this.ciMode) {
      console.error('💥 Port conflicts detected in CI mode - failing build');
      process.exit(1);
    }
  }

  /**
   * Print port allocation table
   */
  showRegistry() {
    console.log('\n📋 Port Allocation Registry\n');
    console.log('Service                | Environment | Port Range');
    console.log('----------------------|-------------|------------');
    
    for (const [service, envs] of Object.entries(this.registry)) {
      for (const [env, range] of Object.entries(envs)) {
        const rangeStr = `${range.start}-${range.end}`;
        console.log(`${service.padEnd(21)} | ${env.padEnd(11)} | ${rangeStr}`);
      }
    }
    console.log();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    ci: args.includes('--ci'),
    env: args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev',
    config: args.includes('--config') ? args[args.indexOf('--config') + 1] : null
  };

  const detector = new PortConflictDetector(options);

  if (args.includes('--show-registry')) {
    detector.showRegistry();
  } else {
    const targetPath = args.find(a => !a.startsWith('--')) || '.';
    const result = detector.detect(targetPath);
    
    if (!result.success && options.ci) {
      process.exit(1);
    }
  }
}

module.exports = PortConflictDetector;
