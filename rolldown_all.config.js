import { defineConfig } from 'rolldown'
import content_config from './rolldown.config.js';
import options_config from './rolldown_options.config.js';
import serviceworker_config from './rolldown_service.config.js';
import blank_config from './rolldown_blank.config.js';
import hours_settings_config from './rolldown_hours_setup.config.js';

// noinspection JSUnusedGlobalSymbols
export default defineConfig([
    content_config,
    options_config,
    serviceworker_config,
    blank_config,
    hours_settings_config
])