import React from 'react';

const actionTypes = [
  { value: '', label: 'All Actions' },
  { value: 'BID', label: 'Bids' },
  { value: 'VIEW', label: 'View' },
  { value: 'LOGIN', label: 'Logins' },
];

interface ActionFiltersProps {
  filters: {
    actionType: string;
    search: string;
    pageSize: number;
    userId: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (newFilters: {
    actionType?: string;
    search?: string;
    pageSize?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

const ActionFilters: React.FC<ActionFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  return (
    <div className="action-filters w50">
      <div className="filter-row w100">  
        <div className="filter-group w90">
          <label>Поиск (по имени и действию):</label>
          <input
            className="form-control"
            type="text"
            placeholder="Поиск по имени пользователя или типу действия..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>
      </div>
      <div className="filter-row">  
        <div className="filter-group">
          <label>ID пользователя:</label>
          <input
            className="form-control"
            type="text"
            placeholder="ID пользователя"
            value={filters.userId}
            onChange={(e) => onFilterChange({ userId: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Тип события:</label>
          <select
            className="form-select"
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
          <label>Штук на странице:</label>
          <select
            className="form-select"
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
      <div className="filter-row">
        <div className="filter-group">
          <label>Дата начала:</label>
          <input
            className="form-control"
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Дата окончания:</label>
          <input
            className="form-control"
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

export default ActionFilters;
