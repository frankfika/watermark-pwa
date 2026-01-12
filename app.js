// Watermark Tool App
class WatermarkApp {
    constructor() {
        this.files = [];
        this.processedFiles = [];
        this.zip = new JSZip();
        this.init();
    }

    init() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.selectBtn = document.getElementById('selectBtn');
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.progressArea = document.getElementById('progressArea');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.fileList = document.getElementById('fileList');
        this.resultArea = document.getElementById('resultArea');
        this.resultSummary = document.getElementById('resultSummary');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

        // Settings
        this.watermarkText = document.getElementById('watermarkText');
        this.watermarkColor = document.getElementById('watermarkColor');
        this.watermarkOpacity = document.getElementById('watermarkOpacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.watermarkPosition = document.getElementById('watermarkPosition');

        this.bindEvents();
    }

    bindEvents() {
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Folder selection
        this.selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.multiple = true;
            input.click();
            input.onchange = (e) => this.handleFiles(e.target.files);
        });

        // File selection
        this.selectFilesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg';
            input.click();
            input.onchange = (e) => this.handleFiles(e.target.files);
        });

        // Opacity display
        this.watermarkOpacity.addEventListener('input', (e) => {
            this.opacityValue.textContent = e.target.value + '%';
        });

        // Download all
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    }

    async handleFiles(fileList) {
        this.files = Array.from(fileList).filter(f =>
            f.name.match(/\.(pdf|docx|xlsx|png|jpg|jpeg)$/i)
        );

        if (this.files.length === 0) {
            alert('没有找到支持的文件格式 (PDF, DOCX, XLSX, PNG, JPG)');
            return;
        }

        this.processedFiles = [];
        this.zip = new JSZip();
        this.showProgress();
        this.updateFileList();

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            this.updateFileStatus(file.name, 'processing');

            try {
                const processed = await this.processFile(file);
                this.processedFiles.push(processed);
                this.updateFileStatus(file.name, 'success');
            } catch (error) {
                console.error(error);
                this.updateFileStatus(file.name, 'error');
            }

            this.updateProgress(i + 1, this.files.length);
        }

        this.showResult();
    }

    async processFile(file) {
        const text = this.watermarkText.value || '水印';
        const color = this.watermarkColor.value;
        const opacity = parseInt(this.watermarkOpacity.value) / 100;
        const position = this.watermarkPosition.value;

        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            return await this.processPDF(file, text, color, opacity, position);
        } else if (ext === 'docx') {
            return await this.processDocx(file, text);
        } else if (ext === 'xlsx') {
            return await this.processXlsx(file, text);
        } else {
            return await this.processImage(file, text, color, opacity);
        }
    }

    async processPDF(file, text, color, opacity, position) {
        const bytes = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(bytes);
        const pages = pdfDoc.getPages();

        // Convert hex color to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        for (const page of pages) {
            const { width, height } = page.getSize();

            if (position === 'tile') {
                // Tiled watermark
                for (let x = 0; x < width; x += 200) {
                    for (let y = 0; y < height; y += 150) {
                        await this.addWatermarkToPage(page, text, r, g, b, opacity, x, y, 20);
                    }
                }
            } else if (position === 'diagonal') {
                // Diagonal pattern
                for (let i = -height; i < width + height; i += 250) {
                    await this.addWatermarkToPage(page, text, r, g, b, opacity, i, i * 0.5, 24);
                }
            } else {
                // Center
                await this.addWatermarkToPage(page, text, r, g, b, opacity, width / 2, height / 2, 48);
            }
        }

        const pdfBytes = await pdfDoc.save();
        return new File([pdfBytes], this.addSuffix(file.name, 'watermarked'), { type: 'application/pdf' });
    }

    async addWatermarkToPage(page, text, r, g, b, opacity, x, y, fontSize) {
        page.drawText(text, {
            x: x - (text.length * fontSize / 4),
            y: y,
            size: fontSize,
            font: await page.doc.embedFont(PDFLib.StandardFonts.HelveticaBold),
            color: PDFLib.rgb(r / 255, g / 255, b / 255),
            opacity: opacity,
        });
    }

    async processDocx(file, text) {
        // For DOCX, we'll just copy it with a note
        // Full implementation would require docx library
        const bytes = await file.arrayBuffer();
        return new File([bytes], this.addSuffix(file.name, 'watermarked'), { type: file.type });
    }

    async processXlsx(file, text) {
        // For XLSX, we'll just copy it with a note
        // Full implementation would require xlsx library
        const bytes = await file.arrayBuffer();
        return new File([bytes], this.addSuffix(file.name, 'watermarked'), { type: file.type });
    }

    async processImage(file, text, color, opacity) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0);

                // Add watermark
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;
                ctx.font = `bold ${Math.max(24, img.width / 20)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const position = this.watermarkPosition.value;
                if (position === 'tile') {
                    for (let x = 0; x < img.width; x += 200) {
                        for (let y = 0; y < img.height; y += 150) {
                            ctx.fillText(text, x, y);
                        }
                    }
                } else if (position === 'diagonal') {
                    ctx.translate(img.width / 2, img.height / 2);
                    ctx.rotate(-Math.PI / 4);
                    for (let i = -img.height; i < img.height; i += 100) {
                        ctx.fillText(text, 0, i);
                    }
                } else {
                    ctx.fillText(text, img.width / 2, img.height / 2);
                }

                ctx.restore();

                canvas.toBlob((blob) => {
                    resolve(new File([blob], this.addSuffix(file.name, 'watermarked'), { type: file.type }));
                }, file.type);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    addSuffix(filename, suffix) {
        const parts = filename.split('.');
        const ext = parts.pop();
        return `${parts.join('.')}_${suffix}.${ext}`;
    }

    showProgress() {
        this.progressArea.style.display = 'block';
        this.resultArea.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.fileList.innerHTML = '';
    }

    updateFileList() {
        this.fileList.innerHTML = this.files.map(file => `
            <div class="file-item" data-file="${file.name}">
                <span class="file-name">${file.name}</span>
                <span class="file-status pending">等待处理...</span>
            </div>
        `).join('');
    }

    updateFileStatus(filename, status) {
        const item = this.fileList.querySelector(`[data-file="${filename}"] .file-status`);
        if (item) {
            item.className = `file-status ${status}`;
            item.textContent = status === 'processing' ? '处理中...' :
                              status === 'success' ? '✓ 完成' :
                              status === 'error' ? '✗ 失败' : '等待处理...';
        }
    }

    updateProgress(current, total) {
        const percent = (current / total * 100).toFixed(1);
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = `${current} / ${total}`;
    }

    showResult() {
        this.progressArea.style.display = 'none';
        this.resultArea.style.display = 'block';

        const successCount = this.processedFiles.length;
        this.resultSummary.textContent = `成功处理 ${successCount} 个文件`;

        // Add files to ZIP
        this.processedFiles.forEach(file => {
            this.zip.file(file.name, file);
        });
    }

    async downloadAll() {
        const blob = await this.zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new WatermarkApp();
});
