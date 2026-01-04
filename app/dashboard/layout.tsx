import SideNav from '@/app/ui/dashboard/sidenav';
import Breadcrumbs from '@/app/ui/breadcrumbs';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-gray-50">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow md:overflow-y-auto md:p-6">
        <Breadcrumbs />
        <div className="animate-fadeIn">
          {children}
        </div>
      </div>
    </div>
  );
}