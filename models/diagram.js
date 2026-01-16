// Data models for ER Diagram

export class Attribute {
    constructor(name = '', dataType = 'VARCHAR', isPrimaryKey = false, isForeignKey = false) {
        this.name = name;
        this.dataType = dataType;
        this.isPrimaryKey = isPrimaryKey;
        this.isForeignKey = isForeignKey;
    }

    toJSON() {
        return {
            name: this.name,
            dataType: this.dataType,
            isPrimaryKey: this.isPrimaryKey,
            isForeignKey: this.isForeignKey
        };
    }

    static fromJSON(json) {
        return new Attribute(json.name, json.dataType, json.isPrimaryKey, json.isForeignKey);
    }
}

export class Entity {
    constructor(id, name, x = 100, y = 100) {
        this.id = id;
        this.name = name;
        this.attributes = [];
        this.x = x;
        this.y = y;
        this.width = 200;
        this.height = 150;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.suggestedTableType = 'Unknown';
        this.tableType = 'Unknown'; // User selected type
    }

    analyzeTableType(relationships = []) {
        const factKeywords = ['fact', 'score', 'amount', 'total', 'price', 'quantity', 'date', 'time', 'sum', 'count', 'transaction', 'event', 'measure', 'history', 'log'];
        const nameLower = this.name.toLowerCase();

        let score = 0;

        // Name heuristic
        if (factKeywords.some(kw => nameLower.includes(kw))) score += 2;
        if (nameLower.endsWith('s')) score += 1; // Plural names are often facts

        // Attribute heuristic
        const measures = this.attributes.filter(attr =>
            factKeywords.some(kw => attr.name.toLowerCase().includes(kw)) &&
            ['INTEGER', 'FLOAT', 'DECIMAL', 'NUMERIC'].includes(attr.dataType.toUpperCase())
        );
        score += measures.length;

        // Relationship heuristic (Fact tables usually have multiple incoming FK relationships)
        const incomingRels = relationships.filter(rel =>
            (rel.toEntityId === this.id && rel.type === 'one-to-many') ||
            (rel.fromEntityId === this.id && rel.type === 'many-to-one')
        );
        score += incomingRels.length * 2;

        if (score >= 3) {
            this.suggestedTableType = 'Fact';
        } else {
            this.suggestedTableType = 'Dimension';
        }

        return this.suggestedTableType;
    }

    addAttribute(attribute) {
        this.attributes.push(attribute);
        this.updateHeight();
    }

    removeAttribute(index) {
        this.attributes.splice(index, 1);
        this.updateHeight();
    }

    updateHeight() {
        // Calculate height based on number of attributes
        const headerHeight = 40;
        const attributeHeight = 25;
        const padding = 20;
        this.height = headerHeight + (this.attributes.length * attributeHeight) + padding;
        if (this.height < 100) this.height = 100;
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            attributes: this.attributes.map(attr => attr.toJSON()),
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            color: this.color,
            suggestedTableType: this.suggestedTableType,
            tableType: this.tableType
        };
    }

    static fromJSON(json) {
        const entity = new Entity(json.id, json.name, json.x, json.y);
        entity.width = json.width;
        entity.height = json.height;
        entity.color = json.color;
        entity.attributes = json.attributes.map(attr => Attribute.fromJSON(attr));
        entity.suggestedTableType = json.suggestedTableType || 'Unknown';
        entity.tableType = json.tableType || 'Unknown';
        return entity;
    }
}

export class Relationship {
    constructor(id, fromEntityId, toEntityId, type = 'one-to-many', name = '') {
        this.id = id;
        this.fromEntityId = fromEntityId;
        this.toEntityId = toEntityId;
        this.type = type; // one-to-one, one-to-many, many-to-one, many-to-many
        this.name = name;
    }

    getCardinalityLabel() {
        const labels = {
            'one-to-one': '1:1',
            'one-to-many': '1:N',
            'many-to-one': 'N:1',
            'many-to-many': 'N:M'
        };
        return labels[this.type] || '1:N';
    }

    toJSON() {
        return {
            id: this.id,
            fromEntityId: this.fromEntityId,
            toEntityId: this.toEntityId,
            type: this.type,
            name: this.name
        };
    }

    static fromJSON(json) {
        return new Relationship(json.id, json.fromEntityId, json.toEntityId, json.type, json.name);
    }
}

export class Diagram {
    constructor(name = 'Untitled Diagram') {
        this.name = name;
        this.entities = [];
        this.relationships = [];
        this.nextEntityId = 1;
        this.nextRelationId = 1;
    }

    addEntity(entity) {
        if (!entity.id) {
            entity.id = this.nextEntityId++;
        } else {
            this.nextEntityId = Math.max(this.nextEntityId, entity.id + 1);
        }
        this.entities.push(entity);
        return entity;
    }

    removeEntity(entityId) {
        // Remove entity
        this.entities = this.entities.filter(e => e.id !== entityId);
        // Remove relationships connected to this entity
        this.relationships = this.relationships.filter(
            r => r.fromEntityId !== entityId && r.toEntityId !== entityId
        );
    }

    getEntity(entityId) {
        return this.entities.find(e => e.id === entityId);
    }

    addRelationship(relationshipData) {
        let relationship;
        if (relationshipData instanceof Relationship) {
            relationship = relationshipData;
        } else {
            relationship = new Relationship(
                relationshipData.id,
                relationshipData.fromEntityId,
                relationshipData.toEntityId,
                relationshipData.type,
                relationshipData.name
            );
        }

        if (!relationship.id) {
            relationship.id = this.nextRelationId++;
        } else {
            this.nextRelationId = Math.max(this.nextRelationId, relationship.id + 1);
        }
        this.relationships.push(relationship);
        return relationship;
    }

    removeRelationship(relationId) {
        this.relationships = this.relationships.filter(r => r.id !== relationId);
    }

    getRelationship(relationId) {
        return this.relationships.find(r => r.id === relationId);
    }

    toJSON() {
        return {
            name: this.name,
            entities: this.entities.map(e => e.toJSON()),
            relationships: this.relationships.map(r => r.toJSON()),
            nextEntityId: this.nextEntityId,
            nextRelationId: this.nextRelationId
        };
    }

    static fromJSON(json) {
        const diagram = new Diagram(json.name);
        diagram.entities = json.entities.map(e => Entity.fromJSON(e));
        diagram.relationships = json.relationships.map(r => Relationship.fromJSON(r));
        diagram.nextEntityId = json.nextEntityId || 1;
        diagram.nextRelationId = json.nextRelationId || 1;
        return diagram;
    }
}
