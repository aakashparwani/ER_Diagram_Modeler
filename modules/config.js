// Configuration module for API key management

const CONFIG_KEY = 'er_diagram_config';

export class Config {
    constructor() {
        this.apiKey = '';
        this.model = 'claude-sonnet-4-20250514';
        this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(CONFIG_KEY);
            if (stored) {
                const config = JSON.parse(stored);
                this.apiKey = config.apiKey || '';
                this.model = config.model || 'claude-sonnet-4-20250514';
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    save() {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify({
                apiKey: this.apiKey,
                model: this.model
            }));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    hasApiKey() {
        return this.apiKey && this.apiKey.length > 0;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.save();
    }

    setModel(model) {
        this.model = model;
        this.save();
    }

    getApiKey() {
        return this.apiKey;
    }

    getModel() {
        return this.model;
    }
}

export const config = new Config();
