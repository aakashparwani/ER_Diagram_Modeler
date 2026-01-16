// Export module for saving diagrams in various formats

export class Exporter {
    constructor(editor, diagram) {
        this.editor = editor;
        this.diagram = diagram;
    }

    exportAsPNG() {
        const canvas = this.editor.canvas;

        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with white background
        tempCtx.fillStyle = '#1a1a2e';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the diagram on top
        tempCtx.drawImage(canvas, 0, 0);

        // Convert to blob and download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.downloadFile(url, 'er-diagram.png');
            setTimeout(() => URL.revokeObjectURL(url), 100);
        });
    }

    exportAsJSON() {
        const json = JSON.stringify(this.diagram.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, 'er-diagram.json');

        // Use timeout to ensure browser starts download before revoking
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    exportAsSQL() {
        const sql = this.generateSQL();
        const blob = new Blob([sql], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, 'er-diagram.sql');
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    generateSQL() {
        let sql = '-- ER Diagram SQL Export\n';
        sql += `-- Generated: ${new Date().toISOString()}\n\n`;

        // Create tables for each entity
        this.diagram.entities.forEach(entity => {
            sql += `-- Table: ${entity.name}\n`;
            sql += `CREATE TABLE ${this.sanitizeName(entity.name)} (\n`;

            const columns = entity.attributes.map((attr, index) => {
                let column = `    ${this.sanitizeName(attr.name)} ${attr.dataType}`;

                if (attr.isPrimaryKey) {
                    column += ' PRIMARY KEY';
                }

                return column;
            });

            sql += columns.join(',\n');
            sql += '\n);\n\n';
        });

        // Add foreign key constraints based on relationships
        this.diagram.relationships.forEach(rel => {
            const fromEntity = this.diagram.getEntity(rel.fromEntityId);
            const toEntity = this.diagram.getEntity(rel.toEntityId);

            if (!fromEntity || !toEntity) return;

            sql += `-- Relationship: ${fromEntity.name} -> ${toEntity.name} (${rel.type})\n`;

            // Determine which table gets the foreign key based on relationship type
            if (rel.type === 'one-to-many' || rel.type === 'many-to-one') {
                const fkTable = rel.type === 'one-to-many' ? toEntity : fromEntity;
                const refTable = rel.type === 'one-to-many' ? fromEntity : toEntity;

                // Find primary key of referenced table
                const refPK = refTable.attributes.find(a => a.isPrimaryKey);
                if (refPK) {
                    sql += `ALTER TABLE ${this.sanitizeName(fkTable.name)}\n`;
                    sql += `    ADD COLUMN ${this.sanitizeName(refTable.name.toLowerCase() + '_id')} INTEGER,\n`;
                    sql += `    ADD FOREIGN KEY (${this.sanitizeName(refTable.name.toLowerCase() + '_id')})\n`;
                    sql += `        REFERENCES ${this.sanitizeName(refTable.name)}(${this.sanitizeName(refPK.name)});\n\n`;
                }
            } else if (rel.type === 'many-to-many') {
                // Create junction table
                const junctionName = `${fromEntity.name}_${toEntity.name}`;
                sql += `CREATE TABLE ${this.sanitizeName(junctionName)} (\n`;

                const fromPK = fromEntity.attributes.find(a => a.isPrimaryKey);
                const toPK = toEntity.attributes.find(a => a.isPrimaryKey);

                if (fromPK && toPK) {
                    sql += `    ${this.sanitizeName(fromEntity.name.toLowerCase() + '_id')} INTEGER,\n`;
                    sql += `    ${this.sanitizeName(toEntity.name.toLowerCase() + '_id')} INTEGER,\n`;
                    sql += `    PRIMARY KEY (${this.sanitizeName(fromEntity.name.toLowerCase() + '_id')}, ${this.sanitizeName(toEntity.name.toLowerCase() + '_id')}),\n`;
                    sql += `    FOREIGN KEY (${this.sanitizeName(fromEntity.name.toLowerCase() + '_id')}) REFERENCES ${this.sanitizeName(fromEntity.name)}(${this.sanitizeName(fromPK.name)}),\n`;
                    sql += `    FOREIGN KEY (${this.sanitizeName(toEntity.name.toLowerCase() + '_id')}) REFERENCES ${this.sanitizeName(toEntity.name)}(${this.sanitizeName(toPK.name)})\n`;
                    sql += ');\n\n';
                }
            }
        });

        return sql;
    }

    sanitizeName(name) {
        // Remove spaces and special characters, convert to lowercase
        return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
