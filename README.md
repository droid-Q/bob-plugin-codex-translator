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

1. 打开桥接服务输出的配置地址，刷新模型列表、选择模型并保存。
2. 从 [Releases](https://github.com/droid-Q/bob-plugin-codex-translator/releases/latest) 下载并双击翻译与 OCR 两个 `.bobplugin` 文件。
3. 在 Bob 的「文本翻译」服务中添加「Codex 本机翻译」，在「文本识别」服务中添加「Codex 本机 OCR」。

插件默认连接 `http://127.0.0.1:8765`。如果通过 `BOB_CODEX_PORT` 修改端口，也要同步修改 Bob 插件设置中的桥接地址。

## 使用 launchd 常驻运行

```bash
./launchd/install.sh
```

如果端口被占用，脚本会自动选择后续空闲端口，Bob 插件会自动发现桥接服务。

## 开发验证

```bash
node --test test/bridge.test.mjs
```

重新打包：

```bash
mkdir -p dist
zip -j dist/codex-local-translator.bobplugin plugin/info.json plugin/main.js
zip -j dist/codex-local-ocr.bobplugin ocr-plugin/info.json plugin/main.js
```
