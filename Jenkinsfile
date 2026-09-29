pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'ENV',
            choices: ['production', 'development'],
            description: 'Configuration Angular (production → environment.production.ts)'
        )
        booleanParam(
            name: 'PUSH_DOCKER',
            defaultValue: true,
            description: 'Pousser l’image Docker Hub'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Déployer le frontend sur le VPS (extrait HTML vers Nginx)'
        )
        string(
            name: 'DEPLOY_HOST',
            defaultValue: 'adminubuntu@osgateway.olive-services.net',
            description: 'SSH user@host du VPS'
        )
        string(
            name: 'DEPLOY_PATH',
            defaultValue: '/home/adminubuntu/OliveApps',
            description: 'Dossier OliveApps (docker compose)'
        )
        string(
            name: 'ENV_FILE',
            defaultValue: '/home/adminubuntu/OliveApps/prod.env',
            description: 'Fichier env OliveApps'
        )
    }

    environment {
        APP_NAME        = 'frontend-osgateway'
        DOCKER_IMAGE    = 'oliverqueen18/frontend-osgateway'
        DOCKER_TAG      = "${BUILD_NUMBER}"
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                set -e
                docker pull ${DOCKER_IMAGE}:latest || true
                docker build \
                  --build-arg BUILD_CONFIGURATION=${params.ENV} \
                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                  --cache-from ${DOCKER_IMAGE}:latest \
                  -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                  -t ${DOCKER_IMAGE}:latest \
                  .
                """
            }
        }

        stage('Docker Push') {
            when {
                expression { params.PUSH_DOCKER }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    set -e
                    echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                    docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                    docker push ${DOCKER_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy VPS') {
            when {
                expression { params.DEPLOY }
            }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'ssh-server-credentials',
                    keyFileVariable: 'SSH_KEY'
                )]) {
                    sh """
                    set -e
                    chmod 600 "\$SSH_KEY"
                    ssh -i "\$SSH_KEY" -o StrictHostKeyChecking=no ${params.DEPLOY_HOST} bash -s <<ENDSSH
set -e
cd ${params.DEPLOY_PATH}
export OSG_TAG=${DOCKER_TAG}
docker compose --env-file ${params.ENV_FILE} pull frontend-osgateway
docker compose --env-file ${params.ENV_FILE} up -d frontend-osgateway
docker image prune -f || true
echo "Frontend OS Gateway déployé"
ENDSSH
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ ${APP_NAME} OK — ${DOCKER_IMAGE}:${DOCKER_TAG}"
        }
        failure {
            echo "❌ ${APP_NAME} échoué"
        }
        always {
            cleanWs(deleteDirs: true, notFailBuild: true)
        }
    }
}
