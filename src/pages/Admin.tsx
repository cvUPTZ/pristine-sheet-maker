
import React from 'react';
import AdminComponent from '@/components/admin/Admin';
import { useIsMobile } from '@/hooks/use-mobile';

const Admin: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'px-1 py-1' : 'px-2 sm:px-4 py-2'}`}>
      <div className="max-w-7xl mx-auto">
        <AdminComponent />
      </div>
    </div>
  );
};

export default Admin;
