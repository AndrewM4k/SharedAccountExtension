import React, { useEffect, useState } from 'react';
import CopartActionsTable from './CopartActionsTable';
import ActionFilters from './ActionFilters';
import { ApiResponse, CopartAction } from '../types';
import './Dashboard.css';
import { createRoot } from 'react-dom/client';
import * as apiService from '.././apiService';

const Dashboard: React.FC = () => {
  const [actions, setActions] = useState<CopartAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    actionType: '',
    search: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  const fetchActions = async () => {
    setLoading(true);
    
    const accessTokenResponse = await apiService.check();
    console.log("accessTokenResponse: ", accessTokenResponse);

    if (accessTokenResponse.status !== 200) {
      const refreshResponse = await apiService.refreshToken();
      console.log("refreshResponse: ", refreshResponse);
      if (refreshResponse.status !== 200) {
        throw new Error('Refresh failed');
      }
      // 3. Повторно проверяем после обновления
      const accessTokenResponse = await apiService.check();
      console.log("accessTokenResponse: ", accessTokenResponse);
      
      if (accessTokenResponse.status !== 200) {
        throw new Error('Still not authenticated after refresh');
      }
    }

    try {
      // const token = localStorage.getItem('token');
      // const query = new URLSearchParams({
      //   page: filters.page.toString(),
      //   pageSize: filters.pageSize.toString(),
      //   ...(filters.actionType && { actionType: filters.actionType }),
      //   ...(filters.search && { search: filters.search }),
      // }).toString();

      // const response = await fetch(
      //   `https://localhost:5001/api/actions?${query}`,
      //   {
      //     headers: {
      //       Authorization: `Bearer ${token}`,
      //     },
      //   }
      // );

      const response = await apiService.getActions({
        page: filters.page,
        pageSize: filters.pageSize,
        actionType: filters.actionType || undefined,
        search: filters.search || undefined,
        userId: filters.userId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      if (response.status !== 200) throw new Error('Failed to fetch actions');

      console.log("response.data ", response.data);

      setActions(response.data.data || []);
      setTotalCount(response.data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="dashboard-container">
      <h1>Пользовательские действия</h1>

      <ActionFilters filters={filters} onFilterChange={handleFilterChange} />

      <CopartActionsTable
        actions={actions}
        loading={loading}
        totalCount={totalCount}
        currentPage={filters.page}
        pageSize={filters.pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Dashboard;

const root = createRoot(document.getElementById('root')!);
root.render(<Dashboard />);
