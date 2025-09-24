import React from 'react';
import { CopartAction } from '../types';

interface CopartActionsTableProps {
  actions: CopartAction[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const CopartActionsTable: React.FC<CopartActionsTableProps> = ({
  actions,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  if (loading) {
    return <div className="loading-indicator">Загрузка событий...</div>;
  }

  return (
    <div className="actions-table">
      <table className="table m-3">
        <thead className="thead-light">
          <tr>
            <th>Пользовательский ID</th>
            <th>Время</th>
            <th>Событие</th>
            <th>Номер лота</th>
            <th>Детали</th>
          </tr>
        </thead>
        <tbody>
          {actions && actions.length === 0 ? (
            <tr>
              <td colSpan={5} className="no-data">
                Нет сбоытий
              </td>
            </tr>
          ) : ( actions &&
            actions.map((action) => {
              const details = parseDetails(action.details);
              return (
                <tr key={action.id}>
                  <td>{action.userId}</td>
                  <td>{new Date(action.actionTime).toLocaleString()}</td>
                  <td>
                    <span
                      className={`action-badge ${action.actionType.toLowerCase()}`}
                    >
                      {action.actionType}
                    </span>
                  </td>
                  <td>{action.lotNumber || 'N/A'}</td>
                  <td className="details-cell">
                    <div className="details-summary">
                      {Object.entries(details).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Предыдущая
          </button>

          <span>
            Страница {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Следующая
          </button>
        </div>
      )}
    </div>
  );
};

export default CopartActionsTable;
