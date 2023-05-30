#!/usr/bin/env bash
# shellcheck disable=SC2155,SC2034,SC2059

# get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# is allowed to use macOS extensions (script can be executed in *nix environment)
use_macos_extensions=false
if [[ "$OSTYPE" == "darwin"* ]]; then use_macos_extensions=true; fi

# colors
export cl_reset=$(tput sgr0)

export cl_red=$(tput setaf 1)
export cl_green=$(tput setaf 2)
export cl_yellow=$(tput setaf 3)
export cl_blue=$(tput setaf 4)
export cl_purple=$(tput setaf 5)
export cl_cyan=$(tput setaf 6)
export cl_white=$(tput setaf 7)
export cl_grey=$(tput setaf 8)

export cl_lred=$(tput setaf 9)
export cl_lgreen=$(tput setaf 10)
export cl_lyellow=$(tput setaf 11)
export cl_lblue=$(tput setaf 12)
export cl_lpurple=$(tput setaf 13)
export cl_lcyan=$(tput setaf 14)
export cl_lwhite=$(tput setaf 15)
export cl_black=$(tput setaf 16)

# shellcheck disable=SC1090 source=_logger.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_logger.sh"
# register own logger
logger common "$@"

function now() {
  echo "$EPOCHREALTIME" # <~ bash 5.0
  #python -c 'import datetime; print datetime.datetime.now().strftime("%s.%f")'
}

# shellcheck disable=SC2155,SC2086
function print_time_diff() {
  local diff="$(now) - $1"
  bc <<<$diff
}

# shellcheck disable=SC2086
function validate_input() {
  local variable=$1
  local default=${2:-""}
  local prompt=${3:-""}
  local user_in=""

  # Ctrl+C during read operation force error exit
  trap 'exit 1' SIGINT

  # execute at least once
  while :; do
    # allow macOs read command extension usage (default value -i)
    if $use_macos_extensions; then
      [[ -z "${prompt// /}" ]] || read -e -i "${default}" -p "${cl_purple}? ${cl_reset}${prompt}${cl_blue}" -r user_in
      [[ -n "${prompt// /}" ]] || read -e -i "${default}" -r user_in
    else
      [[ -z "${prompt// /}" ]] || echo "${cl_purple}? ${cl_reset}${prompt}${cl_blue}"
      read -r user_in
    fi
    printf "${cl_reset}"
    [[ -z "${user_in// /}" ]] || break
  done

  local __resultvar=$variable
  eval $__resultvar="'$user_in'"
}

# shellcheck disable=SC2086,SC2059
function validate_yn_input() {
  local variable=$1
  local default=${2:-""}
  local prompt=${3:-""}
  local user_in=false

  while true; do
    if $use_macos_extensions; then
      [[ -z "${prompt// /}" ]] || read -e -i "${default}" -p "${cl_purple}? ${cl_reset}${prompt}${cl_blue}" -r yn
      [[ -n "${prompt// /}" ]] || read -e -i "${default}" -r yn
    else
      [[ -z "${prompt// /}" ]] || echo "${cl_purple}? ${cl_reset}${prompt}${cl_blue}"
      read -r yn
    fi
    printf "${cl_reset}"
    case $yn in
    [Yy]*)
      user_in=true
      break
      ;;
    [Nn]*)
      user_in=false
      break
      ;;
    *)
      user_in=false
      break
      ;;
    esac
  done
  local __resultvar=$variable
  eval $__resultvar="$user_in"
}

# shellcheck disable=SC2086
function env_variable_or_secret_file() {
  #
  # Usage:
  #     env_variable_or_secret_file "new_value" \
  #       "GITLAB_CI_INTEGRATION_TEST" \
  #       ".secrets/gitlab_ci_integration_test" \
  #       "{user friendly message}"
  #
  local name=$1
  local variable=$2
  local file=$3
  local fallback=${4:-"No hints, check the documentation"}
  local __result=$name

  if [[ -z "${!variable}" ]]; then
    if [[ ! -f "$file" ]]; then
      echo ""
      echo "${cl_red}ERROR:${cl_reset} shell environment variable '\$$variable' or file '$file' should be provided"
      echo ""
      echo "Hint:"
      echo "  $fallback"
      exit 1
    else
      echo "Using file: ${cl_green}$file${cl_reset} ~> $name"
      eval $__result="'$(cat $file)'"
    fi
  else
    echo "Using var : ${cl_green}\$$variable${cl_reset} ~> $name"
    eval $__result="'${!variable}'"
  fi
}

# shellcheck disable=SC2086
function optional_env_variable_or_secret_file() {
  #
  # Usage:
  #     optional_env_variable_or_secret_file "new_value" \
  #       "GITLAB_CI_INTEGRATION_TEST" \
  #       ".secrets/gitlab_ci_integration_test"
  #
  local name=$1
  local variable=$2
  local file=$3
  local __result=$name

  if [[ -z "${!variable}" ]]; then
    if [[ ! -f "$file" ]]; then
      # NO variable, NO file
      echo "${cl_yellow}Note:${cl_reset} shell environment variable '\$$variable' or file '$file' can be provided."
      return 0
    else
      echo "Using file: ${cl_green}$file${cl_reset} ~> $name"
      eval $__result="'$(cat $file)'"
      return 2
    fi
  else
    echo "Using var : ${cl_green}\$$variable${cl_reset} ~> $name"
    eval $__result="'${!variable}'"
    return 1
  fi
}

function isHelp() {
  local args=("$@")
  if [[ "${args[*]}" =~ "--help" ]]; then echo true; else echo false; fi
}

# array of script arguments cleaned from flags (e.g. --help)
export ARGS_NO_FLAGS=()
function exclude_flags_from_args() {
  local args=("$@")

  # remove all flags from call
  for i in "${!args[@]}"; do
    if [[ ${args[i]} == --* ]]; then unset 'args[i]'; fi
  done

  echoCommon "${cl_grey}Filtered args:" "$@" "~>" "${args[*]}" "$cl_reset" >&2

  ARGS_NO_FLAGS=($(echo "${args[*]}"))
}

exclude_flags_from_args "$@"
