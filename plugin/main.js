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

var BRIDGE_SERVICE = 'bob-codex-translator';
var activeBridgeUrl;

function bridgeUrl() {
  return ($option.bridgeUrl || 'http://127.0.0.1:8765').replace(/\/+$/, '');
}

function bridgeCandidates() {
  var configured = bridgeUrl();
  var candidates = [];

  function add(candidate) {
    if (candidates.indexOf(candidate) === -1) candidates.push(candidate);
  }

  if (activeBridgeUrl) add(activeBridgeUrl);
  add(configured);

  var local = configured.match(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  if (local) {
    for (var port = 8765; port <= 8864; port += 1) {
      add('http://' + local[1] + ':' + port);
    }
  }

  return candidates;
}

function discoverBridge(completion) {
  var candidates = bridgeCandidates();
  var index = 0;

  function next() {
    if (index >= candidates.length) {
      activeBridgeUrl = null;
      completion(null);
      return;
    }

    var candidate = candidates[index];
    index += 1;
    $http.request({
      method: 'GET',
      url: candidate + '/ping',
      timeout: 2,
      handler: function (response) {
        var data = response.data || {};
        if (!response.error
          && response.response
          && response.response.statusCode === 200
          && data.service === BRIDGE_SERVICE) {
          activeBridgeUrl = candidate;
          completion(candidate);
          return;
        }
        next();
      }
    });
  }

  next();
}

function serviceError(type, message, addition) {
  return { type: type, message: message, addition: addition };
}

function translate(query, completion) {
  var done = query.onCompletion || completion;

  discoverBridge(function (url) {
    if (!url) {
      done({ error: serviceError('network', '无法连接本机 Codex 桥接服务。') });
      return;
    }

    $http.request({
      method: 'POST',
      url: url + '/translate',
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
          activeBridgeUrl = null;
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
  });
}

function pluginValidate(completion) {
  discoverBridge(function (url) {
    if (!url) {
      completion({
        result: false,
        error: {
          type: 'network',
          message: '无法连接本机 Codex 桥接服务。',
          troubleshootingLink: 'https://github.com/droid-Q/bob-plugin-codex-translator/blob/main/README.md#使用'
        }
      });
      return;
    }

    $http.request({
      method: 'GET',
      url: url + '/health',
      timeout: 30,
      handler: function (response) {
        var data = response.data || {};
        if (!response.error
          && response.response
          && response.response.statusCode === 200
          && data.service === BRIDGE_SERVICE
          && data.configured) {
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
            troubleshootingLink: 'https://github.com/droid-Q/bob-plugin-codex-translator/blob/main/README.md#使用'
          }
        });
      }
    });
  });
}
