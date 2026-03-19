/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileMenu();
    initCopyButtons();
    initCharCounts();
    initFAQ();
    initExportButtons();
    initClearDraft();
    initIntroCards();
    DisclosureWizard.init();
});

/* ========== Toast 通知系统 ========== */
function showToast(message, type = 'success', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || '✓'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

/* ========== 导航 ========== */
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
            // 移动端点击后关闭侧边栏
            closeSidebar();
        });
    });
}

/* ========== 移动端菜单 ========== */
function initMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!toggle || !sidebar || !overlay) return;

    toggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) closeSidebar();
        else openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.add('open');
    overlay?.classList.add('visible');
    toggle?.classList.add('open');
    toggle?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
    toggle?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
}

/* ========== 引言卡片导航 ========== */
function initIntroCards() {
    document.querySelectorAll('.intro-card-btn[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const link = document.querySelector(`.nav-link[href="#${targetId}"]`);
            if (link) link.click();
        });
    });
}

/* ========== 复制按钮 ========== */
function initCopyButtons() {
    document.addEventListener('click', event => {
        const btn = event.target.closest('.copy-btn[data-copy-target]');
        if (!btn) return;
        const targetEl = document.getElementById(btn.dataset.copyTarget);
        if (!targetEl) return;

        const text = targetEl.innerText;
        navigator.clipboard.writeText(text)
            .then(() => {
                const original = btn.textContent;
                btn.textContent = '已复制 ✓';
                btn.classList.add('copied');
                showToast('已复制到剪贴板', 'success');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 2000);
            })
            .catch(() => {
                showToast('复制失败，请手动选择文本', 'error');
            });
    });
}

/* 兼容旧版 onclick 写法 */
function copyToClipboard(elementId) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) return;
    navigator.clipboard.writeText(targetElement.innerText)
        .then(() => showToast('已复制到剪贴板', 'success'))
        .catch(() => showToast('复制失败，请手动选择文本', 'error'));
}

/* ========== 字数统计 ========== */
function initCharCounts() {
    const fieldCountMap = {
        'invention-name': { countEl: 'invention-name-count', warn: 20, max: 30 },
        'technical-field': { countEl: 'technical-field-count', warn: 15, max: null },
        'background': { countEl: 'background-count', warn: 60, max: null },
        'invention-content': { countEl: 'invention-content-count', warn: 120, max: null },
        'claims': { countEl: 'claims-count', warn: 80, max: null },
        'embodiments': { countEl: 'embodiments-count', warn: 120, max: null }
    };

    Object.entries(fieldCountMap).forEach(([fieldId, cfg]) => {
        const field = document.getElementById(fieldId);
        const countEl = document.getElementById(cfg.countEl);
        if (!field || !countEl) return;

        const update = () => {
            const len = field.value.length;
            countEl.textContent = `${len} 字`;
            countEl.className = 'char-count';
            if (cfg.max && len > cfg.max) {
                countEl.classList.add('warn');
            } else if (len >= cfg.warn) {
                countEl.classList.add('ok');
            }
        };

        field.addEventListener('input', update);
        update(); // 初始化
    });
}

/* ========== FAQ 折叠 ========== */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            const isOpen = answer.classList.contains('active');
            answer.classList.toggle('active', !isOpen);
            btn.setAttribute('aria-expanded', String(!isOpen));
        });
    });
}

/* ========== 导出按钮 ========== */
function initExportButtons() {
    document.getElementById('preview-btn')?.addEventListener('click', previewHTML);
    document.getElementById('print-btn')?.addEventListener('click', printDocument);
    document.getElementById('download-btn')?.addEventListener('click', downloadDoc);
}

/* ========== 清除草稿 ========== */
function initClearDraft() {
    document.getElementById('clear-draft-btn')?.addEventListener('click', () => {
        if (confirm('确认清除所有已保存的草稿和版本历史？此操作不可撤销。')) {
            localStorage.removeItem('patentDisclosureDraft');
            localStorage.removeItem('patentDisclosureHistory');
            document.querySelectorAll('[data-disclosure-field]').forEach(f => f.value = '');
            initCharCounts();
            DisclosureWizard.renderHistory([]);
            showToast('草稿已清除', 'info');
        }
    });
}

/* ========== 打印 ========== */
function printDocument() {
    DisclosureWizard.persist('manual', { force: true });
    const inputs = getAllInputs();
    const hasContent = Object.values(inputs).some(v => v.trim());
    if (!hasContent) {
        showToast('请先填写交底书内容再打印', 'error');
        return;
    }

    const win = window.open('', '_blank');
    if (!win) { showToast('请允许弹出窗口以打印', 'error'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>专利交底书 - ${escapeHtml(inputs.inventionName) || '未命名'}</title>
<style>
  body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; margin: 2cm; line-height: 1.8; color: #1e293b; font-size: 12pt; }
  h1 { text-align: center; font-size: 20pt; margin-bottom: 32pt; color: #1e293b; }
  h2 { font-size: 14pt; color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 4pt; margin-top: 24pt; }
  p { margin: 8pt 0; text-align: justify; white-space: pre-wrap; }
  .meta { margin-top: 32pt; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8pt; }
  @page { margin: 2cm; }
</style>
</head>
<body>
  <h1>专利交底书</h1>
  <h2>一、发明名称</h2>
  <p>${escapeHtml(inputs.inventionName) || '（未填写）'}</p>
  <h2>二、技术领域</h2>
  <p>${escapeHtml(inputs.technicalField) || '（未填写）'}</p>
  <h2>三、背景技术</h2>
  <p>${escapeHtml(inputs.background) || '（未填写）'}</p>
  <h2>四、发明内容</h2>
  <p>${escapeHtml(inputs.inventionContent) || '（未填写）'}</p>
  <h2>五、权利要求</h2>
  <p>${escapeHtml(inputs.claims) || '（未填写）'}</p>
  <h2>六、具体实施方式</h2>
  <p>${escapeHtml(inputs.embodiments) || '（未填写）'}</p>
  <div class="meta">生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
}

/* ========== HTML预览 ========== */
function previewHTML() {
    DisclosureWizard.persist('manual', { force: true });
    DisclosureWizard.validateAllSteps({ showMessages: false });

    const inputs = getAllInputs();
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.getElementById('preview-container');

    const html = `
        <div style="font-family: -apple-system, 'Microsoft YaHei', sans-serif; line-height: 1.8; color: #1e293b;">
            <h1 style="text-align: center; font-size: 22px; margin-bottom: 28px; color: #1e293b;">专利交底书</h1>
            ${buildPreviewSection('一、发明名称', inputs.inventionName)}
            ${buildPreviewSection('二、技术领域', inputs.technicalField)}
            ${buildPreviewSection('三、背景技术', inputs.background)}
            ${buildPreviewSection('四、发明内容', inputs.inventionContent)}
            ${buildPreviewSection('五、权利要求', inputs.claims)}
            ${buildPreviewSection('六、具体实施方式', inputs.embodiments)}
            <div style="margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                预览生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}
            </div>
        </div>
    `;

    if (previewContent && previewContainer) {
        previewContent.innerHTML = html;
        previewContainer.style.display = 'block';
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function buildPreviewSection(title, content) {
    const text = content
        ? `<p style="margin: 12px 0; white-space: pre-wrap;">${escapeHtml(content)}</p>`
        : `<p style="margin: 12px 0; color: #94a3b8; font-style: italic;">（未填写）</p>`;
    return `<h2 style="font-size: 16px; color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 4px; margin-top: 24px;">${escapeHtml(title)}</h2>${text}`;
}

/* ========== 下载Word文档 ========== */
function downloadDoc() {
    const ready = DisclosureWizard.validateAllSteps({ showMessages: true, focus: true });
    if (!ready) {
        showToast('请先完善所有步骤并通过校验后再导出', 'error', 3000);
        return;
    }

    DisclosureWizard.persist('export', { force: true });

    const inputs = getAllInputs();
    const formattedTimestamp = new Date().toLocaleString('zh-CN', { hour12: false });

    const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
  body { font-family: '宋体', 'SimSun', serif; line-height: 2; margin: 2cm 3cm; font-size: 12pt; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 24pt; }
  h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 6pt; }
  p { margin: 6pt 0; text-indent: 2em; white-space: pre-wrap; }
  .meta { font-size: 10pt; color: #666; margin-top: 24pt; }
</style>
</head>
<body>
  <h1>专利交底书</h1>
  <h2>一、发明名称</h2>
  <p>${escapeHtml(inputs.inventionName)}</p>
  <h2>二、技术领域</h2>
  <p>${escapeHtml(inputs.technicalField)}</p>
  <h2>三、背景技术</h2>
  <p>${escapeHtml(inputs.background)}</p>
  <h2>四、发明内容</h2>
  <p>${escapeHtml(inputs.inventionContent)}</p>
  <h2>五、权利要求</h2>
  <p>${escapeHtml(inputs.claims)}</p>
  <h2>六、具体实施方式</h2>
  <p>${escapeHtml(inputs.embodiments)}</p>
  <div class="meta">导出时间：${formattedTimestamp}</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (inputs.inventionName || '未命名').replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    a.download = `专利交底书_${safeName}_${formattedTimestamp.replace(/[^0-9]/g, '').substring(0, 14)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('文档导出成功', 'success');
}

/* ========== 工具函数 ========== */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

/* ========== 交底书向导 ========== */
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
                value => value.trim().length <= 30 ? '' : '建议控制在25个字以内。',
                value => {
                    const t = value.trim();
                    return !t || /^一种/.test(t) ? '' : '建议以"一种..."开头，符合专利命名规范。';
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
                    const count = keywords.filter(k => value.includes(k)).length;
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
    let wizardPercentEl = null;
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
        wizardPercentEl = document.getElementById('wizard-percent');
        autosaveStatusEl = document.getElementById('autosave-status');

        if (!wizardSteps.length || !wizardPanels.length) return;

        wizardSteps.forEach(stepButton => {
            stepButton.addEventListener('click', () => {
                const index = Number(stepButton.dataset.step);
                if (index === currentStep) return;
                if (!validateStep(currentStep, { showMessage: true })) return;
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
                    showToast('交底书已完成！请前往"输出文档"导出。', 'success', 4000);
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

        // 键盘导航：左/右方向键切换步骤
        document.addEventListener('keydown', event => {
            const disclosure = document.getElementById('disclosure');
            if (!disclosure?.classList.contains('active')) return;
            if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT') return;
            if (event.key === 'ArrowRight' && currentStep < stepConfigs.length - 1) {
                if (validateStep(currentStep, { showMessage: true })) goToStep(currentStep + 1);
            } else if (event.key === 'ArrowLeft' && currentStep > 0) {
                goToStep(currentStep - 1);
            }
        });

        restoreDraft();
        renderHistory();
        updateWizardUI();
    }

    function goToStep(index) {
        currentStep = Math.min(Math.max(index, 0), stepConfigs.length - 1);
        if (wizardCompleted) wizardCompleted = false;

        wizardSteps.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === currentStep);
            btn.setAttribute('aria-selected', String(idx === currentStep));
        });
        wizardPanels.forEach((panel, idx) => panel.classList.toggle('active', idx === currentStep));
        updateWizardUI();
    }

    function validateStep(stepIndex, { showMessage = false } = {}) {
        const config = stepConfigs[stepIndex];
        if (!config) return true;
        const field = document.getElementById(config.id);
        const validationId = `${config.id}-validation`;
        const messageEl = document.getElementById(validationId) ||
            document.querySelector(`[data-validation-for="${config.id}"]`);
        if (!field || !messageEl) return true;

        const value = field.value || '';
        const errors = config.validators.map(v => v(value)).filter(Boolean);

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
            if (!result && firstInvalidIndex === null) firstInvalidIndex = index;
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
        const completedCount = wizardSteps.filter(btn => btn.classList.contains('completed')).length;
        const percentage = Math.round((completedCount / stepConfigs.length) * 100);
        progressFill.style.width = `${percentage}%`;
        if (wizardStatusEl) wizardStatusEl.textContent = `步骤 ${currentStep + 1} / ${stepConfigs.length}`;
        if (wizardPercentEl) wizardPercentEl.textContent = `${percentage}%`;
        updateWizardButtons();
    }

    function updateWizardButtons() {
        if (prevBtn) prevBtn.disabled = currentStep === 0;
        if (nextBtn) {
            if (wizardCompleted) {
                nextBtn.disabled = true;
                nextBtn.textContent = '已完成全部步骤 ✅';
                return;
            }
            nextBtn.disabled = false;
            nextBtn.textContent = currentStep === stepConfigs.length - 1 ? '完成并复核' : '保存并进入下一步';
        }
    }

    function scheduleSave(type) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => persistDraft(type), 800);
    }

    function persistDraft(type = 'manual', { force = false } = {}) {
        const inputs = getAllInputs();
        const snapshot = JSON.stringify(inputs);
        if (!force && type === 'autosave' && snapshot === lastSnapshot) return;
        lastSnapshot = snapshot;
        const timestamp = new Date().toISOString();
        writeStorage(STORAGE_KEY, { updatedAt: timestamp, data: inputs });
        lastSavedAt = timestamp;
        updateAutosaveStatus(formatStatusMessage(type, timestamp));
        updateHistory(type, timestamp);
    }

    function restoreDraft() {
        const stored = readStorage(STORAGE_KEY, null);
        if (stored && stored.data) {
            Object.entries(stored.data).forEach(([key, value]) => {
                const field = document.querySelector(`[data-disclosure-field="${key}"]`);
                if (field) field.value = value;
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
        if (autosaveStatusEl && message) autosaveStatusEl.textContent = message;
    }

    function updateHistory(type, timestamp) {
        const history = readStorage(HISTORY_KEY, []);
        const lastRecord = history[history.length - 1];
        if (type === 'autosave' && lastRecord) {
            const delta = Math.abs(new Date(timestamp) - new Date(lastRecord.timestamp));
            if (lastRecord.type === 'autosave' && delta < 60000) {
                history[history.length - 1] = { type, timestamp };
                writeStorage(HISTORY_KEY, history);
                renderHistory(history);
                return;
            }
        }
        history.push({ type, timestamp });
        if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
        writeStorage(HISTORY_KEY, history);
        renderHistory(history);
    }

    function renderHistory(history = null) {
        const listEl = document.getElementById('version-list');
        const emptyEl = document.getElementById('version-empty');
        if (!listEl || !emptyEl) return;
        const records = history ?? readStorage(HISTORY_KEY, []);
        listEl.innerHTML = '';
        if (!records.length) { emptyEl.style.display = 'block'; return; }
        emptyEl.style.display = 'none';
        records.slice().reverse().forEach(record => {
            const item = document.createElement('li');
            item.textContent = `${formatHistoryLabel(record.type)} · ${formatTimestamp(record.timestamp)}`;
            listEl.appendChild(item);
        });
    }

    function formatHistoryLabel(type) {
        const labels = { autosave: '🔄 自动保存', export: '📥 导出记录' };
        return labels[type] || '💾 手动保存';
    }

    function formatStatusMessage(type, timestamp) {
        const f = formatTimestamp(timestamp);
        if (type === 'autosave') return `🔄 自动保存于 ${f}`;
        if (type === 'export') return `📥 导出前已锁定（${f}）`;
        return `💾 已保存于 ${f}`;
    }

    function formatTimestamp(timestamp) {
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).format(new Date(timestamp));
        } catch (e) {
            return timestamp;
        }
    }

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function writeStorage(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 存储满 */ }
    }

    return {
        init,
        validateAllSteps: options => validateAllSteps(options),
        persist: (type = 'manual', options) => persistDraft(type, options || {}),
        getLastSavedAt: () => lastSavedAt,
        renderHistory
    };
})();

/* ========== 旧版 FAQ 兼容（HTML 中 onclick） ========== */
function toggleFAQ(element) {
    const answer = element.nextElementSibling;
    answer.classList.toggle('active');
    element.classList.toggle('active');
    const icon = element.querySelector('.faq-icon');
    if (icon) icon.style.transform = answer.classList.contains('active') ? 'rotate(180deg)' : '';
}
