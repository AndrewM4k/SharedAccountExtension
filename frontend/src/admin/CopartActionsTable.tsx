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
    return <div className="loading-indicator">Loading actions...</div>;
  }

  return (
    <div className="actions-table">
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Time</th>
            <th>Action</th>
            <th>Lot Number</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 ? (
            <tr>
              <td colSpan={5} className="no-data">
                No actions found
              </td>
            </tr>
          ) : (
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
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CopartActionsTable;
