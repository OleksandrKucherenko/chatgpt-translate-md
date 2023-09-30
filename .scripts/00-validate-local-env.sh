#!/usr/bin/env bash
# shellcheck disable=SC2154,SC2015

# shellcheck disable=SC1091 source=_dependencies.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_dependencies.sh"

dependency bash "5.*.*" "brew install bash"
dependency curl "[78].*.*" "brew install curl"
dependency git "2.*.*" "brew install git"
dependency git-lfs "3.*.*" "brew install git-lfs"
dependency direnv "2.*.*" "curl -sfL https://direnv.net/install.sh | bash"

# NOTE: nvm is a special case, it's a shell function, it's not a regular binary or script file
__nvm_version=$(grep "nvm_echo '\(0.39.*\)" "$HOME/.nvm/nvm.sh" | sed "s/nvm_echo//g;s/'//g;s/ //g")
[[ -f "$HOME/.nvm/nvm.sh" ]] &&
  echo "Dependency [${cl_yellow}OK${cl_reset}]: \`nvm\` - version: $__nvm_version" ||
  optional nvm "0.39.*" "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash"

dependency yarn "3.5.*" "yvm list-remote && yarn set version berry"
optional node "18.*.*" "nvm install 18 --lts && nvm use 18 --lts"
dependency corepack "0.*.*" "npm install -g corepack"

# JSON query tool
dependency jq "1.6" "brew install jq"

# working with XML documents, alternative is: `yq -p=xml` or `xmllint`
optional yq "4.*.*" "brew install yq"
optional xidel "0.9.*" "brew install xidel"
optional xmllint "209*" "brew install xmlstarlet"
optional xmlstarlet "1.6.*" "brew install xmlstarlet"

# Shell scripts formatting and static analysis
optional shellcheck "0.9.*" "brew install shellcheck"
dependency shfmt "3.*.*" "curl -sS https://webinstall.dev/shfmt | bash"

# GNU versions of command line tools
dependency ggrep "3.*" "brew install grep"
dependency gsed "4.*" "brew install gnu-sed"
dependency timeout "9.*" "brew install coreutils"

# Clouds
dependency docker "24.*.*" "brew remove docker && brew install --cask docker"

# certificate generation
optional mkcert "1.4.*" "brew install mkcert"

# code-as-infrastructure tools
#dependency terraform "1.4.*" "brew install terraform"
#dependency terragrunt "0.45.*" "brew install terragrunt"
#dependency gcloud "2023.*.*" "brew install --cask google-cloud-sdk"

# Architecture Decision Records (ADRs)
optional adr "3.*.*" "brew install adr-tools" "config"

# Prevent secrets from being committed to git
dependency gitleaks "8.*.*" "brew install gitleaks" "version"
