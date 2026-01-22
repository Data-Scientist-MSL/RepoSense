// Sprint 15 D3: Jenkins Pipeline for RepoSense Quality Gates

pipeline {
    agent any

    parameters {
        choice(
            name: 'GATE_STRICTNESS',
            choices: ['normal', 'strict'],
            description: 'Quality gate enforcement level'
        )
        string(
            name: 'MAX_HIGH_GAPS',
            defaultValue: '3',
            description: 'Maximum allowed high-severity gaps'
        )
    }

    environment {
        REPOSENSE_OUTPUT = '.reposense/cli-output'
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                script {
                    sh '''
                        node --version
                        npm --version
                        npm install
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh 'npm run compile'
                }
            }
        }

        stage('RepoSense Scan') {
            steps {
                script {
                    sh '''
                        mkdir -p ${REPOSENSE_OUTPUT}
                        npm run cli -- scan --project .
                    '''
                }
            }
        }

        stage('Quality Gate Check') {
            steps {
                script {
                    def gateConfig = '''{
                        "maxCriticalGaps": 0,
                        "maxHighGaps": ${MAX_HIGH_GAPS},
                        "minCoverage": 0.80,
                        "maxComplexityScore": 8.5,
                        "requiredRemediations": 10
                    }'''

                    writeFile file: '.reposense/quality-gates.json', text: gateConfig

                    def gateResult = sh(
                        script: 'npm run cli -- check --config .reposense/quality-gates.json',
                        returnStatus: true
                    )

                    if (gateResult == 1) {
                        currentBuild.result = 'FAILURE'
                        error('Quality gates failed')
                    } else if (gateResult == 2) {
                        echo '⚠️ Quality gate warnings detected'
                    }
                }
            }
        }

        stage('Generate Report') {
            steps {
                script {
                    sh 'npm run cli -- report --format html'
                }
            }
        }

        stage('Export Artifacts') {
            steps {
                script {
                    sh 'npm run cli -- export'
                }
            }
        }

        stage('Publish Badge') {
            steps {
                script {
                    sh '''
                        npm run cli -- badge --output ${REPOSENSE_OUTPUT}/quality-badge.svg
                    '''
                }
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: '${REPOSENSE_OUTPUT}/**', 
                                allowEmptyArchive: true
                
                publishHTML target: [
                    reportDir: '${REPOSENSE_OUTPUT}',
                    reportFiles: 'report.html',
                    reportName: 'RepoSense Report'
                ]
            }
        }
    }

    post {
        always {
            script {
                // Collect metrics
                def scanResult = readJSON file: '${REPOSENSE_OUTPUT}/scan-result.json'
                def gateResult = readJSON file: '${REPOSENSE_OUTPUT}/check-result.json'
                
                def summary = """
                RepoSense Quality Gate Results
                ==============================
                Build: ${BUILD_NUMBER}
                Status: ${currentBuild.result}
                Gaps Found: ${scanResult.data?.count}
                Gate Status: ${gateResult.message}
                """
                
                echo summary
            }
        }

        success {
            echo '✅ All quality gates passed!'
            updateGitHubCommitStatus('SUCCESS')
        }

        failure {
            echo '❌ Quality gates failed!'
            updateGitHubCommitStatus('FAILURE')
        }

        unstable {
            echo '⚠️ Quality gate warnings detected'
            updateGitHubCommitStatus('PENDING')
        }

        cleanup {
            deleteDir()
        }
    }
}

def updateGitHubCommitStatus(String status) {
    // Optional: Send status back to GitHub
    // Requires GitHub + Jenkins plugin configuration
    sh '''
        echo "Sending status: ${status}"
    '''
}
