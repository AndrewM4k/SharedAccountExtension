import React from 'react';

const actionTypes = [
  { value: '', label: 'All Actions' },
  { value: 'BID', label: 'Bids' },
  { value: 'PURCHASE', label: 'Purchases' },
  { value: 'LOGIN', label: 'Logins' },
  { value: 'LOGOUT', label: 'Logouts' },
];

interface ActionFiltersProps {
  filters: {
    actionType: string;
    search: string;
    pageSize: number;
  };
  onFilterChange: (newFilters: {
    actionType?: string;
    search?: string;
    pageSize?: number;
  }) => void;
}

const ActionFilters: React.FC<ActionFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  return (
    <div className="action-filters">
      <div className="filter-group">
        <label>Action Type:</label>
        <select
          value={filters.actionType}
          onChange={(e) => onFilterChange({ actionType: e.target.value })}
        >
          {actionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Search:</label>
        <input
          type="text"
          placeholder="Search lot or details..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label>Items per page:</label>
        <select
          value={filters.pageSize}
          onChange={(e) => onFilterChange({ pageSize: Number(e.target.value) })}
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  );
};

export default ActionFilters;
