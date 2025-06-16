import React, { useEffect, useState } from 'react';
import CopartActionsTable from './CopartActionsTable';
import ActionFilters from './ActionFilters';
import { ApiResponse, CopartAction } from '../types';

const Dashboard: React.FC = () => {
  const [actions, setActions] = useState<CopartAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    actionType: '',
    search: '',
  });

  const fetchActions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({
        page: filters.page.toString(),
        pageSize: filters.pageSize.toString(),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.search && { search: filters.search }),
      }).toString();

      const response = await fetch(
        `http://localhost:5000/api/actions?${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch actions');

      const data: ApiResponse<CopartAction[]> = await response.json();
      setActions(data.data);
      setTotalCount(data.totalCount);
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
      <h1>Copart Actions Monitor</h1>

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
