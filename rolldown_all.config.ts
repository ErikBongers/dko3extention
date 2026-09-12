import { defineConfig } from 'rolldown'
import content_config from './rolldown.config';
import options_config from './rolldown_options.config';
import serviceworker_config from './rolldown_service.config';
import blank_config from './rolldown_blank.config';
import hours_settings_config from './rolldown_hours_setup.config';
import diff_settings_config from './rolldown_diff_settings.config';

// noinspection JSUnusedGlobalSymbols
export default defineConfig([
    content_config,
    options_config,
    serviceworker_config,
    blank_config,
    hours_settings_config,
    diff_settings_config
])