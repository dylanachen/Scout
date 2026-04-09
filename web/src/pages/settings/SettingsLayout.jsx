import { Outlet } from 'react-router-dom';

export default function SettingsLayout() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Outlet />
    </div>
  );
}
