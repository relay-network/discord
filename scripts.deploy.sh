#!/bin/bash -e

function main () {
  if [ -z "${1}" ]; then
    default
  else
    for fn in "${@}"; do
      if [ "$(type -t "${fn}")" = "function" ]; then
        "${fn}"
      else 
        echo "scripts.deploy.sh :: ERROR :: function ${fn} does not exist. Exiting."
        exit 1
      fi
    done
  fi
}

# #############################################################################
#
# WORKFLOWS
#
# #############################################################################

function default () {
  var::APP_NAME
  var::APP_ENV
  var::APP_INSTANCE
  var::PG_CONNECTION_STRING
  var::DOCKER_HOST
  var::GITHUB_SHA
  var::GITHUB_TOKEN
  var::GITHUB_ACTOR

  login
  deploy
}

# #############################################################################
#
# VARIABLES
#
# #############################################################################

function var::APP_NAME () {
  if [ -z "${APP_NAME}" ]; then
    echo "scripts.deploy.sh :: ERROR :: APP_NAME is not set. Exiting."
    exit 1
  fi
}

function var::APP_ENV () {
  if [ -z "${APP_ENV}" ]; then
    echo "scripts.deploy.sh :: ERROR :: APP_ENV is not set. Exiting."
    exit 1
  fi
}

function var::APP_INSTANCE () {
  if [ -z "${APP_INSTANCE}" ]; then
    echo "scripts.deploy.sh :: ERROR :: APP_INSTANCE is not set. Exiting."
    exit 1
  fi
}

function var::PG_CONNECTION_STRING () {
  if [ -z "${PG_CONNECTION_STRING}" ]; then
    echo "scripts.deploy.sh :: ERROR :: PG_CONNECTION_STRING is not set. Exiting."
    exit 1
  fi
}

function var::DOCKER_HOST () {
  if [ -z "${DOCKER_HOST}" ]; then
    echo "scripts.deploy.sh :: ERROR :: DOCKER_HOST is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_SHA () {
  if [ -z "${GITHUB_SHA}" ]; then
    echo "scripts.deploy.sh :: ERROR :: GITHUB_SHA is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_TOKEN () {
  if [ -z "${GITHUB_TOKEN}" ]; then
    echo "scripts.deploy.sh :: ERROR :: GITHUB_TOKEN is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_ACTOR () {
  if [ -z "${GITHUB_ACTOR}" ]; then
    echo "scripts.deploy.sh :: ERROR :: GITHUB_ACTOR is not set. Exiting."
    exit 1
  fi
}

# #############################################################################
#
# COMMANDS
#
# #############################################################################

function login () {
  echo "${GITHUB_TOKEN}" | ssh relay-network-primary docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
}

function deploy () {
  DOCKER_HOST="${DOCKER_HOST}" docker service update \
    --image ghcr.io/relay-network/"${APP_NAME}":"${GITHUB_SHA}" \
    --restart-max-attempts "3" \
    --env-add "APP_NAME=${APP_NAME}" \
    --env-add "APP_ENV=${APP_ENV}" \
    --env-add "APP_INSTANCE=${APP_INSTANCE}" \
    --env-add "APP_SERVICE=app" \
    --env-add "PG_CONNECTION_STRING=${PG_CONNECTION_STRING}" \
    "${APP_NAME}-prod"
}

# #############################################################################
#
# EXECUTE
#
# #############################################################################

[[ "${BASH_SOURCE[0]}" = "${0}" ]] && main "${@}"