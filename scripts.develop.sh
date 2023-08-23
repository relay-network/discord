#!/bin/bash -e

function main () {
  if [ -z "${1}" ]; then
    default
  else
    for fn in "${@}"; do
      if [ "$(type -t "${fn}")" = "function" ]; then
        "${fn}"
      else 
        echo "scripts.develop.sh :: ERROR :: function ${fn} does not exist. Exiting."
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
  echo "scripts.develop.sh :: ERROR :: PG_CONNECTION_STRING is not set. Exiting."
  exit 1
fi

if [ -z "${APP_NAME}" ]; then
  echo "scripts.develop.sh :: ERROR :: APP_NAME is not set. Exiting."
  exit 1
fi

if [ -z "${APP_ENV}" ]; then
  echo "scripts.develop.sh :: ERROR :: APP_ENV is not set. Exiting."
  exit 1
fi

if [ -z "${APP_INSTANCE}" ]; then
  echo "scripts.develop.sh :: ERROR :: APP_INSTANCE is not set. Exiting."
  exit 1
fi

# #############################################################################
#
# WORKFLOWS
#
# #############################################################################

function default () {
  on_exit
  deps::nuke
  deps
  compile::nuke
  compile
  compile::watch </dev/null &
  prisma::watch </dev/null &
  bot </dev/null &
  wait
}

function validate () {
  on_exit
  deps::nuke
  deps
  lint
  format
  prisma
  typecheck
  compile::nuke
  compile
  bot </dev/null >./build/"${APP_NAME}"-bridge.log 2>&1 &
  sleep 2
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
  npm install
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

function compile::nuke () {
  rm -rf build
}

function prisma () {
  npx prisma generate
} 

function prisma::watch () {
  npx prisma generate --watch
}

function compile () {
  npx tsc
}

function compile::watch () {
  npx tsc --watch --preserveWatchOutput
}

function build () {
  docker build .
}

function bot () {
  PG_CONNECTION_STRING="${PG_CONNECTION_STRING}" \
  APP_NAME="${APP_NAME}" \
  APP_ENV="${APP_ENV}" \
  APP_INSTANCE="${APP_INSTANCE}" \
  APP_SERVICE="bot" \
  npx nodemon -w build ./build/src/bot.js
}

# #############################################################################
#
# HELPERS
#
# #############################################################################

function studio () {
  PG_CONNECTION_STRING=${PG_CONNECTION_STRING} npx prisma studio
}

function tlog () {
  on_exit

  for f in canary webhook bridge e2e; do
    tail -F "./build/${APP_NAME}-${f}.log" | sed -e "s/^/[${f}] /" &
  done

  wait
}

function terr () {
  on_exit

  for f in canary webhook bridge e2e; do
    tail -F "./build/${APP_NAME}-${f}.error.log"
  done

  wait
}

function on_exit () {
  trap 'trap - SIGTERM && kill -- -$$' SIGINT SIGTERM EXIT
}

# #############################################################################
#
# EXECUTE MAIN
#
# #############################################################################

[[ "${BASH_SOURCE[0]}" = "${0}" ]] && main "${@}"