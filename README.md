# Translate with ChatGpt

- [Translate with ChatGpt](#translate-with-chatgpt)
  - [Developer Environment](#developer-environment)
  - [Secrets (or Sensitive Data)](#secrets-or-sensitive-data)
  - [References](#references)

## Developer Environment

- NVM v0.36 (https://github.com/nvm-sh/nvm#installation-and-update)
  - Node LTS v18.15.0 (https://nodejs.org/en/download/)
- DIRENV v2.23.0
- YVM v4.0.1
  - YARN v3.5.0

```bash
# execute script to verify the environment
# (follow the script instructions)
.scripts/00-validate-local-env.sh

# use the latest YARN v3.x.x
yarn set version berry

# https://yarnpkg.com/features/plugins#official-plugins
yarn plugin import interactive-tools
yarn plugin import typescript
yarn plugin import workspace-tools
yarn plugin import version

# https://yarnpkg.com/getting-started/editor-sdks
yarn dlx @yarnpkg/sdks vscode
```

## Secrets (or Sensitive Data)

> RULE: keep all secrets in the `.secrets` directory.

> RULE: Use `.envrc` to load secret into the environment variable.

> RULE: secrets never left the local machine (exception CI/CD env variables).

## How to get OpenAI API key?

- OpenAI API key, see https://beta.openai.com/account/api-keys

You will need a commercial account with some credits to use the API.

## How to Run?

```bash
# install dependencies first, before running the tool
yarn install

# get tool command line help
yarn cli --help

# get tool version
yarn cli --version

# run translation
yarn cli --cwd ./packages/translate-with-chatgpt \
  --source "**/*.md" \
  --ignore "**/node_modules/**" \
  --language Swedish \
  --token ${token}

# token can be injected via environment variable $OPENAI_API_TOKEN
# token can be placed into `.secrets/openai_api_token` file and DIRENV will load it
```

## References

- https://dev.to/mxro/the-ultimate-guide-to-typescript-monorepos-5ap7
- https://github.com/TypeStrong/ts-node/issues/1709
- https://blog.ah.technology/a-guide-through-the-wild-wild-west-of-setting-up-a-mono-repo-with-typescript-lerna-and-yarn-ed6a1e5467a
- https://stackoverflow.com/questions/72380007/what-typescript-configuration-produces-output-closest-to-node-js-18-capabilities
