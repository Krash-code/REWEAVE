import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAdminBootstrapConfig } from '../src/config/bootstrap.js';

describe('admin bootstrap config', () => {
  it('uses the default demo admin when no env values are set', () => {
    const config = getAdminBootstrapConfig({});
    assert.equal(config.name, 'REWEAVE Admin');
    assert.equal(config.email, 'admin@reweave.local');
    assert.equal(config.password, 'Admin@1234');
  });

  it('prefers environment overrides when provided', () => {
    const config = getAdminBootstrapConfig({
      ADMIN_NAME: 'Ops Admin',
      ADMIN_EMAIL: 'ops@example.com',
      ADMIN_PASSWORD: 'StrongPass!99'
    });
    assert.equal(config.name, 'Ops Admin');
    assert.equal(config.email, 'ops@example.com');
    assert.equal(config.password, 'StrongPass!99');
  });
});
