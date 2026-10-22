// Shared by the project form and the server that checks it

/** The project types people pick from, as stored and as shown */
export const PROJECT_TYPES = {
	custom_plugin: 'custom plugin',
	custom_server: 'custom server',
	plugin_backend: 'plugin backend',
	other: 'other'
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;

/** Screenshots: optional when creating a project, required to submit one */
export const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
