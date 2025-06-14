import { HubConnectionBuilder } from '@microsoft/signalr';
import { message, Table } from 'antd';
import { useEffect, useState } from 'react';
import { UserAction } from '../types';
import { createRoot } from 'react-dom/client';

const Dashboard = () => {
  const [logs, setLogs] = useState<UserAction[]>([]);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('http://localhost:5000/logHub')
      .build();

    connection
      .start()
      .then(() => connection.invoke('JoinAdminGroup'))
      .catch(console.error);

    connection.on('NewAction', (action: UserAction) => {
      setLogs((prev) => [
        {
          ...action,
          timestamp: new Date(action.timestamp).toLocaleString(),
        },
        ...prev,
      ]);
      message.info('Новое действие зарегистрировано');
    });

    return () => {
      connection.stop();
    };
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <h1>Админ-панель</h1>
      <Table
        dataSource={logs}
        columns={[
          { title: 'User ID', dataIndex: 'userId', key: 'userId' },
          { title: 'Action', dataIndex: 'action', key: 'action' },
          {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (ts: string) => new Date(ts).toLocaleString(),
          },
        ]}
        rowKey="id"
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Dashboard />);
