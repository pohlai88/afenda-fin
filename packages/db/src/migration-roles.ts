/** Roles created and owned by AFENDA migrations — never the bootstrap identity. */
export const MANAGED_MIGRATION_ROLES = ['afenda_migrator', 'afenda_app'] as const;

export const MIGRATOR_ROLE = 'afenda_migrator';
export const APP_ROLE = 'afenda_app';
