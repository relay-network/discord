# Overview

_Note: if you're a first-time contributor and you haven't read the
[README](README.md) and [CONTRIBUTING](CONTRIBUTING.md) files, please do so
before continuing (it could end up saving you some time)._

If you're familiar with `npm` you should be able to get up and running in no
time. Otherwise, please read the `npm` documentation or ask for help in our
Discord server.

# Getting Started

To spin up a local environment, use `npm run dev:express` and follow the trail
of error messages.

# Validating Your Changes

TODO - Implement `npm run validate`

If `npm run validate` passes, you're good to go. Please see the scripts section
below for more information.

# Scripts

TODO - Every script in `package.json` should be thoroughly documented here.

# Project Config

Basic project config is discoverable by looking up all of the `devDependencies`,
reading their documentation, reading their corresponding config files, and
understanding how they're used by scripts in the `package.json` file. The
remainder of this section will document any non-standard usage of these tools
(ideally, there will be none).

# Documentation

Documentation is written in Markdown and lives in README.md files throughout the
project. The scope of each `/x/README.md` file is `/x/**/*`. Some directories
contain a `PATTERNS.md` file (for an example, see the project-wide [patterns
file](PATTERNS.md). The scope of each `/x/PATTERNS.md` file is `/x/**/*`.

# Project Structure

The source code is organized into a few main directories. The base guiding
principle is that the code is organized according to the most relevant technical
domain. Another way to think about this is that the code is organized according to
dependency boundaries. Another way to think about this is that the code is
organized according to where its documentation lives. Here's an [architecture
diagram](https://www.figma.com/file/IZIzsMOTp5vXICrNJw8DNj/Robot-Architecture?type=whiteboard&node-id=29-180&t=GSdgyLjZyjswdNmu-4)
that shows the general structure of the codebase. The idea is that `/api`
clients are wired up with `/io` channels, `/domain` code orchestrates/composes
those channels, and then `/app` entrypoints expose them.

## /app

**What does it contain?**

The `/app` directory contains the system's executable files. The single
responsibility of these files is to declare the system's entrypoints. For
example, this is where we wire up HTTP routes.

**What is its primary responsibility?**

The primary responsibility of the `/app` directory is to provide explicit and
obvious visibility into how the system is exposed to the outside world, what it
does, and what end-to-end tests should exist.

You can think of the `/app` directory as the interface between product, ops, qa,
and application development.

**What does it import/export and where is it used?**

Files in the `/app` directory must not export anything. There are no
restrictions on what they can import.

Files in the `/app` directory are "used" by executing them.

**How is it tested?**

Files in the `/app` directory are tested with end-to-end tests. There must be a
1:1 mapping between files in the `/app` directory and `describe` blocks in the
`app.test.ts` end-to-end test file. There must also be a 1:1 mapping between the
entrypoints defined in each file and the `it` blocks in the corresponding
`describe` block.

**Where is it documented?**

The primary documentation for the `/app` directory is the `app.test.ts`
end-to-end test file and the `README.md` file in the `/app` directory.

# /api

**What does it contain?**

The `/api` directory is the central source of truth for wiring together the
various parts of the system. This is where we configure and generate API clients
(both internal and external).

**What is its primary responsibility?**

The primary responsibility of the `/api` directory is to provide explicit and
obvious visibility into how the system is wired together.

You can think of the `/api` directory as the interface between ops and
application development.

**What does it import/export and how is it used?**

The `api` should mostly import library code and should only export API clients
or factory-like functions for generating API clients.

Exported clients should only be used from inside the `/io` directory. Exported
servers should only be used from inside the `/app` directory.

**How is it tested?**

For the time being, the end-to-end tests for the `/app` directory should be
sufficient to test the `/api` code.

**Where is it documented?**

The primary documentation for code in the `/api` directory is the official
documentation for the APIs it generates clients for and wires together.

# /io

**What does it contain?**

The `/io` directory contains all code that reads or writes data. In particular,
every single read must begin in the `/io` directory and every single write must
end in the `/io` directory.

**What is its primary responsibility?**

The purpose of the `/io` directory is to provide explicit and obvious visibility
into data flowing into and out of the system and to provide a central place we
can hammer on with tests to improve our confidence in the parts of our system
that are outside the type system's reach.

**What does it import/export? and how is it used?**

The `/io` directory should only import client code from the `/api` directory and
utils from the `/util` directory. It should only export "channels". A channel
encapsulates read/write/validation for a single data source. Channels must not
import anything from other channels, channels _must always read/write a single
data source_. If you find yourself reading/writing from multiple data sources,
you should put the code into `/lib/` or `/domain`.

The idea is that higher-level domain functions will be almost entirely
compositions of channels.

**How is it tested?**

The `/io` directory should be tested with "integration" tests. In this context,
an integration test is a test that exercises a single channel. In other words,
it writes data to channels and reads data from channels. Our goal is to make
sure that invalid data is never read from a channel and that a channel never
writes invalid data.

**Where is it documented?**

Documenting each channel will be difficult as each channel will depend not only
on the API it's interacting with but also on the domain understanding of what
"valid" data is. Because of this, we will rely heavily on standard interfaces
and tests to document the `/io` directory.

# /domain

**What does it contain?**

The `/domain` directory contains everything that isn't specifically required to
be in `/api`, `/app`, or `/io`. In other words, it shouldn't include validation,
(de)serialization, read/write logic, or any other kind of unwrapped side-effect.
In practice, this should mean that the `/domain` directory contains only domain
specific logic. In terms of our specific project architecture, `/domain`
contains "multi-channel" functions that orchestrate/compose channels.

**What is its primary responsibility?**

The primary responsibility of the `/domain` directory is to not get out of
control. In other words, the most important thing is that the `/domain`
directory does not break any of the high-level invariants and patterns we're
trying to maintain.

**What does it import/export? and how is it used?**

The `/domain` directory can import anything from `/io`, `/util`, or `/lib`. We
don't want to do cross-domain imports (imports from other `/domain/*`
directories), but we probably won't be able to avoid it. The most important
thing is that `/domain` code is never imported by anything outside of `/domain`
or `/app`.

**How is it tested?**

For the most part, end-to-end tests against the system's `/app` entrypoints and
integration tests against the `/io` channels should be sufficient to test the
`/domain` directory. We will also need to write tests that help us verify that
certain high-level patterns are being followed (we might use language models for
this).

**Where is it documented?**

The vast majority of the project's documentation should live in the `/domain`
directory. The documentation in the `/domain` directory describes the
non-commodity parts of the system. In other words, it describes the important
technical knowledge that is specific to our application.

# /lib

**What does it contain?**

The `/lib` directory is very similar to the `/domain` directory in that they
both contain multi-channel functions. The difference is that the `/lib`
directory contains functions that are not specific to our application. A good
example of something that could go in the `/lib` directory is a function that
writes logs whenever another channel is written to.

**What is its primary responsibility?**

The primary responsibility of the `/lib` directory is to provide a place for multi-channel functions that are not specific to our application.

**What does it import/export? and how is it used?**

The `/lib` directory can import anything from `/io` or `util`. We don't want to
do cross-lib imports (imports from other `/lib/*` directories), but we probably
won't be able to avoid it. The most important thing is that `/lib` code is never
imported by anything outside of `/domain` or `/app`.

**How is it tested?**

For the most part, end-to-end tests against the system's `/app` entrypoints and
integration tests against the `/io` channels should be sufficient to test the
`/domain` directory. We will also need to write tests that help us verify that
certain high-level patterns are being followed (we might use language models for
this).

**Where is it documented?**

There probably won't be a ton of documentation in the `/lib` directory. The
documentation that does exist should focus on explaining why the code exists.

# /util

**What does it contain?**

The `/util` directory contains side-effect free code.

**What is its primary responsibility?**

The primary responsibility of the `/util` directory is to improve readability by
extracting common patterns into clearly-named functions almost entirely
guaranteed by the type system.

**What does it import/export? and how is it used?**

Pure functions.

**How is it tested?**

For the most part, we won't test code in the `/util` directory. If we have to,
unit tests are fine.

**Where is it documented?**

For the most part, we won't worry about documenting code in the `/util` directory.


# Docker Deployment
Docker compose is used to create a docker cluster of the services needed to run the application. The cluster consists of the following services:
- **express**: The main application service. This service is responsible for serving the frontend and backend of the application.
- **discord**: Webhhoks around the discord API with allow us to use discord as our Human in the Loop service.
- **canary**: A testing service to insure uptime with our other services.
- **db**: A postgres database. Currently the only unique things about this database is that it needs the vector extension installed. This is currently done throughh prisma.

## Running the cluster
To run the cluster, you need to have docker and docker-compose installed. Then you can run the following command:
```bash
npm run dev:up
```
This will build the docker images and start the cluster. The first time you run this command it will take a while to build the images. After that, it should be much faster.
Depending on the state of your database you may need to run migrations. You can do this with the following command:
```bash
npx prisma generate
npx prisma migrate dev 
npm run db:seed
```

## Try it out!
This will generate the prisma client, run any migrations, and seed the database with the prompts.
To start the etl process you can run the following curl command:
```bash
curl -X POST \
  'http://localhost:3000/etl-start' \
  -H 'Content-Type: application/json' \
  -d '{"fromUrl": "https://endgame.makerdao.com","limit":500,"blacklist": [],"whitelist": []}'
```
This will start the etl process. To check the current status of the etl process you can visit http://localhost:3000/etl-queues in your broswer. Once the etl process is complete you can try asking a question. Here is a curl command to try out asking a question:
```bash
 curl -X POST \
  'http://localhost:3000/ask' \
  -H 'Content-Type: application/json' \
  -d '{"question": "How is The Maker Constitution designed to safeguard the interests of MKR holders?"}'
```
