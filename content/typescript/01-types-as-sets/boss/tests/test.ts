import { eq, raises, run, test } from './spec.ts';
import { can, minimumRole, missingPermissions, permissionsOf, sharedPermissions } from './access.ts';

test('permissionsOf', () => {
  eq(permissionsOf('viewer'), ['read'], "permissionsOf('viewer')");
  eq(permissionsOf('admin'), ['read', 'write', 'delete', 'invite'], "permissionsOf('admin')");
});

test('can', () => {
  eq(can('viewer', 'read'), true, "can('viewer', 'read')");
  eq(can('viewer', 'write'), false, "can('viewer', 'write')");
  eq(can('editor', 'write'), true, "can('editor', 'write')");
  eq(can('editor', 'delete'), false, "can('editor', 'delete')");
  eq(can('admin', 'invite'), true, "can('admin', 'invite')");
});

test('minimumRole', () => {
  eq(minimumRole('read'), 'viewer', "minimumRole('read')");
  eq(minimumRole('write'), 'editor', "minimumRole('write')");
  eq(minimumRole('delete'), 'admin', "minimumRole('delete')");
});

test('sharedPermissions : intersection', () => {
  eq(sharedPermissions('viewer', 'editor'), ['read'], 'viewer ∩ editor');
  eq(sharedPermissions('admin', 'editor'), ['read', 'write'], 'admin ∩ editor');
  eq(sharedPermissions('editor', 'editor'), ['read', 'write'], 'editor ∩ editor');
});

test('missingPermissions : différence', () => {
  eq(missingPermissions('viewer'), ['write', 'delete', 'invite'], 'manque au viewer');
  eq(missingPermissions('editor'), ['delete', 'invite'], 'manque à l’editor');
  eq(missingPermissions('admin'), [], 'rien ne manque à l’admin');
});

await run();
