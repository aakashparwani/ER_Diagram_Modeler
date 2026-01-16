// Canvas-based ER diagram editor

import { Relationship } from '../models/diagram.js';

export class Editor {
    constructor(canvas, diagram) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.diagram = diagram;

        // View state
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;

        // Interaction state
        this.selectedEntity = null;
        this.selectedRelationship = null;
        this.hoveredEntity = null;
        this.hoveredRelationship = null;
        this.isDragging = false;
        this.isPanning = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Callbacks
        this.onEntitySelected = null;
        this.onRelationshipSelected = null;

        this.setupCanvas();
        this.setupEventListeners();
        this.render();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.render();
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;

        // Check if clicking on an entity
        const clickedEntity = this.diagram.entities.find(entity =>
            entity.containsPoint(x, y)
        );

        if (clickedEntity) {
            this.selectedEntity = clickedEntity;
            this.selectedRelationship = null;
            this.isDragging = true;
            this.dragStartX = x - clickedEntity.x;
            this.dragStartY = y - clickedEntity.y;

            if (this.onEntitySelected) {
                this.onEntitySelected(clickedEntity);
            }
        } else {
            // Check if clicking on a relationship
            const clickedRelationship = this.findRelationshipAtPoint(x, y);

            if (clickedRelationship) {
                this.selectedRelationship = clickedRelationship;
                this.selectedEntity = null;

                if (this.onRelationshipSelected) {
                    this.onRelationshipSelected(clickedRelationship);
                }
            } else if (e.button === 0) { // Left click on empty space
                this.selectedEntity = null;
                this.selectedRelationship = null;
                this.isPanning = true;
                this.dragStartX = e.clientX - this.offsetX;
                this.dragStartY = e.clientY - this.offsetY;
            }
        }

        this.render();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;

        if (this.isDragging && this.selectedEntity) {
            this.selectedEntity.x = x - this.dragStartX;
            this.selectedEntity.y = y - this.dragStartY;
            this.render();
        } else if (this.isPanning) {
            this.offsetX = e.clientX - this.dragStartX;
            this.offsetY = e.clientY - this.dragStartY;
            this.render();
        } else {
            // Update hover state for entities
            const hoveredEntity = this.diagram.entities.find(entity =>
                entity.containsPoint(x, y)
            );

            // Update hover state for relationships
            const hoveredRelationship = this.findRelationshipAtPoint(x, y);

            if (hoveredEntity !== this.hoveredEntity || hoveredRelationship !== this.hoveredRelationship) {
                this.hoveredEntity = hoveredEntity;
                this.hoveredRelationship = hoveredRelationship;
                this.canvas.style.cursor = (hoveredEntity || hoveredRelationship) ? 'pointer' : 'grab';
                this.render();
            }
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isPanning = false;
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(0.3, Math.min(3, this.scale * zoom));

        // Zoom towards mouse position
        this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
        this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
        this.scale = newScale;

        this.render();
    }

    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;

        const clickedEntity = this.diagram.entities.find(entity =>
            entity.containsPoint(x, y)
        );

        if (clickedEntity && this.onEntitySelected) {
            this.onEntitySelected(clickedEntity, true); // true = edit mode
        }
    }

    findRelationshipAtPoint(x, y) {
        const threshold = 10 / this.scale; // Clickable area around the line

        for (const rel of this.diagram.relationships) {
            const fromEntity = this.diagram.getEntity(rel.fromEntityId);
            const toEntity = this.diagram.getEntity(rel.toEntityId);

            if (!fromEntity || !toEntity) continue;

            const fromX = fromEntity.x + fromEntity.width / 2;
            const fromY = fromEntity.y + fromEntity.height / 2;
            const toX = toEntity.x + toEntity.width / 2;
            const toY = toEntity.y + toEntity.height / 2;

            // Calculate distance from point to line segment
            const distance = this.pointToLineDistance(x, y, fromX, fromY, toX, toY);

            if (distance < threshold) {
                return rel;
            }
        }

        return null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq != 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw relationships first (behind entities)
        this.diagram.relationships.forEach(rel => {
            const isSelected = rel === this.selectedRelationship;
            const isHovered = rel === this.hoveredRelationship;
            this.drawRelationship(rel, isSelected, isHovered);
        });

        // Draw entities
        this.diagram.entities.forEach(entity => {
            const isSelected = entity === this.selectedEntity;
            const isHovered = entity === this.hoveredEntity;
            this.drawEntity(entity, isSelected, isHovered);
        });

        this.ctx.restore();
    }

    drawEntity(entity, isSelected, isHovered) {
        const { x, y, width, height, name, attributes } = entity;

        // Shadow for depth
        if (isSelected || isHovered) {
            this.ctx.shadowColor = 'rgba(138, 80, 255, 0.5)';
            this.ctx.shadowBlur = 20;
        }

        // Main entity box
        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--entity-bg').trim();
        this.ctx.strokeStyle = isSelected
            ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
            : getComputedStyle(document.documentElement).getPropertyValue('--entity-border').trim();
        this.ctx.lineWidth = isSelected ? 3 : 2;

        this.roundRect(x, y, width, height, 8);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Header section
        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--entity-header-bg').trim();
        this.ctx.beginPath();
        this.ctx.moveTo(x + 8, y);
        this.ctx.lineTo(x + width - 8, y);
        this.ctx.arcTo(x + width, y, x + width, y + 8, 8);
        this.ctx.lineTo(x + width, y + 35);
        this.ctx.lineTo(x, y + 35);
        this.ctx.lineTo(x, y + 8);
        this.ctx.arcTo(x, y, x + 8, y, 8);
        this.ctx.closePath();
        this.ctx.fill();

        // Entity name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, x + width / 2, y + 22);

        // Attributes
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = '14px Inter, sans-serif';
        this.ctx.textAlign = 'left';

        attributes.forEach((attr, index) => {
            const attrY = y + 55 + (index * 25);

            // Primary key indicator
            if (attr.isPrimaryKey) {
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillText('🔑', x + 10, attrY);
            } else if (attr.isForeignKey) {
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.fillText('🔗', x + 10, attrY);
            }

            // Attribute name
            this.ctx.fillStyle = '#e0e0e0';
            const nameX = (attr.isPrimaryKey || attr.isForeignKey) ? x + 30 : x + 10;
            this.ctx.fillText(attr.name, nameX, attrY);

            // Data type
            this.ctx.fillStyle = '#9ca3af';
            this.ctx.font = '12px Inter, sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(attr.dataType, x + width - 10, attrY);
            this.ctx.textAlign = 'left';
            this.ctx.font = '14px Inter, sans-serif';
        });
    }

    drawRelationship(rel, isSelected, isHovered) {
        const fromEntity = this.diagram.getEntity(rel.fromEntityId);
        const toEntity = this.diagram.getEntity(rel.toEntityId);

        if (!fromEntity || !toEntity) return;

        // Shadow for depth
        if (isSelected || isHovered) {
            this.ctx.shadowColor = 'rgba(138, 80, 255, 0.5)';
            this.ctx.shadowBlur = 20;
        }

        // Calculate connection points (center of entities)
        const fromX = fromEntity.x + fromEntity.width / 2;
        const fromY = fromEntity.y + fromEntity.height / 2;
        const toX = toEntity.x + toEntity.width / 2;
        const toY = toEntity.y + toEntity.height / 2;

        // Draw line
        if (isSelected) {
            this.ctx.strokeStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--color-primary').trim();
            this.ctx.lineWidth = 3;
        } else if (isHovered) {
            this.ctx.strokeStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--color-secondary').trim();
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.strokeStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--relation-line').trim();
            this.ctx.lineWidth = 2;
        }
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // Draw cardinality label
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;

        const relationship = new Relationship(rel.id, rel.fromEntityId, rel.toEntityId, rel.type, rel.name);
        const label = relationship.getCardinalityLabel();

        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--bg-elevated').trim();
        this.ctx.font = 'bold 12px Inter, sans-serif';
        const metrics = this.ctx.measureText(label);
        const padding = 4;

        this.ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - 10 - padding,
            metrics.width + padding * 2,
            20 + padding * 2
        );

        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-secondary').trim();
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, midX, midY + 4);

        // Draw relationship name if exists
        if (rel.name) {
            this.ctx.fillStyle = '#9ca3af';
            this.ctx.font = '11px Inter, sans-serif';
            this.ctx.fillText(rel.name, midX, midY + 18);
        }
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
    }

    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const newScale = Math.min(3, this.scale * 1.2);

        this.offsetX = centerX - (centerX - this.offsetX) * (newScale / this.scale);
        this.offsetY = centerY - (centerY - this.offsetY) * (newScale / this.scale);
        this.scale = newScale;
        this.render();
    }

    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const newScale = Math.max(0.3, this.scale / 1.2);

        this.offsetX = centerX - (centerX - this.offsetX) * (newScale / this.scale);
        this.offsetY = centerY - (centerY - this.offsetY) * (newScale / this.scale);
        this.scale = newScale;
        this.render();
    }

    resetView() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.render();
    }

    setDiagram(diagram) {
        this.diagram = diagram;
        this.selectedEntity = null;
        this.render();
    }

    getSelectedEntity() {
        return this.selectedEntity;
    }
}
