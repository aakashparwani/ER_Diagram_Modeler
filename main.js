// Main application entry point

import { Diagram, Entity, Attribute, Relationship } from './models/diagram.js';
import { config } from './modules/config.js';
import { parser } from './modules/parser.js';
import { Uploader } from './modules/uploader.js';
import { Editor } from './modules/editor.js';
import { Exporter } from './modules/exporter.js';

class App {
    constructor() {
        this.diagram = new Diagram();
        this.uploader = null;
        this.editor = null;
        this.exporter = null;
        this.currentEditingEntity = null;
        this.currentEditingRelation = null;

        this.init();
    }

    init() {
        // Initialize uploader
        this.uploader = new Uploader((imageData) => {
            // Image selected callback
            console.log('Image selected');
        });

        // Setup UI event listeners
        this.setupEventListeners();

        // Check if API key is configured
        if (!config.hasApiKey()) {
            setTimeout(() => {
                this.showSettingsModal();
            }, 500);
        }
    }

    setupEventListeners() {
        // Parse button
        document.getElementById('parseBtn').addEventListener('click', async () => {
            await this.handleParse();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Settings modal
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Toolbar buttons
        document.getElementById('addEntityBtn').addEventListener('click', () => {
            this.addNewEntity();
        });

        document.getElementById('addRelationBtn').addEventListener('click', () => {
            this.addNewRelationship();
        });

        document.getElementById('zoomIn').addEventListener('click', () => {
            if (this.editor) this.editor.zoomIn();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            if (this.editor) this.editor.zoomOut();
        });

        document.getElementById('resetZoom').addEventListener('click', () => {
            if (this.editor) this.editor.resetView();
        });

        // Export buttons
        document.getElementById('exportPng').addEventListener('click', () => {
            if (this.exporter) this.exporter.exportAsPNG();
        });

        document.getElementById('exportJson').addEventListener('click', () => {
            if (this.exporter) {
                console.log('Exporting as JSON...');
                this.exporter.exportAsJSON();
            }
        });

        document.getElementById('exportSql').addEventListener('click', () => {
            if (this.exporter) this.exporter.exportAsSQL();
        });

        document.getElementById('newDiagramBtn').addEventListener('click', () => {
            this.createNewDiagram();
        });

        // Entity modal
        document.getElementById('saveEntity').addEventListener('click', () => {
            this.saveEntity();
        });

        document.getElementById('deleteEntity').addEventListener('click', () => {
            this.deleteEntity();
        });

        document.getElementById('addAttributeBtn').addEventListener('click', () => {
            this.addAttributeField();
        });

        // Relationship modal
        document.getElementById('saveRelation').addEventListener('click', () => {
            this.saveRelationship();
        });

        document.getElementById('deleteRelation').addEventListener('click', () => {
            this.deleteRelationship();
        });
    }

    async handleParse() {
        const imageData = this.uploader.getCurrentImage();
        if (!imageData) {
            alert('Please select an image first');
            return;
        }

        if (!config.hasApiKey()) {
            alert('Please configure your Claude API key in Settings');
            this.showSettingsModal();
            return;
        }

        // Show parsing status
        const statusDiv = document.getElementById('parsingStatus');
        const parseBtn = document.getElementById('parseBtn');
        parseBtn.classList.add('hidden');
        statusDiv.classList.remove('hidden');

        try {
            const parsedDiagram = await parser.parseImage(imageData);
            this.diagram = parsedDiagram;
            this.showEditor();
            this.uploader.clearImage();
        } catch (error) {
            console.error('SYSTEM_ERROR_REPORT:', error);

            let displayMessage = error.message;
            if (error.message.includes('format')) {
                displayMessage += "\n\nTip: Try changing the 'Model' in Settings to 'Claude 3.5 Sonnet'.";
            }

            alert(`Parsing Failed:\n${displayMessage}`);
        } finally {
            statusDiv.classList.add('hidden');
            parseBtn.classList.remove('hidden');
        }
    }

    showEditor() {
        // Hide upload section
        document.getElementById('uploadSection').classList.add('hidden');

        // Show editor section
        const editorSection = document.getElementById('editorSection');
        editorSection.classList.remove('hidden');

        // Initialize editor if not already done
        if (!this.editor) {
            const canvas = document.getElementById('diagramCanvas');
            this.editor = new Editor(canvas, this.diagram);
            this.editor.onEntitySelected = (entity, editMode) => {
                if (editMode) {
                    this.editEntity(entity);
                }
            };
            this.editor.onRelationshipSelected = (relationship) => {
                this.editRelationship(relationship);
            };
            this.exporter = new Exporter(this.editor, this.diagram);
        } else {
            this.editor.setDiagram(this.diagram);
        }

        if (this.exporter) {
            this.exporter.diagram = this.diagram;
        }
    }

    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        document.getElementById('apiKeyInput').value = config.getApiKey();
        document.getElementById('modelSelect').value = config.getModel();
        modal.classList.remove('hidden');
    }

    saveSettings() {
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        const model = document.getElementById('modelSelect').value;

        config.setApiKey(apiKey);
        config.setModel(model);

        document.getElementById('settingsModal').classList.add('hidden');
        alert('Settings saved successfully!');
    }

    addNewEntity() {
        // Create entity at center of current view
        const centerX = (this.editor.canvas.width / 2 - this.editor.offsetX) / this.editor.scale;
        const centerY = (this.editor.canvas.height / 2 - this.editor.offsetY) / this.editor.scale;

        const entity = new Entity(null, 'NewEntity', centerX - 100, centerY - 75);
        entity.addAttribute(new Attribute('id', 'INTEGER', true, false));

        this.diagram.addEntity(entity);
        this.editor.render();
        this.editEntity(entity);
    }

    editEntity(entity) {
        this.currentEditingEntity = entity;

        // Populate modal
        document.getElementById('entityName').value = entity.name;
        document.getElementById('tableType').value = entity.tableType || 'Unknown';

        // Clear and populate attributes
        const attributesList = document.getElementById('attributesList');
        attributesList.innerHTML = '';

        entity.attributes.forEach((attr, index) => {
            this.addAttributeField(attr, index);
        });

        // Show/hide delete button
        const deleteBtn = document.getElementById('deleteEntity');
        if (entity.id) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }

        // Analysis for Table Type (Fact vs Dimension)
        this.updateTableTypeBadge(entity);

        // Show modal
        document.getElementById('entityModal').classList.remove('hidden');
    }

    updateTableTypeBadge(entity) {
        const type = entity.analyzeTableType(this.diagram.relationships);
        const badge = document.getElementById('suggestedTypeBadge');
        badge.textContent = type;
        badge.className = 'type-badge ' + type.toLowerCase();
    }

    addAttributeField(attribute = null, index = null) {
        const attributesList = document.getElementById('attributesList');
        const div = document.createElement('div');
        div.className = 'attribute-item';
        div.dataset.index = index !== null ? index : -1;

        div.innerHTML = `
            <input type="text" placeholder="Attribute name" value="${attribute ? attribute.name : ''}" class="attr-name" />
            <select class="attr-type">
                <option value="INTEGER" ${attribute && attribute.dataType === 'INTEGER' ? 'selected' : ''}>INTEGER</option>
                <option value="VARCHAR" ${attribute && attribute.dataType === 'VARCHAR' ? 'selected' : ''}>VARCHAR</option>
                <option value="TEXT" ${attribute && attribute.dataType === 'TEXT' ? 'selected' : ''}>TEXT</option>
                <option value="BOOLEAN" ${attribute && attribute.dataType === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                <option value="DATE" ${attribute && attribute.dataType === 'DATE' ? 'selected' : ''}>DATE</option>
                <option value="FLOAT" ${attribute && attribute.dataType === 'FLOAT' ? 'selected' : ''}>FLOAT</option>
            </select>
            <label class="attribute-checkbox pk-label" title="Primary Key">
                <input type="checkbox" class="attr-pk" ${attribute && attribute.isPrimaryKey ? 'checked' : ''} />
                PK
            </label>
            <label class="attribute-checkbox fk-label" title="Foreign Key">
                <input type="checkbox" class="attr-fk" ${attribute && attribute.isForeignKey ? 'checked' : ''} />
                FK
            </label>
            <button type="button" class="btn-remove-attr">✕</button>
        `;

        div.querySelector('.btn-remove-attr').addEventListener('click', () => {
            div.remove();
        });

        attributesList.appendChild(div);
    }

    saveEntity() {
        if (!this.currentEditingEntity) return;

        const name = document.getElementById('entityName').value.trim();
        if (!name) {
            alert('Entity name is required');
            return;
        }

        this.currentEditingEntity.name = name;
        this.currentEditingEntity.tableType = document.getElementById('tableType').value;
        this.currentEditingEntity.attributes = [];

        // Collect attributes
        document.querySelectorAll('.attribute-item').forEach(item => {
            const attrName = item.querySelector('.attr-name').value.trim();
            if (attrName) {
                const attr = new Attribute(
                    attrName,
                    item.querySelector('.attr-type').value,
                    item.querySelector('.attr-pk').checked,
                    item.querySelector('.attr-fk').checked
                );
                this.currentEditingEntity.addAttribute(attr);
            }
        });

        this.currentEditingEntity.updateHeight();
        this.editor.render();

        document.getElementById('entityModal').classList.add('hidden');
        this.currentEditingEntity = null;
    }

    deleteEntity() {
        if (!this.currentEditingEntity) return;

        if (confirm(`Are you sure you want to delete entity "${this.currentEditingEntity.name}"?`)) {
            this.diagram.removeEntity(this.currentEditingEntity.id);
            this.editor.render();
            document.getElementById('entityModal').classList.add('hidden');
            this.currentEditingEntity = null;
        }
    }

    addNewRelationship() {
        if (this.diagram.entities.length < 2) {
            alert('Please add at least 2 entities before creating relationships');
            return;
        }

        this.currentEditingRelation = null;
        this.showRelationshipModal();
    }

    editRelationship(relationship) {
        this.currentEditingRelation = relationship;
        this.showRelationshipModal(relationship);
    }

    showRelationshipModal(relationship = null) {
        const fromSelect = document.getElementById('fromEntity');
        const toSelect = document.getElementById('toEntity');

        // Populate entity selects
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        this.diagram.entities.forEach(entity => {
            const option1 = new Option(entity.name, entity.id);
            const option2 = new Option(entity.name, entity.id);
            fromSelect.add(option1);
            toSelect.add(option2);
        });

        if (relationship) {
            fromSelect.value = relationship.fromEntityId;
            toSelect.value = relationship.toEntityId;
            document.getElementById('relationType').value = relationship.type;
            document.getElementById('relationName').value = relationship.name;
            document.getElementById('deleteRelation').classList.remove('hidden');
        } else {
            document.getElementById('relationType').value = 'one-to-many';
            document.getElementById('relationName').value = '';
            document.getElementById('deleteRelation').classList.add('hidden');
        }

        document.getElementById('relationModal').classList.remove('hidden');
    }

    saveRelationship() {
        const fromEntityId = parseInt(document.getElementById('fromEntity').value);
        const toEntityId = parseInt(document.getElementById('toEntity').value);
        const type = document.getElementById('relationType').value;
        const name = document.getElementById('relationName').value.trim();

        if (fromEntityId === toEntityId) {
            alert('Cannot create a relationship from an entity to itself');
            return;
        }

        if (this.currentEditingRelation) {
            // Update existing
            this.currentEditingRelation.fromEntityId = fromEntityId;
            this.currentEditingRelation.toEntityId = toEntityId;
            this.currentEditingRelation.type = type;
            this.currentEditingRelation.name = name;
        } else {
            // Create new
            const rel = new Relationship(
                null,
                fromEntityId,
                toEntityId,
                type,
                name
            );
            this.diagram.addRelationship(rel);
        }

        this.editor.render();
        document.getElementById('relationModal').classList.add('hidden');
        this.currentEditingRelation = null;
    }

    deleteRelationship() {
        if (!this.currentEditingRelation) return;

        if (confirm('Are you sure you want to delete this relationship?')) {
            this.diagram.removeRelationship(this.currentEditingRelation.id);
            this.editor.render();
            document.getElementById('relationModal').classList.add('hidden');
            this.currentEditingRelation = null;
        }
    }

    createNewDiagram() {
        if (confirm('Create a new diagram? Current work will be lost unless exported.')) {
            this.diagram = new Diagram();

            // Hide editor, show upload
            document.getElementById('editorSection').classList.add('hidden');
            document.getElementById('uploadSection').classList.remove('hidden');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
