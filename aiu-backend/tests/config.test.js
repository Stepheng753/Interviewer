const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Model Configuration File Validation Tests', () => {


  it('should locate and successfully parse model_config.yaml', () => {
    const configPath = path.join(__dirname, '../model_config.yaml');
    expect(fs.existsSync(configPath)).toBe(true);

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);

    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('generationConfig');
    expect(config.generationConfig).toHaveProperty('responseModalities');

    expect(config).toHaveProperty('categories');
    expect(config.categories).toHaveProperty('career');
    expect(config.categories.career).toHaveProperty('voiceName');
    expect(config.categories).toHaveProperty('life_advice');
    expect(config.categories.life_advice).toHaveProperty('voiceName');
    expect(config.categories).toHaveProperty('family');
    expect(config.categories.family).toHaveProperty('voiceName');
    expect(config.categories).toHaveProperty('health');
    expect(config.categories.health).toHaveProperty('voiceName');

    expect(config).toHaveProperty('sessionPrompts');
    expect(config.sessionPrompts).toHaveProperty('resume');
    expect(config.sessionPrompts).toHaveProperty('returningUser');
    expect(config.sessionPrompts).toHaveProperty('newUser');
  });
});
