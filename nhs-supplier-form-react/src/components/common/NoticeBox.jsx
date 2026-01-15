/**
 * NoticeBox Component
 * Informational notice boxes with different types
 */

import React from 'react';
import clsx from 'clsx';

const NoticeBox = ({
  type = 'info', // 'info' | 'warning' | 'error' | 'success'
  children,
  className,
  ...props
}) => {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  };

  return (
    <div
      className={clsx('notice-box', `notice-box--${type}`, className)}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <span style={{ marginRight: '8px' }}>{icons[type]}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export default NoticeBox;
