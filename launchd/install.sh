#!/bin/bash

set -euo pipefail

LABEL='com.codex.bob.translate.bridge'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
BRIDGE_LOG_DIR="$HOME/Library/Logs/BobCodexTranslator"
USER_ID="$(id -u)"
SERVICE_TARGET="gui/$USER_ID/$LABEL"
NODE_BIN="$(command -v node || true)"
CODEX_BIN="$(command -v codex || true)"
PORT=8765
MAX_PORT=8864

if [[ ! -x "$NODE_BIN" ]]; then
  echo '未找到可执行的 Node.js。' >&2
  exit 1
fi
if [[ ! -x "$CODEX_BIN" ]]; then
  echo '未找到可执行的 Codex CLI。' >&2
  exit 1
fi

TEMP_PLIST="$(mktemp -t "$LABEL")"
trap 'rm -f "$TEMP_PLIST"' EXIT

launchctl bootout "$SERVICE_TARGET" >/dev/null 2>&1 || true
while /usr/sbin/lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  if (( PORT >= MAX_PORT )); then
    echo "未找到 8765–$MAX_PORT 范围内的空闲端口。" >&2
    exit 1
  fi
  PORT=$((PORT + 1))
done

cp "$SCRIPT_DIR/$LABEL.plist" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:0 $NODE_BIN" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:1 $REPO_DIR/bridge/bridge.mjs" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:BOB_CODEX_PORT $PORT" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CODEX_BIN $CODEX_BIN" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :StandardOutPath $BRIDGE_LOG_DIR/bridge.log" "$TEMP_PLIST"
/usr/libexec/PlistBuddy -c "Set :StandardErrorPath $BRIDGE_LOG_DIR/bridge.error.log" "$TEMP_PLIST"
plutil -lint "$TEMP_PLIST"

mkdir -p "$(dirname "$AGENT_PLIST")" "$BRIDGE_LOG_DIR"
install -m 0644 "$TEMP_PLIST" "$AGENT_PLIST"
launchctl bootstrap "gui/$USER_ID" "$AGENT_PLIST"
launchctl kickstart -k "$SERVICE_TARGET"

for _ in {1..10}; do
  SERVICE_STATE="$(launchctl print "$SERVICE_TARGET" 2>/dev/null || true)"
  if [[ "$SERVICE_STATE" == *'state = running'* ]] && curl -fsS "http://127.0.0.1:$PORT/ping" >/dev/null 2>&1; then
    echo "安装完成：$AGENT_PLIST"
    echo "配置地址：http://127.0.0.1:$PORT/config"
    exit 0
  fi
  sleep 1
done

echo "桥接服务启动失败，请查看 $BRIDGE_LOG_DIR/bridge.error.log" >&2
exit 1
