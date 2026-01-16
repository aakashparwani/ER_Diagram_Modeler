// Claude Vision API integration for parsing ER diagrams from images

import { config } from './config.js';
import { Diagram, Entity, Attribute, Relationship } from '../models/diagram.js';

export class Parser {
    constructor() {
        // Use local proxy server to avoid CORS issues
        this.apiEndpoint = 'http://localhost:8001/v1/messages';
        this.apiVersion = '2023-06-01';
    }

    async parseImage(imageData) {
        if (!config.hasApiKey()) {
            throw new Error('Claude API key not configured. Please set it in Settings.');
        }

        // Convert image to base64 if needed
        const base64Image = this.getBase64FromDataURL(imageData);
        const mediaType = this.getMediaTypeFromDataURL(imageData);

        const prompt = this.buildPrompt();

        try {
            const response = await this.callClaude(base64Image, mediaType, prompt);
            const diagram = this.parseDiagramFromResponse(response);
            return diagram;
        } catch (error) {
            console.error('Error parsing image:', error);
            throw error;
        }
    }

    buildPrompt() {
        return `You are an expert at analyzing Entity-Relationship (ER) diagrams. Please analyze the provided image of an ER diagram and extract all entities, their attributes, and relationships.

Return your response as a JSON object with the following structure:
{
  "entities": [
    {
      "name": "EntityName",
      "attributes": [
        {
          "name": "attributeName",
          "dataType": "VARCHAR|INTEGER|BOOLEAN|DATE|TEXT|etc",
          "isPrimaryKey": true/false,
          "isForeignKey": true/false
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "EntityName1",
      "to": "EntityName2",
      "type": "one-to-one|one-to-many|many-to-one|many-to-many",
      "name": "optional relationship name"
    }
  ]
}

Guidelines:
- Extract all visible entities (rectangles/boxes with entity names)
- For each entity, list all attributes shown
- Identify primary keys (usually underlined or marked with PK)
- Identify foreign keys (usually marked with FK or reference relationships)
- Determine data types from context or use sensible defaults
- Extract all relationships (lines connecting entities)
- Determine cardinality from symbols: 1 for one, many for crow's foot/multiple lines
- Be precise and include all visible elements

Return ONLY the JSON object, no additional text or explanation.`;
    }

    async callClaude(base64Image, mediaType, prompt) {
        const requestBody = {
            model: config.getModel(),
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }
            ]
        };

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.getApiKey(),
                    'anthropic-version': this.apiVersion
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMessage = `Claude API error (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                    console.error('Claude API error details:', errorData);
                } catch (e) {
                    const errorText = await response.text();
                    console.error('Claude API error text:', errorText);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Claude API response:', data);
            return data.content[0].text;
        } catch (error) {
            console.error('Fetch error:', error);

            // Check for CORS or network errors
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                throw new Error('Unable to connect to Claude API. This may be due to browser CORS restrictions. Consider using a backend proxy or browser extension to bypass CORS.');
            }

            throw error;
        }
    }

    parseDiagramFromResponse(responseText) {
        try {
            const jsonText = this.extractJSON(responseText);
            const data = JSON.parse(jsonText);

            if (!data.entities || !Array.isArray(data.entities)) {
                throw new Error('Response JSON missing entities array');
            }

            const diagram = new Diagram('Parsed Diagram');
            const entityMap = new Map();

            // Create entities
            data.entities.forEach((entityData, index) => {
                // Position entities in a grid layout
                const cols = 3;
                const x = 100 + (index % cols) * 300;
                const y = 100 + Math.floor(index / cols) * 250;

                const entity = new Entity(null, entityData.name, x, y);

                // Add attributes
                if (entityData.attributes && Array.isArray(entityData.attributes)) {
                    entityData.attributes.forEach(attrData => {
                        const attribute = new Attribute(
                            attrData.name,
                            attrData.dataType || 'VARCHAR',
                            attrData.isPrimaryKey || false,
                            attrData.isForeignKey || false
                        );
                        entity.addAttribute(attribute);
                    });
                }

                diagram.addEntity(entity);
                entityMap.set(entityData.name, entity.id);
            });

            // Create relationships
            if (data.relationships && Array.isArray(data.relationships)) {
                data.relationships.forEach(relData => {
                    const fromId = entityMap.get(relData.from);
                    const toId = entityMap.get(relData.to);

                    if (fromId && toId) {
                        const relationship = new Relationship(
                            null,
                            fromId,
                            toId,
                            relData.type || 'one-to-many',
                            relData.name || ''
                        );
                        diagram.addRelationship(relationship);
                    }
                });
            }

            return diagram;
        } catch (error) {
            console.error('Error parsing diagram response:', error);
            console.log('Original response text:', responseText);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    extractJSON(text) {
        // Try to find the start and end of the JSON object
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1 || end < start) {
            throw new Error('No JSON object found in response');
        }

        // Extract just the part that looks like JSON
        let jsonPart = text.substring(start, end + 1);

        // Basic cleanup: remove common markdown fence markers if they ended up inside the substring
        jsonPart = jsonPart.replace(/^```json\s*/, '').replace(/```$/, '');

        return jsonPart;
    }

    getBase64FromDataURL(dataURL) {
        // If it's already base64, extract it
        if (dataURL.startsWith('data:')) {
            return dataURL.split(',')[1];
        }
        return dataURL;
    }

    getMediaTypeFromDataURL(dataURL) {
        // Extract media type from data URL
        if (dataURL.startsWith('data:')) {
            const match = dataURL.match(/^data:([^;]+);/);
            if (match) {
                return match[1];
            }
        }
        // Default to jpeg
        return 'image/jpeg';
    }
}

export const parser = new Parser();
