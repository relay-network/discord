#!/bin/bash -e

function main () {
  if [ -z "${1}" ]; then
    default
  else
    for fn in "${@}"; do
      if [ "$(type -t "${fn}")" = "function" ]; then
        "${fn}"
      else 
        echo "scripts.publish.sh :: ERROR :: function ${fn} does not exist. Exiting."
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

function publish () {
  var::APP_NAME
  var::GITHUB_SHA
  var::GITHUB_TOKEN
  var::GITHUB_ACTOR
  var::APP_NAME
  var::GITHUB_SHA

  build
  login
  push
}

# #############################################################################
#
# VARIABLES
#
# #############################################################################

function var::PG_CONNECTION_STRING () {
  if [ -z "${PG_CONNECTION_STRING}" ]; then
    echo "scripts.publish.sh :: ERROR :: PG_CONNECTION_STRING is not set. Exiting."
    exit 1
  fi
}

function var::APP_NAME () {
  if [ -z "${APP_NAME}" ]; then
    echo "scripts.publish.sh :: ERROR :: APP_NAME is not set. Exiting."
    exit 1
  fi
}

function var::APP_ENV () {
  if [ -z "${APP_ENV}" ]; then
    echo "scripts.publish.sh :: ERROR :: APP_ENV is not set. Exiting."
    exit 1
  fi
}

function var::APP_INSTANCE () {
  if [ -z "${APP_INSTANCE}" ]; then
    echo "scripts.publish.sh :: ERROR :: APP_INSTANCE is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_SHA () {
  if [ -z "${GITHUB_SHA}" ]; then
    echo "scripts.publish.sh :: ERROR :: GITHUB_SHA is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_TOKEN () {
  if [ -z "${GITHUB_TOKEN}" ]; then
    echo "scripts.publish.sh :: ERROR :: GITHUB_TOKEN is not set. Exiting."
    exit 1
  fi
}

function var::GITHUB_ACTOR () {
  if [ -z "${GITHUB_ACTOR}" ]; then
    echo "scripts.publish.sh :: ERROR :: GITHUB_ACTOR is not set. Exiting."
    exit 1
  fi
}

# #############################################################################
#
# COMMANDS
#
# #############################################################################

function build () {
  docker build . -t ghcr.io/relay-network/"${APP_NAME}":"${GITHUB_SHA}"
}

function login () {
  echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
}

function push () {
  docker push ghcr.io/relay-network/"${APP_NAME}":"${GITHUB_SHA}"
  docker tag ghcr.io/relay-network/"${APP_NAME}":"${GITHUB_SHA}" ghcr.io/relay-network/"${APP_NAME}":latest
  docker push ghcr.io/relay-network/"${APP_NAME}":latest
}

function deps () {
  npm install
}

function compile () {
  npx prisma generate && npx tsc
}

# #############################################################################
#
# EXECUTE
#
# #############################################################################

[[ "${BASH_SOURCE[0]}" = "${0}" ]] && main "${@}"