import { useState } from 'react';
import { Button, Input, message } from 'antd';
import axios from 'axios';
import { createRoot } from 'react-dom/client';

const Popup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email: username, password: password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('responce: ', res);
      // Сохраняем токен
      await chrome.storage.local.set({ token: res.data.token });

      // Проверяем запись
      const data = await chrome.storage.local.get('token');
      console.log('Stored token:', data.token);

      message.success('Login successful!');
    } catch (error) {
      message.error('Login failed');
    }
  };

  return (
    <div style={{ width: 300, padding: 16 }}>
      <Input
        style={{ margin: 5 }}
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input.Password
        style={{ margin: 5 }}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button style={{ margin: 5 }} onClick={handleLogin} type="primary">
        Login
      </Button>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
