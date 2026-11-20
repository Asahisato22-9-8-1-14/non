/* StudyX AI chat — the only part of the app that talks to the network.
 *
 * Build flavours
 *  - offline APK : this file is not bundled, no key UI, no network at all.
 *  - AI APK      : same parchment interface plus this tab. The user's own API
 *                  key is stored on the device (localStorage) and every request
 *                  is sent straight from the phone to the provider they chose.
 *
 * On Android the Capacitor native HTTP bridge performs `fetch`, so provider
 * CORS rules (OpenAI blocks browsers, for example) do not apply. When this file
 * is opened in a plain web view/browser it falls back to the browser's fetch,
 * where Groq, Gemini and OpenRouter work directly.
 *
 * No streaming: the whole reply arrives in one JSON response, which keeps the
 * request simple and works identically through the native bridge.
 */
(function () {
  "use strict";

  var KEY = "ml.ai.v1";              // { connections: [...], activeId }
  var MAX = 5;                        // 1–5 providers, same rule as the web app
  var MIN = 1;
  var AI_BUILD = true;                // rewritten to false for the offline build
  var HOST = window.StudyXChat;       // the offline app's helpers

  var PROVIDERS = [
    { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", hint: "sk-...", url: "https://platform.openai.com/api-keys" },
    { id: "anthropic", label: "Anthropic Claude", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5", hint: "sk-ant-...", url: "https://console.anthropic.com/settings/keys" },
    { id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash", hint: "AIza...", url: "https://aistudio.google.com/app/apikey" },
    { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", hint: "sk-or-...", url: "https://openrouter.ai/keys" },
    { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", hint: "gsk_...", url: "https://console.groq.com/keys" },
    { id: "perplexity", label: "Perplexity", baseUrl: "https://api.perplexity.ai", model: "sonar", hint: "pplx-...", url: "https://www.perplexity.ai/settings/api" },
    { id: "custom", label: "Custom (OpenAI-compatible)", baseUrl: "", model: "", hint: "Your API key" }
  ];

  var SUGGESTIONS = [
    ["Explain simply", "Explain this concept simply, then ask me one question to check I understood: "],
    ["Quiz me", "Quiz me with 5 questions on this topic, one at a time. Wait for my answer before the next."],
    ["Make flashcards", "Turn this material into 8 flashcards as Q: … / A: … pairs, one atomic idea each: "],
    ["Study plan", "Help me build a 1-week study plan for: "]
  ];

  var SYSTEM = "You are StudyX's study assistant, helping a student learn deeply rather than cram.\n" +
    "- Explain ideas clearly, starting from the big picture and building to detail.\n" +
    "- Prefer understanding (why/how, relationships between concepts) over rote facts.\n" +
    "- When useful, check understanding with a short question or suggest active recall.\n" +
    "- When asked for flashcards, write them as \"Q: … / A: …\" pairs, one atomic idea each.\n" +
    "- Be concise. Plain text with short paragraphs and hyphen lists; no tables.";

  function preset(id) {
    for (var i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === id) return PROVIDERS[i];
    return PROVIDERS[PROVIDERS.length - 1];
  }
  function uid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function mask(key) {
    if (!key) return "";
    if (key.length <= 10) return "••••••";
    return key.slice(0, 5) + "••••" + key.slice(-4);
  }
  function store() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  /* ------------------------------- state ------------------------------- */
  function load() {
    var s = store();
    var out = { connections: [], activeId: null };
    if (!s) return out;
    try {
      var raw = JSON.parse(s.getItem(KEY) || "null");
      if (!raw) return out;
      // Tolerate the single-connection shape written by early builds.
      var list = Array.isArray(raw.connections) ? raw.connections : (raw.apiKey ? [raw] : []);
      out.connections = list.filter(function (c) { return c && c.apiKey; }).slice(0, MAX).map(function (c) {
        var p = preset(c.provider);
        return {
          id: c.id || uid(),
          provider: c.provider || "openai",
          label: c.label || p.label,
          baseUrl: c.baseUrl || p.baseUrl,
          model: c.model || p.model,
          apiKey: c.apiKey
        };
      });
      out.activeId = raw.activeId && out.connections.some(function (c) { return c.id === raw.activeId; })
        ? raw.activeId
        : (out.connections[0] ? out.connections[0].id : null);
    } catch (e) { /* corrupt storage — start clean */ }
    return out;
  }
  function persist() {
    var s = store();
    if (!s) return;
    try { s.setItem(KEY, JSON.stringify(ai)); } catch (e) { /* quota / private mode */ }
  }
  var ai = load();

  function active() {
    for (var i = 0; i < ai.connections.length; i++) if (ai.connections[i].id === ai.activeId) return ai.connections[i];
    return ai.connections[0] || null;
  }
  function isConfigured() { return ai.connections.length >= MIN; }

  /* ------------------------------ transport ---------------------------- */
  // The native bridge ignores CORS. In a browser, OpenAI/Anthropic reject
  // cross-origin requests, so the error copy below explains that case.
  function transport(url, init) {
    return window.fetch(url, init);
  }

  function completionsUrl(baseUrl) {
    return String(baseUrl || "").trim().replace(/\/+$/, "") + "/chat/completions";
  }

  function friendlyError(status, body) {
    var detail = "";
    try {
      var j = typeof body === "string" ? JSON.parse(body) : body;
      var err = Array.isArray(j) ? (j[0] && j[0].error) : (j && j.error);
      detail = (typeof err === "string" ? err : (err && err.message)) || (j && j.message) || "";
      if (typeof detail === "string") detail = detail.slice(0, 300);
    } catch (e) { detail = String(body || "").slice(0, 300); }
    var prefix =
      status === 401 || status === 403 ? "The API key was rejected" :
      status === 404 ? "Model or endpoint not found — check the base URL and model" :
      status === 429 ? "Rate limit or quota exceeded" :
      "Provider error (" + status + ")";
    return detail ? prefix + " — " + detail : prefix;
  }

  function ask(connection, messages) {
    var body = { model: connection.model, messages: messages, stream: false };
    if (connection.provider === "anthropic") body.max_tokens = 4096;
    var headers = { "Content-Type": "application/json", Authorization: "Bearer " + connection.apiKey };
    if (connection.provider === "openrouter") { headers["X-Title"] = "StudyX"; }

    return transport(completionsUrl(connection.baseUrl), {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw new Error(friendlyError(res.status, text));
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("The provider returned an unexpected response."); }
        var reply = data && data.choices && data.choices[0] && data.choices[0].message &&
          data.choices[0].message.content;
        if (!reply) throw new Error("The provider returned an empty reply.");
        return { text: String(reply), model: (data && data.model) || connection.model };
      });
    }).catch(function (err) {
      var msg = err && err.message ? err.message : "network error";
      if (/failed to fetch|network request failed|cors|load failed/i.test(msg)) {
        msg = "Could not reach " + preset(connection.provider).label +
          ". Check your internet connection and the base URL. (Browsers block OpenAI/Anthropic " +
          "cross-origin calls; the Android APK does not.)";
      }
      throw new Error(msg);
    });
  }

  /* ------------------------------- chat UI ----------------------------- */
  var chat = (function () {
    try {
      var s = store();
      return JSON.parse(s.getItem("ml.ai.chat.v1") || "null") || { messages: [], title: "New chat" };
    } catch (e) { return { messages: [], title: "New chat" }; }
  })();
  function saveChat() {
    var s = store();
    if (!s) return;
    try { s.setItem("ml.ai.chat.v1", JSON.stringify({ messages: chat.messages.slice(-40), title: chat.title })); } catch (e) {}
  }

  var ui = {
    tab: "chat",            // chat | keys
    busy: false,
    error: null,
    editing: null,          // connection id being edited
    adding: false,
    provider: "openai",
    label: "",
    baseUrl: preset("openai").baseUrl,
    model: preset("openai").model,
    apiKey: "",
    advanced: false,       // preset model/base URL overrides, hidden by default
    test: null,
    pending: null
  };

  function escChat(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderKeys() {
    var out = [];
    out.push('<p class="small muted" style="margin-top:0">' + ai.connections.length + ' of ' + MAX +
      ' connected. You can save 1 to ' + MAX + ' providers and switch which one chat uses.</p>');

    if (ai.connections.length) {
      out.push('<div class="list" style="margin-top:10px">');
      ai.connections.forEach(function (c, i) {
        var isActive = c.id === ai.activeId;
        out.push('<div class="card card-pad" style="margin:8px 0">');
        out.push('<div class="flex" style="align-items:flex-start;gap:10px">');
        out.push('<div style="min-width:0;flex:1">');
        out.push('<strong>' + (i + 1) + '. ' + escChat(c.label) + '</strong>' +
          (isActive ? ' <span class="pill is-active">in use</span>' : ''));
        out.push('<div class="small muted" style="margin-top:2px">' + escChat(preset(c.provider).label) +
          ' · ' + escChat(c.model) + '<br><code>' + escChat(mask(c.apiKey)) + '</code></div>');
        out.push('</div></div>');
        out.push('<div class="flex" style="margin-top:10px;flex-wrap:wrap;gap:6px">');
        if (!isActive) out.push('<button class="btn btn-sm" data-action="ai-use" data-id="' + escChat(c.id) + '">Use for chat</button>');
        out.push('<button class="btn btn-sm" data-action="ai-edit" data-id="' + escChat(c.id) + '">Edit</button>');
        out.push('<button class="btn btn-sm" data-action="ai-test-saved" data-id="' + escChat(c.id) + '">Test</button>');
        out.push('<button class="btn btn-sm btn-danger" data-action="ai-remove" data-id="' + escChat(c.id) + '">Remove</button>');
        out.push('</div></div>');
      });
      out.push('</div>');
    } else {
      out.push('<div class="card card-pad" style="margin-top:10px"><p class="small muted" style="margin:0">' +
        'No key yet. Add OpenAI, Claude, Gemini, OpenRouter, Groq, Perplexity or any OpenAI-compatible endpoint below. ' +
        'Until one is added the rest of StudyX still works completely offline.</p></div>');
    }

    var atLimit = ai.connections.length >= MAX;
    if (ui.adding || ui.editing) {
      var p = preset(ui.provider);
      out.push('<h2 class="section-title">' + (ui.editing ? "Edit connection" : "Add a provider") + '</h2>');
      out.push('<form data-form="ai-save" class="card card-pad">');
      out.push('<div class="field"><label for="ai-provider">Provider</label><select id="ai-provider" name="provider">');
      PROVIDERS.forEach(function (x) {
        out.push('<option value="' + x.id + '"' + (ui.provider === x.id ? " selected" : "") + '>' + escChat(x.label) + '</option>');
      });
      out.push('</select></div>');
      // Only two things are required: a name is optional, the API key is not.
      // The preset already knows the model and every base URL, so those live
      // behind "Advanced" for people using a proxy or a different model.
      out.push('<div class="field"><label for="ai-label">Name <span class="small muted">(optional)</span></label>' +
        '<input id="ai-label" name="label" value="' + escChat(ui.label) + '" placeholder="' +
        escChat(p.label) + '" autocapitalize="words" maxlength="40"></div>');
      out.push('<div class="field"><label for="ai-key">API key</label>' +
        '<input id="ai-key" name="apiKey" type="password" value="' + escChat(ui.apiKey) + '" placeholder="' +
        escChat(ui.editing ? "Saved key kept if left blank" : p.hint) + '" autocomplete="off" spellcheck="false" required></div>');
      if (p.url) out.push('<p class="small muted" style="margin:-6px 0 12px">Get a key: <a href="' + p.url + '" target="_blank" rel="noopener">' + p.url.replace(/^https:\/\//, "") + '</a></p>');

      out.push('<p class="small" style="margin:0 0 10px">Model <code>' + escChat(p.model || "set below") +
        '</code> · URL <code>' + escChat(p.baseUrl || "set below") + '</code> ' +
        '<button class="link-btn" type="button" data-action="ai-advanced">' +
        (ui.advanced ? "Hide advanced" : "Change") + '</button></p>');
      if (ui.advanced) {
        out.push('<div class="field"><label for="ai-model">Model</label>' +
          '<input id="ai-model" name="model" value="' + escChat(ui.model) + '" placeholder="' + escChat(p.model) + '" spellcheck="false"></div>');
        out.push('<div class="field"><label for="ai-url">Base URL <span class="small muted">(only for a proxy or self-hosted API)</span></label>' +
          '<input id="ai-url" name="baseUrl" value="' + escChat(ui.baseUrl) + '" placeholder="' + escChat(p.baseUrl) + '" spellcheck="false" inputmode="url"></div>');
      }
      out.push('<p class="small muted" style="margin-top:2px">The key is saved only on this device. It is sent straight to this provider — no StudyX server sees it.</p>');
      out.push('<div class="form-actions">');
      out.push('<button class="btn btn-primary" type="submit">' + (ui.editing ? "Save changes" : "Connect") + '</button>');
      out.push('<button class="btn" type="button" data-action="ai-cancel-edit">Cancel</button>');
      out.push('</div></form>');
    } else if (!atLimit) {
      out.push('<div class="form-actions" style="margin-top:14px">' +
        '<button class="btn btn-primary" data-action="ai-add">Add provider (' + ai.connections.length + '/' + MAX + ')</button>' +
        (isConfigured() ? '' : '<button class="btn" data-action="ai-tab" data-tab="chat">Open chat</button>') +
        '</div>');
    } else {
      out.push('<p class="small muted" style="margin-top:12px">Limit reached — ' + MAX +
        ' connections saved. Remove one to add another.</p>');
    }

    if (ui.test) {
      out.push('<div class="card card-pad" style="margin-top:12px;border-color:' + (ui.test.ok ? "var(--mint)" : "var(--rose)") + '">' +
        '<strong class="small" style="color:' + (ui.test.ok ? "var(--mint)" : "var(--rose)") + '">' +
        (ui.test.ok ? "Connection works" : "Connection failed") + '</strong>' +
        '<p class="small muted" style="margin:6px 0 0">' + escChat(ui.test.text) + '</p></div>');
    }

    out.push('<h2 class="section-title">How this build works</h2>');
    out.push('<div class="card card-pad"><ul class="small muted" style="margin:0">' +
      '<li>• StudyX opens offline — every step, map, note and flashcard is bundled in the APK.</li>' +
      '<li>• Only the AI Chat tab needs internet: it calls the provider whose key you added.</li>' +
      '<li>• The separate offline-only APK has no Chat tab and never touches the network.</li>' +
      '<li>• Keys stay on this device in app storage; clear them with Remove above.</li>' +
      '</ul></div>');
    return out.join("");
  }

  function bubbles() {
    var out = [];
    if (!chat.messages.length) {
      out.push('<div class="card card-pad" style="margin-top:12px"><h3 style="margin:0 0 6px">Ask StudyX</h3>' +
        '<p class="small muted" style="margin:0 0 12px">Your key stays on this device. AI replies are not study content — check anything important.</p>' +
        '<div class="flex" style="flex-wrap:wrap;gap:6px">');
      SUGGESTIONS.forEach(function (s, i) {
        out.push('<button class="btn btn-sm" data-action="ai-suggest" data-i="' + i + '">' + escChat(s[0]) + '</button>');
      });
      out.push('</div></div>');
    }
    chat.messages.forEach(function (m) {
      var mine = m.role === "user";
      out.push('<div class="chat-row' + (mine ? " is-mine" : "") + '">' +
        '<div class="chat-bubble' + (mine ? " is-mine" : "") + '">' +
        '<div class="small">' + escChat(m.content) + '</div></div></div>');
    });
    if (ui.busy) {
      out.push('<div class="chat-row"><div class="chat-bubble"><span class="small muted">Thinking…</span></div></div>');
    }
    if (ui.error) {
      out.push('<div class="card card-pad chat-error">' +
        '<strong class="small">Request failed</strong>' +
        '<p class="small muted" style="margin:6px 0 0">' + escChat(ui.error) + '</p></div>');
    }
    return out.join("");
  }

  function render() {
    var a = active();
    var out = [];
    out.push('<div class="page-head"><p class="eyebrow">AI</p><h1 class="h1">AI Chat</h1>');
    out.push('<p class="lede">' + (isConfigured()
      ? escChat(preset(a.provider).label) + " · " + escChat(a.model) + " · key " + escChat(mask(a.apiKey))
      : "Add your own API key to chat. Everything else in StudyX keeps working offline.") + '</p></div>');

    out.push('<div class="pill-row" style="margin-bottom:12px">');
    out.push('<button class="pill' + (ui.tab === "chat" ? " is-active" : "") + '" data-action="ai-tab" data-tab="chat">Chat</button>');
    out.push('<button class="pill' + (ui.tab === "keys" ? " is-active" : "") + '" data-action="ai-tab" data-tab="keys">Providers (' + ai.connections.length + "/" + MAX + ')</button>');
    out.push('</div>');

    if (ui.tab === "keys") {
      out.push(renderKeys());
      return out.join("");
    }

    if (!isConfigured()) {
      out.push('<div class="card card-pad"><h3 style="margin:0 0 6px">Connect 1 to ' + MAX + ' providers</h3>' +
        '<p class="small muted" style="margin:0 0 12px">OpenAI, Claude, Gemini, OpenRouter, Groq or any OpenAI-compatible endpoint. ' +
        'Add your key and the chat unlocks; the offline parts of StudyX never use it.</p>' +
        '<div class="form-actions"><button class="btn btn-primary" data-action="ai-add">Add API key</button></div></div>');
      return out.join("");
    }

    out.push(bubbles());
    out.push('<form data-form="ai-send" class="card card-pad" style="margin-top:14px">');
    if (ai.connections.length > 1) {
      out.push('<div class="field"><label for="ai-active">Answer with</label><select id="ai-active" data-action="ai-switch">');
      ai.connections.forEach(function (c) {
        out.push('<option value="' + escChat(c.id) + '"' + (c.id === ai.activeId ? " selected" : "") + '>' + escChat(c.label) + '</option>');
      });
      out.push('</select></div>');
    }
    out.push('<div class="field"><label for="ai-msg">Message</label>' +
      '<textarea id="ai-msg" name="message" required rows="3" placeholder="Ask about a concept, request a quiz, turn notes into flashcards…"></textarea></div>');
    out.push('<div class="form-actions">' +
      '<button class="btn btn-primary" type="submit"' + (ui.busy ? " disabled" : "") + '>' + (ui.busy ? "Thinking…" : "Send") + '</button>' +
      (chat.messages.length ? '<button class="btn" type="button" data-action="ai-clear-chat">Clear chat</button>' : '') +
      '</div></form>');
    return out.join("");
  }

  /* -------------------------- actions from the app --------------------- */
  function refreshFromForm(form) {
    if (form.querySelector('[name="provider"]')) ui.provider = form.querySelector('[name="provider"]').value;
    if (form.querySelector('[name="label"]')) ui.label = form.querySelector('[name="label"]').value;
    if (form.querySelector('[name="baseUrl"]')) ui.baseUrl = form.querySelector('[name="baseUrl"]').value;
    if (form.querySelector('[name="model"]')) ui.model = form.querySelector('[name="model"]').value;
    if (form.querySelector('[name="apiKey"]')) ui.apiKey = form.querySelector('[name="apiKey"]').value;
  }

  function startAdd() {
    ui.tab = "keys";               // the form lives on the Providers tab
    ui.adding = true; ui.editing = null; ui.test = null;
    ui.provider = "openai"; ui.label = ""; ui.apiKey = ""; ui.advanced = false;
    ui.baseUrl = preset("openai").baseUrl; ui.model = preset("openai").model;
    HOST.renderKeep();
  }
  function startEdit(id) {
    var c = null;
    ai.connections.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return;
    ui.tab = "keys";
    ui.adding = false; ui.editing = id; ui.test = null; ui.apiKey = "";
    ui.provider = c.provider; ui.label = c.label; ui.baseUrl = c.baseUrl; ui.model = c.model;
    var presetModel = preset(c.provider).model;
    ui.advanced = c.baseUrl !== preset(c.provider).baseUrl || c.model !== presetModel;
    HOST.renderKeep();
  }
  function saveConnection(values) {
    var provider = values.provider || ui.provider || "openai";
    var p = preset(provider);
    var existing = null;
    ai.connections.forEach(function (x) { if (x.id === ui.editing) existing = x; });
    if (!existing && ai.connections.length >= MAX) {
      HOST.toast("You can connect at most " + MAX + " providers");
      return;
    }
    var key = String(values.apiKey || ui.apiKey || "").trim() || (existing && existing.apiKey) || "";
    if (!key) { HOST.toast("Enter an API key first"); return; }
    // Hidden fields are not submitted, so fall back to the preset the user
    // picked. Advanced mode keeps whatever they typed.
    var baseUrl = String((ui.advanced ? values.baseUrl : "") || p.baseUrl || ui.baseUrl).trim() || p.baseUrl;
    var model = String((ui.advanced ? values.model : "") || p.model || ui.model).trim() || p.model;
    if (!/^https?:\/\//i.test(baseUrl)) { HOST.toast("Base URL must start with https://"); return; }
    if (!model) { HOST.toast("Model name is required"); return; }

    if (existing) {
      existing.provider = provider; existing.label = String(values.label || ui.label || p.label).trim() || p.label;
      existing.baseUrl = baseUrl; existing.model = model; existing.apiKey = key;
      HOST.toast("Connection updated");
    } else {
      var created = {
        id: uid(), provider: provider,
        label: String(values.label || ui.label || p.label).trim() || p.label,
        baseUrl: baseUrl, model: model, apiKey: key
      };
      ai.connections.push(created);
      if (!ai.activeId) ai.activeId = created.id;
      HOST.toast("Provider connected");
    }
    if (!ai.activeId) ai.activeId = ai.connections[0].id;
    persist();
    ui.adding = false; ui.editing = null; ui.apiKey = ""; ui.test = null; ui.error = null;
    ui.advanced = false;
    ui.tab = "chat";              // first key connected: go straight to chatting
    HOST.renderKeep();
  }

  function removeConnection(id) {
    ai.connections = ai.connections.filter(function (c) { return c.id !== id; });
    if (!ai.connections.some(function (c) { return c.id === ai.activeId; })) {
      ai.activeId = ai.connections[0] ? ai.connections[0].id : null;
    }
    persist();
    if (ui.editing === id) { ui.editing = null; ui.apiKey = ""; }
    HOST.toast("Connection removed");
    HOST.renderKeep();
  }

  function useConnection(id) {
    if (!ai.connections.some(function (c) { return c.id === id; })) return;
    ai.activeId = id;
    persist();
    HOST.toast("Chat will use this provider");
    HOST.renderKeep();
  }

  function testConnection(c) {
    if (!c) return;
    ui.test = null; ui.busy = true; HOST.renderKeep();
    ask(c, [{ role: "user", content: "Reply with exactly the word: OK" }]).then(function (r) {
      ui.busy = false;
      ui.test = { ok: true, text: r.model + " replied “" + (r.text || "OK").slice(0, 80) + "”." };
      HOST.renderKeep();
    }).catch(function (err) {
      ui.busy = false;
      ui.test = { ok: false, text: err.message || "Test failed" };
      HOST.renderKeep();
    });
  }

  function send(text) {
    var message = String(text || "").trim();
    if (!message || ui.busy) return;
    var a = active();
    if (!a) { ui.tab = "keys"; ui.adding = true; HOST.renderKeep(); return; }

    chat.messages.push({ role: "user", content: message });
    if (chat.title === "New chat") chat.title = message.length > 48 ? message.slice(0, 47) + "…" : message;
    saveChat();
    ui.busy = true; ui.error = null;
    HOST.renderKeep();

    var history = [{ role: "system", content: SYSTEM }];
    chat.messages.slice(-20).forEach(function (m) { history.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }); });

    ask(a, history).then(function (r) {
      ui.busy = false;
      chat.messages.push({ role: "assistant", content: r.text });
      saveChat();
      HOST.renderKeep();
      HOST.scrollBottom();
    }).catch(function (err) {
      ui.busy = false;
      ui.error = err.message || "Something went wrong";
      // Do not lose the user's text: it stays in the transcript, the error is shown above the box.
      HOST.renderKeep();
      HOST.scrollBottom();
    });
  }

  function feedSuggestion(i) {
    var s = SUGGESTIONS[i];
    if (!s) return;
    var box = document.getElementById("ai-msg");
    if (box) {
      box.value = s[1];
      box.focus();
      try { box.setSelectionRange(box.value.length, box.value.length); } catch (e) {}
    }
  }

  /* --------------------------- exported contract ----------------------- */
  window.StudyXChatPanel = {
    enabled: function () { return AI_BUILD; },
    render: render,
    hasTabs: isConfigured,
    tab: function () { return ui.tab; },
    setTab: function (t) { ui.tab = t === "keys" ? "keys" : "chat"; },
    resetView: function () { ui.error = null; ui.test = null; },
    configured: isConfigured,
    startAdd: startAdd,
    toggleAdvanced: function () { ui.advanced = !ui.advanced; HOST.renderKeep(); },
    startEdit: startEdit,
    saveConnection: saveConnection,
    removeConnection: removeConnection,
    useConnection: useConnection,
    testConnection: testConnection,
    testSaved: function (id) {
      var c = null;
      ai.connections.forEach(function (x) { if (x.id === id) c = x; });
      testConnection(c);
    },
    send: send,
    feedSuggestion: feedSuggestion,
    chooseProvider: function (id) {
      ui.provider = id;
      var p = preset(id);
      if (id !== "custom") { ui.baseUrl = p.baseUrl; ui.model = p.model; if (!ui.label) ui.label = p.label; }
      ui.advanced = false;
      HOST.renderKeep();
    },
    clearChat: function () {
      chat.messages = []; chat.title = "New chat"; saveChat(); ui.error = null;
      HOST.toast("Chat cleared"); HOST.renderKeep();
    },
    connections: function () { return ai.connections.length; },
    MAX: MAX,
    MIN: MIN
  };

  // Tell the shell the panel exists so it shows the AI tab and re-renders.
  try { window.dispatchEvent(new window.Event("studyx:ai-ready")); } catch (e) { /* old WebView */ }
})();
