# Overview

`npm run dev:up`

# What does it do?

Not yet implemented.

# What will it do?

- checks if _env.sh is present, if not, asks the user to run `cp _env.example.sh _env.sh` and fix the missing envs
- checks if db is running, if not, starts a `docker-compose up -d`
- applies db migrations
- starts dev:tsc, dev:discord, dev:express

# How does it work?

- TODO

# How should it work?

- TODO

# What is under active development?

- If all dependencies are up and running, then it will boot the system to a state
  where `dev.test.ts` passes all tests (using Mocha).
- If any dependencies are not up and running, then `dev.test.ts` will fail in a
  way that is instructs the developer what went wrong.
- What actually needs to get spun up right now?
  - postgres in a container
  - local discord bot
  - local express server
