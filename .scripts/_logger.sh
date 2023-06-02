#!/usr/bin/env bash
# shellcheck disable=SC2155,SC2034,SC2059

# get script directory
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#
# Register debug logger functions that are controlled by DEBUG= environment variable
#
function logger() {
    #
    # Usage:
    #   source "$SCRIPT_DIR/commons.sh" && logger tag "$@"
    #   echoTag "print only if DEBUG=tag is set"
    #   printfTag "print only if DEBUG=tag is set %s" "something"
    #
    local tag=${1}
    local Suffix=${1^}

    # keep it disabled by default
    declare -g -A TAGS && TAGS+=([$tag]=0)

    # declare logger functions
    eval "$(
        cat <<EOF
        #
        # begin
        #
        function echo${Suffix}() {
        [[ "\${TAGS[$tag]}" == "1" ]] && builtin echo "\$@"
        }

        function printf${Suffix}() {
        [[ "\${TAGS[$tag]}" == "1" ]] && builtin printf "\$@"
        }

        function configDebug${Suffix}() {
        local args=("\$@")
        IFS="," read -r -a tags <<<\$(echo "\$DEBUG")
        [[ "\${args[*]}" =~ "--debug" ]] && TAGS+=([$tag]=1)
        [[ "\${tags[*]}" =~ "$tag" ]] && TAGS+=([$tag]=1)
        [[ "\${tags[*]}" =~ "*" ]] && TAGS+=([$tag]=1)
        # builtin echo "done! \${!TAGS[@]} \${TAGS[@]}"
        }
        #
        # end
        #
EOF
    )"

    # configure logger
    eval "configDebug${Suffix}" "$@"

    # dump created loggers
    [[ "$tag" != "common" ]] && eval "echoCommon \"${cl_grey}Logger tags  :\" \"\${!TAGS[@]}\" \"|\" \"\${TAGS[@]}\" \"${cl_reset}\"" 2>/dev/null
}
