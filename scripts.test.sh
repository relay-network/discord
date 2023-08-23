#!/bin/bash -e

function main () {
  if [ -z "${1}" ]; then
    default
  else
    for fn in "${@}"; do
      if [ "$(type -t "${fn}")" = "function" ]; then
        "${fn}"
      else 
        echo "scripts.test.sh :: ERROR :: function ${fn} does not exist. Exiting."
        exit 1
      fi
    done
  fi
}

# #############################################################################
#
# VARIABLES
#
# #############################################################################

if [ -z "${PG_CONNECTION_STRING}" ]; then
  echo "scripts.test.sh :: ERROR :: PG_CONNECTION_STRING is not set. Exiting."
  exit 1
fi

if [ -z "${APP_NAME}" ]; then
  echo "scripts.test.sh :: ERROR :: APP_NAME is not set. Exiting."
  exit 1
fi

if [ -z "${APP_ENV}" ]; then
  echo "scripts.test.sh :: ERROR :: APP_ENV is not set. Exiting."
  exit 1
fi

if [ -z "${APP_INSTANCE}" ]; then
  echo "scripts.test.sh :: ERROR :: APP_INSTANCE is not set. Exiting."
  exit 1
fi

# #############################################################################
#
# WORKFLOWS
#
# #############################################################################

function default () {
  deps
  lint
  format
  typecheck
  prisma
  compile
  e2e
  build
}

# #############################################################################
#
# COMMANDS
#
# #############################################################################

function deps::nuke () {
  rm -rf node_modules
}

function deps () {
  npm ci
}

function lint () {
  npx eslint --max-warnings=0 .
}

function format () {
  npx prettier --check .
}

function typecheck () {
  npx tsc --noEmit
}

function prisma () { 
  npx prisma generate
}

function compile::nuke () {
  rm -rf build
}

function compile () {
  npx tsc
}

function build () {
  docker build .
}

function e2e () {
  echo "TODO: e2e tests"
}

# #############################################################################
#
# EXECUTE
#
# #############################################################################

[[ "${BASH_SOURCE[0]}" = "${0}" ]] && main "${@}"