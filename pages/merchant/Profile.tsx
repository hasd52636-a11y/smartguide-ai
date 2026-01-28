
import React from 'react';
import Layout from '../../components/Layout.tsx';
import { useStore } from '../../store.ts';

const Profile: React.FC = () => {
  const { t, auth } = useStore();

  return (
    <Layout title={t.profile}>
      <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Account Information</h3>
            <p className="text-gray-500 text-sm">You are currently logged in to the testing environment.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-8">
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">User Identity</label>
              <p className="text-gray-900 font-semibold">{auth.phone || 'Administrator'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Role</label>
              <p className="text-gray-900 font-semibold">Master Merchant</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
            <p className="text-blue-700 text-sm font-medium">
              Authentication and password management are simplified for this MVP version. 
              Full multi-tenant security will be enabled in the Production (V2.0) release.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
