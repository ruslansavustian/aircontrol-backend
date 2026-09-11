# Source from ~/.zshrc. Keeps the existing numeric port syntax.
tunnel() {
  if [[ -z "${1:-}" ]]; then
    echo "usage: tunnel <ssh-host> [aircontroller | controller | local_port [remote_port]]"
    return 1
  fi

  local host="$1"
  local local_port="${2:-8080}"
  local remote_port="${3:-$local_port}"
  local -a extra_options
  extra_options=()

  if [[ "$local_port" == aircontroller || "$local_port" == controller ]]; then
    if (( $# > 2 )); then
      echo "usage: tunnel <ssh-host> aircontroller"
      return 1
    fi
    if [[ "$local_port" == aircontroller ]]; then
      local_port=8082
    else
      local_port=8081
    fi
    remote_port=8081
    extra_options=(-o 'RemoteCommand=cd /root/aircontrol/backend && exec bash -l')
  fi
  if [[ "$local_port" != <1-65535> || "$remote_port" != <1-65535> ]]; then
    echo "Ports must be integers between 1 and 65535"
    return 1
  fi

  echo "Adminer: http://127.0.0.1:${local_port} (keep this terminal open)"
  ssh -o ExitOnForwardFailure=yes \
    -L "127.0.0.1:${local_port}:127.0.0.1:${remote_port}" \
    "${extra_options[@]}" "$host"
}
