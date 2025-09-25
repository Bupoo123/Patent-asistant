// 导航点击事件
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        const targetId = this.getAttribute('href').substring(1);
        document.getElementById(targetId).classList.add('active');
    });
});

// 复制到剪贴板功能
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

// FAQ切换功能
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

// 获取所有输入内容
function getAllInputs() {
    return {
        inventionName: document.getElementById('invention-name').value,
        technicalField: document.getElementById('technical-field').value,
        background: document.getElementById('background').value,
        inventionContent: document.getElementById('invention-content').value,
        claims: document.getElementById('claims').value,
        embodiments: document.getElementById('embodiments').value
    };
}

// HTML预览功能
function previewHTML() {
    const inputs = getAllInputs();
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.getElementById('preview-container');

    let html = `
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
        </div>
    `;

    previewContent.innerHTML = html;
    previewContainer.style.display = 'block';
    previewContainer.scrollIntoView({ behavior: 'smooth' });
}

// 下载Word文档功能
function downloadDoc() {
    const inputs = getAllInputs();

    const hasContent = Object.values(inputs).some(value => value.trim() !== '');
    if (!hasContent) {
        alert('请先填写专利交底书内容！');
        return;
    }

    const htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.8; margin: 40px; }
                h1 { text-align: center; color: #2c3e50; margin-bottom: 30px; }
                h2 { color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                p { margin: 15px 0; }
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
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `专利交底书_${inputs.inventionName || '未命名'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('文档下载成功！');
}

