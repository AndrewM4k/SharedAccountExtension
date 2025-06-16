import React from 'react';
import './Alert.css';
import { AlertProps } from '../types';

const Alert: React.FC<AlertProps> = ({ variant = 'danger', children }) => {
  return <div className={`alert ${variant}`}>{children}</div>;
};

export default Alert;
