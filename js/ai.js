/* ====================================================
   AI 助手模块 — 专利交底书写作助手
   支持: Anthropic Claude API / OpenAI API（直连或代理）
   API Key 仅存于 localStorage，不上传任何服务器
   ==================================================== */

const PatentAI = (() => {
    const SETTINGS_KEY = 'patentAISettings';

    /* -------- 默认设置 -------- */
    const defaultSettings = {
        provider: 'anthropic',           // 'anthropic' | 'openai'
        apiKey: '',
        model: 'claude-sonnet-4-6',      // Anthropic 默认
        baseUrl: '',                     // 留空使用官方地址；可填代理地址
    };

    let settings = loadSettings();

    /* -------- 每步 AI 提示词配置 -------- */
    const stepPrompts = {
        0: {
            label: '发明名称',
            genHint: '请描述您的发明（一句话简介即可）',
            genPrompt: (hint, ctx) => `
你是一名经验丰富的中国专利代理师。根据以下发明简介，为专利交底书生成一个规范的发明名称。
要求：
1. 以"一种"开头
2. 不超过25个字
3. 涵盖技术主体和核心特征，不使用宣传性词语

发明简介：${hint}
${ctx ? `\n已有其他章节内容供参考：\n${ctx}` : ''}

只输出发明名称本身，不要任何解释。`,
            improvePrompt: (current, ctx) => `
你是一名专利代理师。请优化以下专利发明名称，使其更规范、简洁且准确。

当前名称：${current}
${ctx ? `其他章节参考：\n${ctx}` : ''}

要求：以"一种"开头，不超过25字，无宣传性用语。
只输出优化后的名称，不要解释。`
        },
        1: {
            label: '技术领域',
            genHint: '请描述发明所属的技术领域（如：生物检测、人工智能、材料制备等）',
            genPrompt: (hint, ctx) => `
你是一名专利代理师。根据以下信息，为专利交底书撰写"技术领域"章节。
要求：
1. 以"本发明属于……技术领域"开头
2. 简洁明了，1-2句话
3. 点明技术主体，避免过于宽泛

技术领域描述：${hint}
${ctx ? `\n发明名称：${ctx}` : ''}

直接输出技术领域描述文本，不加标题。`,
            improvePrompt: (current, ctx) => `
优化以下专利交底书"技术领域"描述，使其更规范：

当前内容：${current}
${ctx ? `发明名称：${ctx}` : ''}

要求：以"本发明属于……技术领域"开头，1-2句话。直接输出优化文本。`
        },
        2: {
            label: '背景技术',
            genHint: '请简述现有技术方案及其主要缺陷（可填写2-3个问题）',
            genPrompt: (hint, ctx) => `
你是一名专利代理师。根据以下信息，为专利交底书撰写"背景技术"章节。
采用经典四段式结构：
第一段：定义问题与危害
第二段：传统方法及其缺点
第三段：第一代改进技术及其局限性
第四段：最新技术及其仍未解决的痛点

输入信息：${hint}
${ctx ? `\n发明相关信息：${ctx}` : ''}

要求：300-500字，每段清晰点明现有技术的不足，为后续发明内容铺垫。
直接输出背景技术正文，不加标题。`,
            improvePrompt: (current, ctx) => `
优化以下专利交底书"背景技术"章节：

当前内容：${current}

要求：
- 确保清晰点明现有技术的不足（不足、缺陷、问题、局限等）
- 逻辑递进，为本发明的必要性作铺垫
- 保持学术客观语气

直接输出优化后的正文。`
        },
        3: {
            label: '发明内容',
            genHint: '请描述您的技术方案核心创新点（解决了什么问题，通过什么方式，有哪些效果）',
            genPrompt: (hint, ctx) => `
你是一名专利代理师。根据以下信息，为专利交底书撰写"发明内容"章节。
章节结构：
1. 要解决的技术问题（一句话概括）
2. 技术方案（分层次描述系统/方法组成及核心创新）
3. 有益效果（具体量化效果，逐条对应背景技术缺陷）

技术方案描述：${hint}
${ctx ? `\n相关章节信息：${ctx}` : ''}

要求：500-800字，突出创新点，使用"其特征在于"等规范用语。
直接输出发明内容正文，不加标题。`,
            improvePrompt: (current, ctx) => `
优化以下专利交底书"发明内容"章节：

当前内容：${current}

要求：
- 确保包含：技术问题、技术方案、有益效果三个要素
- 技术方案描述具体清晰
- 有益效果具体量化，与背景技术缺陷逐条对应

直接输出优化后的正文。`
        },
        4: {
            label: '权利要求',
            genHint: '请描述发明的核心技术特征（主要部件、方法步骤、关键参数等）',
            genPrompt: (hint, ctx) => `
你是一名专利代理师。根据以下信息，为专利交底书起草"权利要求"初稿。
要求：
1. 独立权利要求：包含所有必要技术特征，使用"其特征在于"
2. 从属权利要求（2-3条）：进一步限定具体参数、材料或方法
3. 语言精确，无歧义，无功能性描述

技术特征：${hint}
${ctx ? `\n相关内容：${ctx}` : ''}

直接输出权利要求书正文，格式如：
1.（独立权利要求）……
2.（从属）根据权利要求1所述的……，其特征在于……`,
            improvePrompt: (current, ctx) => `
优化以下专利交底书"权利要求"：

当前内容：${current}

要求：
- 独立权利要求包含"其特征在于"
- 从属权利要求引用明确
- 语言精确，无功能性描述，无歧义

直接输出优化后的权利要求。`
        },
        5: {
            label: '具体实施方式',
            genHint: '请描述具体的实施步骤、系统组成、实验参数等细节',
            genPrompt: (hint, ctx) => `
你是一名专利代理师。根据以下信息，为专利交底书撰写"具体实施方式"章节。
要求：
1. 结合附图（或假设有附图）进行说明
2. 详细描述每个部件的作用或每个步骤的具体操作
3. 包含具体参数、材料、算法等
4. 像实验报告一样详尽，让本领域技术人员能够复现

实施细节：${hint}
${ctx ? `\n发明相关信息：${ctx}` : ''}

要求：800-1200字，使用"以下结合附图对本发明做进一步说明"开头。
直接输出具体实施方式正文，不加标题。`,
            improvePrompt: (current, ctx) => `
优化以下专利交底书"具体实施方式"章节：

当前内容：${current}

要求：
- 描述详细，可复现
- 包含具体参数、步骤说明
- 使用"以下结合附图"等规范表述

直接输出优化后的正文。`
        }
    };

    /* -------- 工具：读写设置 -------- */
    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
        } catch (e) {
            return { ...defaultSettings };
        }
    }

    function saveSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    /* -------- API 调用：Anthropic Claude -------- */
    async function callAnthropic(prompt, onChunk, signal) {
        const baseUrl = settings.baseUrl || 'https://api.anthropic.com';
        const url = `${baseUrl}/v1/messages`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': settings.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: settings.model || 'claude-sonnet-4-6',
                max_tokens: 2048,
                stream: true,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API错误 ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed.delta?.text || '';
                    if (text) onChunk(text);
                } catch (e) { /* 忽略解析错误 */ }
            }
        }
    }

    /* -------- API 调用：OpenAI -------- */
    async function callOpenAI(prompt, onChunk, signal) {
        const baseUrl = settings.baseUrl || 'https://api.openai.com';
        const url = `${baseUrl}/v1/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.model || 'gpt-4o',
                stream: true,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API错误 ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed.choices?.[0]?.delta?.content || '';
                    if (text) onChunk(text);
                } catch (e) { /* 忽略 */ }
            }
        }
    }

    /* -------- 统一调用入口 -------- */
    async function callAI(prompt, onChunk, signal) {
        if (!settings.apiKey) throw new Error('请先配置 API Key');
        if (settings.provider === 'openai') {
            await callOpenAI(prompt, onChunk, signal);
        } else {
            await callAnthropic(prompt, onChunk, signal);
        }
    }

    /* -------- 构建上下文 -------- */
    function buildContext(excludeStep) {
        const labels = ['发明名称', '技术领域', '背景技术', '发明内容', '权利要求', '具体实施方式'];
        const fieldIds = ['invention-name', 'technical-field', 'background', 'invention-content', 'claims', 'embodiments'];
        return fieldIds
            .map((id, i) => {
                if (i === excludeStep) return null;
                const el = document.getElementById(id);
                const val = el?.value?.trim();
                return val ? `【${labels[i]}】${val.substring(0, 200)}` : null;
            })
            .filter(Boolean)
            .join('\n');
    }

    /* -------- UI：初始化 -------- */
    function initUI() {
        renderSettingsModal();
        renderAIPanel();
        bindSettingsEvents();
    }

    /* -------- UI：设置弹窗 -------- */
    function renderSettingsModal() {
        const html = `
<div id="ai-settings-modal" class="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title" style="display:none;">
    <div class="ai-modal-backdrop"></div>
    <div class="ai-modal-box">
        <div class="ai-modal-header">
            <h3 id="ai-modal-title">🤖 AI 助手设置</h3>
            <button class="ai-modal-close" id="ai-modal-close" aria-label="关闭">✕</button>
        </div>
        <div class="ai-modal-body">
            <div class="ai-form-group">
                <label class="ai-label">API 提供商</label>
                <div class="ai-radio-group">
                    <label class="ai-radio-label">
                        <input type="radio" name="ai-provider" value="anthropic" ${settings.provider === 'anthropic' ? 'checked' : ''}>
                        <span>Anthropic Claude</span>
                    </label>
                    <label class="ai-radio-label">
                        <input type="radio" name="ai-provider" value="openai" ${settings.provider === 'openai' ? 'checked' : ''}>
                        <span>OpenAI / 兼容接口</span>
                    </label>
                </div>
            </div>

            <div class="ai-form-group">
                <label class="ai-label" for="ai-key-input">API Key</label>
                <div class="ai-key-row">
                    <input type="password" id="ai-key-input" class="ai-input" placeholder="sk-..." value="${settings.apiKey}" autocomplete="off">
                    <button class="ai-key-toggle" id="ai-key-toggle" title="显示/隐藏">👁</button>
                </div>
                <p class="ai-hint">Key 仅存储于本地浏览器，不上传至任何服务器。</p>
            </div>

            <div class="ai-form-group">
                <label class="ai-label" for="ai-model-input">模型</label>
                <input type="text" id="ai-model-input" class="ai-input" placeholder="claude-sonnet-4-6 / gpt-4o" value="${settings.model}">
            </div>

            <div class="ai-form-group">
                <label class="ai-label" for="ai-baseurl-input">自定义 Base URL <span class="ai-optional">（可选，留空使用官方地址）</span></label>
                <input type="text" id="ai-baseurl-input" class="ai-input" placeholder="https://api.anthropic.com" value="${settings.baseUrl}">
            </div>

            <div class="ai-provider-defaults" id="ai-provider-defaults"></div>
        </div>
        <div class="ai-modal-footer">
            <button class="ai-btn ai-btn-secondary" id="ai-settings-test">🔌 测试连接</button>
            <button class="ai-btn ai-btn-primary" id="ai-settings-save">保存设置</button>
        </div>
    </div>
</div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /* -------- UI：AI 操作面板（插入每个 wizard-panel） -------- */
    function renderAIPanel() {
        const panels = document.querySelectorAll('.wizard-panel');
        panels.forEach((panel, stepIndex) => {
            const cfg = stepPrompts[stepIndex];
            if (!cfg) return;

            const panelHtml = `
<div class="ai-assistant-panel" data-step="${stepIndex}">
    <div class="ai-panel-header">
        <span class="ai-panel-icon">🤖</span>
        <span class="ai-panel-title">AI 写作助手</span>
        <button class="ai-panel-toggle" data-step="${stepIndex}" aria-expanded="false">展开 ▾</button>
    </div>
    <div class="ai-panel-body" data-ai-body="${stepIndex}" style="display:none;">
        <div class="ai-tabs">
            <button class="ai-tab active" data-tab="gen" data-step="${stepIndex}">✨ 生成内容</button>
            <button class="ai-tab" data-tab="improve" data-step="${stepIndex}">🔧 优化改进</button>
        </div>

        <div class="ai-tab-panel active" data-tab-content="gen" data-step="${stepIndex}">
            <label class="ai-label">请简单描述您的 ${cfg.label}（AI 将为您生成规范内容）</label>
            <textarea class="ai-hint-input" id="ai-hint-${stepIndex}" rows="3" placeholder="${cfg.genHint}"></textarea>
            <button class="ai-generate-btn" data-action="gen" data-step="${stepIndex}">✨ 生成 ${cfg.label}</button>
        </div>

        <div class="ai-tab-panel" data-tab-content="improve" data-step="${stepIndex}">
            <p class="ai-hint">AI 将分析并优化您当前填写的内容，保留核心信息，提升表达规范性。</p>
            <button class="ai-generate-btn" data-action="improve" data-step="${stepIndex}">🔧 优化当前内容</button>
        </div>

        <div class="ai-output-area" id="ai-output-${stepIndex}" style="display:none;">
            <div class="ai-output-header">
                <span>AI 生成结果</span>
                <div class="ai-output-actions">
                    <button class="ai-action-btn" data-action="apply" data-step="${stepIndex}">✓ 采用此内容</button>
                    <button class="ai-action-btn ai-action-secondary" data-action="append" data-step="${stepIndex}">+ 追加到末尾</button>
                    <button class="ai-action-btn ai-action-danger" data-action="discard" data-step="${stepIndex}">✕ 丢弃</button>
                </div>
            </div>
            <div class="ai-output-text" id="ai-output-text-${stepIndex}"></div>
            <div class="ai-generating-indicator" id="ai-indicator-${stepIndex}" style="display:none;">
                <span class="ai-cursor">▌</span> 生成中…
            </div>
        </div>

        <div class="ai-error-msg" id="ai-error-${stepIndex}" style="display:none;"></div>
    </div>
</div>`;

            panel.insertAdjacentHTML('beforeend', panelHtml);
        });

        bindPanelEvents();
    }

    /* -------- 绑定事件 -------- */
    function bindSettingsEvents() {
        // 设置弹窗打开/关闭
        document.getElementById('ai-settings-modal')?.querySelector('.ai-modal-backdrop')
            ?.addEventListener('click', closeSettingsModal);
        document.getElementById('ai-modal-close')
            ?.addEventListener('click', closeSettingsModal);

        // Provider 切换时更新默认模型提示
        document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
            radio.addEventListener('change', updateProviderDefaults);
        });
        updateProviderDefaults();

        // API Key 显示切换
        document.getElementById('ai-key-toggle')?.addEventListener('click', () => {
            const input = document.getElementById('ai-key-input');
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });

        // 保存设置
        document.getElementById('ai-settings-save')?.addEventListener('click', () => {
            const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'anthropic';
            const apiKey = document.getElementById('ai-key-input')?.value?.trim() || '';
            const model = document.getElementById('ai-model-input')?.value?.trim() ||
                (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6');
            const baseUrl = document.getElementById('ai-baseurl-input')?.value?.trim() || '';

            saveSettings({ provider, apiKey, model, baseUrl });
            closeSettingsModal();
            showToast('AI 设置已保存', 'success');
        });

        // 测试连接
        document.getElementById('ai-settings-test')?.addEventListener('click', testConnection);
    }

    function bindPanelEvents() {
        // 面板折叠
        document.querySelectorAll('.ai-panel-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = btn.dataset.step;
                const body = document.querySelector(`[data-ai-body="${step}"]`);
                if (!body) return;
                const isOpen = body.style.display !== 'none';
                body.style.display = isOpen ? 'none' : 'block';
                btn.textContent = isOpen ? '展开 ▾' : '收起 ▴';
                btn.setAttribute('aria-expanded', String(!isOpen));
            });
        });

        // Tab 切换
        document.querySelectorAll('.ai-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const step = tab.dataset.step;
                const tabName = tab.dataset.tab;
                document.querySelectorAll(`.ai-tab[data-step="${step}"]`).forEach(t =>
                    t.classList.toggle('active', t.dataset.tab === tabName));
                document.querySelectorAll(`[data-tab-content][data-step="${step}"]`).forEach(p =>
                    p.classList.toggle('active', p.dataset.tabContent === tabName));
            });
        });

        // 生成按钮
        let activeController = null;

        document.querySelectorAll('.ai-generate-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const step = Number(btn.dataset.step);
                const action = btn.dataset.action;
                const cfg = stepPrompts[step];
                if (!cfg) return;

                if (!settings.apiKey) {
                    openSettingsModal();
                    showToast('请先配置 API Key', 'error');
                    return;
                }

                // 中止上次请求
                if (activeController) activeController.abort();
                activeController = new AbortController();

                const outputArea = document.getElementById(`ai-output-${step}`);
                const outputText = document.getElementById(`ai-output-text-${step}`);
                const indicator = document.getElementById(`ai-indicator-${step}`);
                const errorEl = document.getElementById(`ai-error-${step}`);

                if (!outputArea || !outputText || !indicator) return;

                // 重置 UI
                errorEl && (errorEl.style.display = 'none');
                outputText.textContent = '';
                outputArea.style.display = 'block';
                indicator.style.display = 'flex';
                btn.disabled = true;
                btn.textContent = '⏳ 生成中…';

                try {
                    const ctx = buildContext(step);
                    let prompt;

                    if (action === 'gen') {
                        const hint = document.getElementById(`ai-hint-${step}`)?.value?.trim();
                        if (!hint) {
                            showToast('请先填写描述内容', 'error');
                            return;
                        }
                        prompt = cfg.genPrompt(hint, ctx);
                    } else {
                        const currentContent = document.getElementById(
                            ['invention-name', 'technical-field', 'background',
                             'invention-content', 'claims', 'embodiments'][step]
                        )?.value?.trim();
                        if (!currentContent) {
                            showToast('请先填写内容再使用优化功能', 'error');
                            return;
                        }
                        prompt = cfg.improvePrompt(currentContent, ctx);
                    }

                    let fullText = '';
                    await callAI(
                        prompt,
                        chunk => {
                            fullText += chunk;
                            outputText.textContent = fullText;
                        },
                        activeController.signal
                    );
                } catch (err) {
                    if (err.name === 'AbortError') {
                        outputText.textContent += '\n[已中止]';
                    } else {
                        if (errorEl) {
                            errorEl.textContent = `❌ 错误：${err.message}`;
                            errorEl.style.display = 'block';
                        }
                        showToast(err.message, 'error', 4000);
                    }
                } finally {
                    indicator.style.display = 'none';
                    btn.disabled = false;
                    const cfg2 = stepPrompts[step];
                    btn.textContent = action === 'gen'
                        ? `✨ 生成 ${cfg2?.label || ''}`
                        : '🔧 优化当前内容';
                }
            });
        });

        // 采用 / 追加 / 丢弃
        document.querySelectorAll('.ai-action-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = Number(btn.dataset.step);
                const action = btn.dataset.action;
                const fieldIds = ['invention-name', 'technical-field', 'background',
                    'invention-content', 'claims', 'embodiments'];
                const fieldEl = document.getElementById(fieldIds[step]);
                const outputText = document.getElementById(`ai-output-text-${step}`);
                const outputArea = document.getElementById(`ai-output-${step}`);
                const generatedText = outputText?.textContent?.trim() || '';

                if (!generatedText) return;

                if (action === 'apply') {
                    if (fieldEl) fieldEl.value = generatedText;
                    fieldEl?.dispatchEvent(new Event('input'));
                    outputArea && (outputArea.style.display = 'none');
                    showToast('已采用 AI 生成内容', 'success');
                } else if (action === 'append') {
                    if (fieldEl) {
                        fieldEl.value = fieldEl.value
                            ? fieldEl.value.trimEnd() + '\n\n' + generatedText
                            : generatedText;
                    }
                    fieldEl?.dispatchEvent(new Event('input'));
                    outputArea && (outputArea.style.display = 'none');
                    showToast('已追加到当前内容', 'success');
                } else if (action === 'discard') {
                    outputArea && (outputArea.style.display = 'none');
                    showToast('已丢弃 AI 结果', 'info');
                }
            });
        });
    }

    function updateProviderDefaults() {
        const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'anthropic';
        const modelInput = document.getElementById('ai-model-input');
        const defaultsEl = document.getElementById('ai-provider-defaults');

        const defaults = {
            anthropic: {
                model: 'claude-sonnet-4-6',
                hint: '推荐模型：claude-sonnet-4-6（平衡）/ claude-opus-4-6（最强）/ claude-haiku-4-5-20251001（最快）'
            },
            openai: {
                model: 'gpt-4o',
                hint: '推荐模型：gpt-4o / gpt-4o-mini；也支持兼容 OpenAI 格式的其他 API（DeepSeek、Qwen 等）'
            }
        };

        if (modelInput && !modelInput.dataset.userModified) {
            modelInput.placeholder = defaults[provider].model;
            if (!modelInput.value) modelInput.value = defaults[provider].model;
        }

        if (defaultsEl) {
            defaultsEl.innerHTML = `<p class="ai-hint">${defaults[provider].hint}</p>`;
        }
    }

    /* -------- 测试连接 -------- */
    async function testConnection() {
        const testBtn = document.getElementById('ai-settings-test');
        if (!testBtn) return;

        const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'anthropic';
        const apiKey = document.getElementById('ai-key-input')?.value?.trim() || '';
        const model = document.getElementById('ai-model-input')?.value?.trim() || '';
        const baseUrl = document.getElementById('ai-baseurl-input')?.value?.trim() || '';

        if (!apiKey) { showToast('请先填写 API Key', 'error'); return; }

        const tempSettings = { provider, apiKey, model, baseUrl };
        const origSettings = settings;
        settings = { ...settings, ...tempSettings };

        testBtn.disabled = true;
        testBtn.textContent = '测试中…';

        try {
            let result = '';
            await callAI('用一句话介绍专利交底书。', chunk => { result += chunk; }, null);
            showToast('连接成功！AI 已就绪。', 'success', 3000);
        } catch (err) {
            showToast(`连接失败：${err.message}`, 'error', 5000);
        } finally {
            settings = origSettings;
            testBtn.disabled = false;
            testBtn.textContent = '🔌 测试连接';
        }
    }

    /* -------- 弹窗开关 -------- */
    function openSettingsModal() {
        const modal = document.getElementById('ai-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            // 同步当前设置到表单
            const keyInput = document.getElementById('ai-key-input');
            const modelInput = document.getElementById('ai-model-input');
            const baseInput = document.getElementById('ai-baseurl-input');
            if (keyInput) keyInput.value = settings.apiKey;
            if (modelInput) modelInput.value = settings.model;
            if (baseInput) baseInput.value = settings.baseUrl;
            document.querySelectorAll('input[name="ai-provider"]').forEach(r => {
                r.checked = r.value === settings.provider;
            });
            updateProviderDefaults();
        }
    }

    function closeSettingsModal() {
        const modal = document.getElementById('ai-settings-modal');
        if (modal) modal.style.display = 'none';
    }

    /* -------- 公开 API -------- */
    return {
        init() {
            initUI();

            // 侧边栏 AI 设置按钮
            document.getElementById('ai-settings-btn')?.addEventListener('click', openSettingsModal);

            // 快捷方式：点击向导内任何 "设置AI" 链接
            document.addEventListener('click', e => {
                if (e.target.matches('[data-open-ai-settings]')) openSettingsModal();
            });
        },
        openSettings: openSettingsModal,
        isConfigured: () => Boolean(settings.apiKey)
    };
})();

/* ========== 启动 AI 模块 ========== */
document.addEventListener('DOMContentLoaded', () => {
    PatentAI.init();
});
