document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    DisclosureWizard.init();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    navLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

const DisclosureWizard = (() => {
    const STORAGE_KEY = 'patentDisclosureDraft';
    const HISTORY_KEY = 'patentDisclosureHistory';
    const MAX_HISTORY = 12;

    const stepConfigs = [
        {
            id: 'invention-name',
            field: 'inventionName',
            successMessage: '命名结构合理。',
            validators: [
                value => value.trim() ? '' : '请填写发明名称。',
                value => value.trim().length <= 25 ? '' : '建议控制在25个字以内。',
                value => {
                    const trimmed = value.trim();
                    return !trimmed || /^一种/.test(trimmed) ? '' : '建议以"一种..."开头，符合专利命名规范。';
                }
            ]
        },
        {
            id: 'technical-field',
            field: 'technicalField',
            successMessage: '技术领域描述清晰。',
            validators: [
                value => value.trim() ? '' : '请描述技术领域。',
                value => value.trim().length >= 15 ? '' : '建议不少于15个字，明确技术对象。',
                value => /属于/.test(value) ? '' : '建议包含"属于…技术领域"以符合惯用表达。'
            ]
        },
        {
            id: 'background',
            field: 'background',
            successMessage: '背景问题阐述充分。',
            validators: [
                value => value.trim() ? '' : '请填写背景技术。',
                value => value.trim().length >= 60 ? '' : '建议不少于60个字，充分描述现有技术不足。',
                value => /(不足|缺陷|问题|局限)/.test(value) ? '' : '请点明现有技术存在的不足或缺陷。'
            ]
        },
        {
            id: 'invention-content',
            field: 'inventionContent',
            successMessage: '技术方案表达完整。',
            validators: [
                value => value.trim() ? '' : '请填写发明内容。',
                value => value.trim().length >= 120 ? '' : '建议不少于120个字，分层描述技术方案。',
                value => {
                    const keywords = ['技术问题', '技术方案', '有益效果'];
                    const count = keywords.filter(keyword => value.includes(keyword)).length;
                    return count >= 2 ? '' : '建议分段说明"技术问题/技术方案/有益效果"等要素。';
                }
            ]
        },
        {
            id: 'claims',
            field: 'claims',
            successMessage: '权利要求结构清晰。',
            validators: [
                value => value.trim() ? '' : '请填写权利要求。',
                value => value.trim().length >= 80 ? '' : '建议不少于80个字，覆盖必要技术特征。',
                value => value.includes('其特征在于') ? '' : '建议包含"其特征在于"以突出区别特征。'
            ]
        },
        {
            id: 'embodiments',
            field: 'embodiments',
            successMessage: '实施例描述详尽。',
            validators: [
                value => value.trim() ? '' : '请填写具体实施方式。',
                value => value.trim().length >= 120 ? '' : '建议不少于120个字，提供实现细节。',
                value => /(步骤|模块|参数|实验)/.test(value) ? '' : '建议描述关键步骤、模块或实验参数以便复现。'
            ]
        }
    ];

    let wizardSteps = [];
    let wizardPanels = [];
    let prevBtn = null;
    let nextBtn = null;
    let progressFill = null;
    let wizardStatusEl = null;
    let autosaveStatusEl = null;
    let autoSaveTimer = null;
    let currentStep = 0;
    let lastSnapshot = '';
    let lastSavedAt = null;
    let wizardCompleted = false;

    function init() {
        wizardSteps = Array.from(document.querySelectorAll('.wizard-step'));
        wizardPanels = Array.from(document.querySelectorAll('.wizard-panel'));
        prevBtn = document.getElementById('wizard-prev');
        nextBtn = document.getElementById('wizard-next');
        progressFill = document.getElementById('disclosure-progress');
        wizardStatusEl = document.getElementById('wizard-status');
        autosaveStatusEl = document.getElementById('autosave-status');

        if (!wizardSteps.length || !wizardPanels.length) {
            return;
        }

        wizardSteps.forEach(stepButton => {
            stepButton.addEventListener('click', () => {
                const index = Number(stepButton.dataset.step);
                if (index === currentStep) return;
                if (!validateStep(currentStep, { showMessage: true })) {
                    return;
                }
                goToStep(index);
            });
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const valid = validateStep(currentStep, { showMessage: true });
                if (!valid) return;
                persistDraft('manual');
                if (currentStep < stepConfigs.length - 1) {
                    goToStep(currentStep + 1);
                } else {
                    wizardCompleted = true;
                    updateWizardButtons();
                    updateAutosaveStatus('所有步骤均已校验完成 ✅');
                }
            });
        }

        document.querySelectorAll('[data-disclosure-field]').forEach(field => {
            field.addEventListener('input', () => {
                const stepIndex = Number(field.closest('.wizard-panel')?.dataset.step || 0);
                validateStep(stepIndex, { showMessage: false });
                scheduleSave('autosave');
            });
        });

        restoreDraft();
        renderHistory();
        updateWizardUI();
    }

    function goToStep(index) {
        currentStep = Math.min(Math.max(index, 0), stepConfigs.length - 1);
        if (wizardCompleted) {
            wizardCompleted = false;
        }
        wizardSteps.forEach((button, idx) => button.classList.toggle('active', idx === currentStep));
        wizardPanels.forEach((panel, idx) => panel.classList.toggle('active', idx === currentStep));
        updateWizardUI();
    }

    function validateStep(stepIndex, { showMessage = false } = {}) {
        const config = stepConfigs[stepIndex];
        if (!config) return true;
        const field = document.getElementById(config.id);
        const messageEl = document.querySelector(`[data-validation-for="${config.id}"]`);
        if (!field || !messageEl) return true;

        const value = field.value || '';
        const errors = config.validators
            .map(validator => validator(value))
            .filter(Boolean);

        const isFilled = value.trim().length > 0;
        const emphasize = showMessage || isFilled;
        const isValid = errors.length === 0 && isFilled;

        messageEl.textContent = isValid ? config.successMessage : (emphasize ? errors.join('；') : '');
        messageEl.classList.toggle('success', isValid);
        field.classList.toggle('error', !isValid && emphasize);

        const stepButton = wizardSteps[stepIndex];
        if (stepButton) {
            stepButton.classList.toggle('completed', isValid);
            stepButton.classList.toggle('error', !isValid && emphasize);
        }

        if (!isValid && wizardCompleted) {
            wizardCompleted = false;
            updateWizardButtons();
        }

        updateProgress();
        return isValid;
    }

    function validateAllSteps({ showMessages = false, focus = false } = {}) {
        let allValid = true;
        let firstInvalidIndex = null;
        stepConfigs.forEach((_, index) => {
            const result = validateStep(index, { showMessage: showMessages });
            if (!result && firstInvalidIndex === null) {
                firstInvalidIndex = index;
            }
            allValid = allValid && result;
        });
        if (!allValid && focus && firstInvalidIndex !== null) {
            goToStep(firstInvalidIndex);
        }
        return allValid;
    }

    function updateWizardUI() {
        updateProgress();
    }

    function updateProgress() {
        if (!progressFill) return;
        const completedCount = wizardSteps.filter(button => button.classList.contains('completed')).length;
        const percentage = Math.round((completedCount / stepConfigs.length) * 100);
        progressFill.style.width = `${percentage}%`;
        if (wizardStatusEl) {
            wizardStatusEl.textContent = `步骤 ${currentStep + 1} / ${stepConfigs.length}`;
        }
        updateWizardButtons();
    }

    function updateWizardButtons() {
        if (prevBtn) {
            prevBtn.disabled = currentStep === 0;
        }
        if (nextBtn) {
            if (wizardCompleted) {
                nextBtn.disabled = true;
                nextBtn.textContent = '已完成全部步骤';
                return;
            }
            nextBtn.disabled = false;
            nextBtn.textContent = currentStep === stepConfigs.length - 1 ? '完成并复核' : '保存并进入下一步';
        }
    }

    function scheduleSave(type) {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(() => {
            persistDraft(type);
        }, 600);
    }

    function persistDraft(type = 'manual', { force = false } = {}) {
        const inputs = getAllInputs();
        const snapshot = JSON.stringify(inputs);
        if (!force && type === 'autosave' && snapshot === lastSnapshot) {
            return;
        }
        lastSnapshot = snapshot;
        const timestamp = new Date().toISOString();
        const payload = { updatedAt: timestamp, data: inputs };
        writeStorage(STORAGE_KEY, payload);
        lastSavedAt = timestamp;
        updateAutosaveStatus(formatStatusMessage(type, timestamp));
        updateHistory(type, timestamp);
    }

    function restoreDraft() {
        const stored = readStorage(STORAGE_KEY, null);
        if (stored && stored.data) {
            Object.entries(stored.data).forEach(([key, value]) => {
                const field = document.querySelector(`[data-disclosure-field="${key}"]`);
                if (field) {
                    field.value = value;
                }
            });
            lastSnapshot = JSON.stringify(stored.data);
            lastSavedAt = stored.updatedAt || null;
            if (lastSavedAt) {
                updateAutosaveStatus(`已恢复 ${formatTimestamp(lastSavedAt)} 的草稿`);
            }
            stepConfigs.forEach((_, index) => validateStep(index, { showMessage: false }));
        }
    }

    function updateAutosaveStatus(message) {
        if (autosaveStatusEl && message) {
            autosaveStatusEl.textContent = message;
        }
    }

    function updateHistory(type, timestamp) {
        const history = readStorage(HISTORY_KEY, []);
        const lastRecord = history[history.length - 1];
        if (type === 'autosave' && lastRecord) {
            const delta = Math.abs(new Date(timestamp).getTime() - new Date(lastRecord.timestamp).getTime());
            if (lastRecord.type === 'autosave' && delta < 60000) {
                history[history.length - 1] = { type, timestamp };
                writeStorage(HISTORY_KEY, history);
                renderHistory(history);
                return;
            }
        }
        history.push({ type, timestamp });
        if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
        }
        writeStorage(HISTORY_KEY, history);
        renderHistory(history);
    }

    function renderHistory(history = null) {
        const listEl = document.getElementById('version-list');
        const emptyEl = document.getElementById('version-empty');
        if (!listEl || !emptyEl) return;
        const records = history ?? readStorage(HISTORY_KEY, []);
        listEl.innerHTML = '';
        if (!records.length) {
            emptyEl.style.display = 'block';
            return;
        }
        emptyEl.style.display = 'none';
        records
            .slice()
            .reverse()
            .forEach(record => {
                const item = document.createElement('li');
                item.textContent = `${formatHistoryLabel(record.type)} · ${formatTimestamp(record.timestamp)}`;
                listEl.appendChild(item);
            });
    }

    function formatHistoryLabel(type) {
        switch (type) {
            case 'autosave':
                return '自动保存';
            case 'export':
                return '导出记录';
            default:
                return '手动保存';
        }
    }

    function formatStatusMessage(type, timestamp) {
        const formatted = formatTimestamp(timestamp);
        if (type === 'autosave') {
            return `自动保存于 ${formatted}`;
        }
        if (type === 'export') {
            return `导出前已锁定版本（${formatted}）`;
        }
        return `已保存于 ${formatted}`;
    }

    function formatTimestamp(timestamp) {
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(new Date(timestamp));
        } catch (error) {
            console.warn('时间格式化失败', error);
            return timestamp;
        }
    }

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn('读取本地存储失败', error);
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('写入本地存储失败', error);
        }
    }

    return {
        init,
        validateAllSteps: options => validateAllSteps(options),
        persist: (type = 'manual', options) => persistDraft(type, options || {}),
        getLastSavedAt: () => lastSavedAt,
        renderHistory
    };
})();

function copyToClipboard(elementId) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
        console.error('复制失败: 未找到目标元素', elementId);
        return;
    }

    const textToCopy = targetElement.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('文本已复制: ', textToCopy);
    }).catch(err => {
        console.error('复制失败: ', err);
    });
}

function toggleFAQ(element) {
    const answer = element.nextElementSibling;
    const icon = element.querySelector('.faq-icon');

    if (answer.classList.contains('active')) {
        answer.classList.remove('active');
        element.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        answer.classList.add('active');
        element.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}

function getAllInputs() {
    const result = {
        inventionName: '',
        technicalField: '',
        background: '',
        inventionContent: '',
        claims: '',
        embodiments: ''
    };
    document.querySelectorAll('[data-disclosure-field]').forEach(field => {
        const key = field.getAttribute('data-disclosure-field');
        if (key && Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = field.value || '';
        }
    });
    return result;
}

function previewHTML() {
    DisclosureWizard.persist('manual', { force: true });
    DisclosureWizard.validateAllSteps({ showMessages: false });

    const inputs = getAllInputs();
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.getElementById('preview-container');
    const exportTimestamp = new Date().toISOString();

    const html = `
        <div style="font-family: 'Microsoft YaHei', sans-serif; line-height: 1.8;">
            <h1 style="text-align: center; color: #2c3e50; margin-bottom: 30px;">专利交底书</h1>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">1. 发明名称</h2>
            <p style="margin: 15px 0; font-size: 16px;">${inputs.inventionName || '（请填写发明名称）'}</p>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">2. 技术领域</h2>
            <p style="margin: 15px 0;">${inputs.technicalField || '（请填写技术领域）'}</p>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">3. 背景技术</h2>
            <p style="margin: 15px 0;">${inputs.background || '（请填写背景技术）'}</p>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">4. 发明内容</h2>
            <p style="margin: 15px 0;">${inputs.inventionContent || '（请填写发明内容）'}</p>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">5. 权利要求</h2>
            <p style="margin: 15px 0;">${inputs.claims || '（请填写权利要求）'}</p>
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px;">6. 具体实施方式</h2>
            <p style="margin: 15px 0;">${inputs.embodiments || '（请填写具体实施方式）'}</p>
            <div style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">
                <strong>版本信息：</strong> 预览生成时间 ${new Date(exportTimestamp).toLocaleString('zh-CN', { hour12: false })}
            </div>
        </div>
    `;

    if (previewContent && previewContainer) {
        previewContent.innerHTML = html;
        previewContainer.style.display = 'block';
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function downloadDoc() {
    const ready = DisclosureWizard.validateAllSteps({ showMessages: true, focus: true });
    if (!ready) {
        alert('请先完善所有步骤并通过校验后再导出。');
        return;
    }

    DisclosureWizard.persist('export', { force: true });

    const inputs = getAllInputs();
    const exportTimestamp = new Date();
    const formattedTimestamp = exportTimestamp.toLocaleString('zh-CN', { hour12: false });

    const htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.8; margin: 40px; }
                h1 { text-align: center; color: #2c3e50; margin-bottom: 30px; }
                h2 { color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                p { margin: 15px 0; }
                .meta { margin-top: 30px; font-size: 14px; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <h1>专利交底书</h1>
            <h2>1. 发明名称</h2>
            <p>${inputs.inventionName || '（请填写发明名称）'}</p>
            <h2>2. 技术领域</h2>
            <p>${inputs.technicalField || '（请填写技术领域）'}</p>
            <h2>3. 背景技术</h2>
            <p>${inputs.background || '（请填写背景技术）'}</p>
            <h2>4. 发明内容</h2>
            <p>${inputs.inventionContent || '（请填写发明内容）'}</p>
            <h2>5. 权利要求</h2>
            <p>${inputs.claims || '（请填写权利要求）'}</p>
            <h2>6. 具体实施方式</h2>
            <p>${inputs.embodiments || '（请填写具体实施方式）'}</p>
            <div class="meta">
                <strong>导出时间：</strong> ${formattedTimestamp}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `专利交底书_${inputs.inventionName || '未命名'}_${formattedTimestamp.replace(/[^0-9]/g, '')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('文档导出成功，并已记录导出时间。');
}
