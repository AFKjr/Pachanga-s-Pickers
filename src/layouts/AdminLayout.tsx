import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/generate', label: 'Generate', icon: '🎲' },
    { path: '/admin/manage', label: 'Manage', icon: '📝' },
    { path: '/admin/results', label: 'Results', icon: '✅' },
    { path: '/admin/team-stats', label: 'Team Stats', icon: '📈' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f0f] border-r border-lime-500/10 min-h-screen">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            <span className="text-lime-400">Admin</span> Panel
          </h2>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20 font-semibold'
                    : 'text-gray-300 hover:bg-lime-500/10 hover:text-lime-400 hover:border-lime-500/20'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-lime-500/10">
          <Link
            to="/"
            className="flex items-center space-x-2 text-gray-400 hover:text-lime-400 transition-colors"
          >
            <span>🏠</span>
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
