
import React from 'react';
import AdminComponent from '@/components/admin/Admin';
import { useIsMobile } from '@/hooks/use-mobile';

const Admin: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'px-2 py-1' : 'px-4 py-2'}`}>
      <AdminComponent />
    </div>
  );
};

export default Admin;
