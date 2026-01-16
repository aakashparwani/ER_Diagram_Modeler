// File upload and image handling module

export class Uploader {
    constructor(onImageSelected) {
        this.onImageSelected = onImageSelected;
        this.currentImage = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const removeBtn = document.getElementById('removeImage');

        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFile(e.target.files[0]);
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            this.handleFile(file);
        });

        // Remove image
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearImage();
        });
    }

    handleFile(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file (PNG, JPG, etc.)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB');
            return;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            this.showPreview(e.target.result);
            if (this.onImageSelected) {
                this.onImageSelected(e.target.result);
            }
        };
        reader.onerror = () => {
            this.showError('Failed to read file');
        };
        reader.readAsDataURL(file);
    }

    showPreview(imageData) {
        const dropZone = document.getElementById('dropZone');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImage');
        const parseBtn = document.getElementById('parseBtn');

        dropZone.classList.add('hidden');
        preview.classList.remove('hidden');
        parseBtn.classList.remove('hidden');
        previewImg.src = imageData;
    }

    clearImage() {
        const dropZone = document.getElementById('dropZone');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImage');
        const parseBtn = document.getElementById('parseBtn');
        const fileInput = document.getElementById('fileInput');

        this.currentImage = null;
        dropZone.classList.remove('hidden');
        preview.classList.add('hidden');
        parseBtn.classList.add('hidden');
        previewImg.src = '';
        fileInput.value = '';
    }

    getCurrentImage() {
        return this.currentImage;
    }

    showError(message) {
        // Simple alert for now, could be enhanced with a toast notification
        alert(message);
    }
}
