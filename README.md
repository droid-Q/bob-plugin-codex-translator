# Bob Codex 本机翻译插件

Bob 插件运行在 JavaScriptCore 中，不能直接启动本机进程。本项目用一个仅监听 `127.0.0.1` 的 Node.js 桥接服务调用 Codex CLI：

- `codex debug models` 获取当前账号可见模型。
- `codex exec --ephemeral --sandbox read-only` 完成翻译。
- Bob 插件通过本机 HTTP 调用桥接服务。

## 使用

要求：Bob 1.8.0+、Node.js 18+，以及已安装并登录的 Codex CLI。

```bash
git clone git@github.com:droid-Q/bob-plugin-codex-translator.git
cd bob-plugin-codex-translator
node bridge/bridge.mjs
```

保持服务运行，然后：

1. 打开 <http://127.0.0.1:8765/config>，刷新模型列表、选择模型并保存。
2. 从 [Releases](https://github.com/droid-Q/bob-plugin-codex-translator/releases/latest) 下载并双击 `.bobplugin` 文件。
3. 在 Bob 的「偏好设置 → 服务 → 文本翻译」中添加「Codex 本机翻译」。

插件默认连接 `http://127.0.0.1:8765`。如果通过 `BOB_CODEX_PORT` 修改端口，也要同步修改 Bob 插件设置中的桥接地址。

## 使用 launchd 常驻运行

在仓库根目录执行：

```bash
AGENT_PLIST="$HOME/Library/LaunchAgents/com.codex.bob.translate.bridge.plist"
BRIDGE_LOG_DIR="$HOME/Library/Logs/BobCodexTranslator"
REPO_DIR="$(pwd)"
NODE_BIN="$(command -v node)"
CODEX_BIN="$(command -v codex)"

mkdir -p "$HOME/Library/LaunchAgents" "$BRIDGE_LOG_DIR"
cp launchd/com.codex.bob.translate.bridge.plist "$AGENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:0 $NODE_BIN" "$AGENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:1 $REPO_DIR/bridge/bridge.mjs" "$AGENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CODEX_BIN $CODEX_BIN" "$AGENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :StandardOutPath $BRIDGE_LOG_DIR/bridge.log" "$AGENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :StandardErrorPath $BRIDGE_LOG_DIR/bridge.error.log" "$AGENT_PLIST"
plutil -lint "$AGENT_PLIST"
launchctl bootout "gui/$(id -u)/com.codex.bob.translate.bridge" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENT_PLIST"
launchctl kickstart -k "gui/$(id -u)/com.codex.bob.translate.bridge"
curl -fsS http://127.0.0.1:8765/health
```

## 开发验证

```bash
node --test test/bridge.test.mjs
```

重新打包：

```bash
mkdir -p dist
zip -j dist/codex-local-translator.bobplugin plugin/info.json plugin/main.js
```
