function supportLanguages() {
  return [
    'auto', 'zh-Hans', 'zh-Hant', 'yue', 'wyw', 'en', 'ja', 'ko',
    'fr', 'de', 'es', 'it', 'ru', 'pt', 'pt-br', 'nl', 'pl', 'ar',
    'tr', 'sv', 'da', 'fi', 'no', 'cs', 'uk', 'vi', 'th', 'id', 'ms'
  ];
}

function pluginTimeoutInterval() {
  return 300;
}

function bridgeUrl() {
  return ($option.bridgeUrl || 'http://127.0.0.1:8765').replace(/\/+$/, '');
}

function serviceError(type, message, addition) {
  return { type: type, message: message, addition: addition };
}

function translate(query, completion) {
  var done = query.onCompletion || completion;

  $http.request({
    method: 'POST',
    url: bridgeUrl() + '/translate',
    header: { 'Content-Type': 'application/json' },
    body: {
      text: query.originalText || query.text,
      from: query.detectFrom || query.from,
      to: query.detectTo || query.to
    },
    timeout: 300,
    cancelSignal: query.cancelSignal,
    handler: function (response) {
      if (response.error) {
        done({ error: serviceError('network', response.error.message || '无法连接本机 Codex 桥接服务。') });
        return;
      }

      var data = response.data || {};
      if (!response.response || response.response.statusCode < 200 || response.response.statusCode >= 300) {
        done({ error: serviceError('api', data.error || 'Codex 桥接服务返回异常。', data) });
        return;
      }
      if (typeof data.text !== 'string' || !data.text) {
        done({ error: serviceError('api', 'Codex 未返回译文。', data) });
        return;
      }

      done({
        result: {
          from: query.detectFrom || query.from,
          to: query.detectTo || query.to,
          toParagraphs: [data.text]
        }
      });
    }
  });
}

function pluginValidate(completion) {
  $http.request({
    method: 'GET',
    url: bridgeUrl() + '/health',
    timeout: 30,
    handler: function (response) {
      var data = response.data || {};
      if (!response.error && response.response && response.response.statusCode === 200 && data.configured) {
        completion({ result: true });
        return;
      }

      completion({
        result: false,
        error: {
          type: response.error ? 'network' : 'param',
          message: response.error
            ? '无法连接本机 Codex 桥接服务。'
            : '桥接服务尚未选择有效模型。',
          troubleshootingLink: bridgeUrl() + '/config'
        }
      });
    }
  });
}
