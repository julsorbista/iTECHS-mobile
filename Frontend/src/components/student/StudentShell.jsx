import React from 'react';
import clsx from 'clsx';

const StudentShell = ({
  children,
  backgroundImage,
  className = '',
  style: customStyle,
  bare = false,
}) => {
  const style = {
    ...customStyle,
    ...(backgroundImage
      ? { '--student-shell-image': `url(${backgroundImage})` }
      : {}),
  };

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className={clsx('student-shell page-enter', className)} style={style}>
      <div className="student-shell-glow student-shell-glow-a" aria-hidden="true" />
      <div className="student-shell-glow student-shell-glow-b" aria-hidden="true" />
      <div className="student-shell-gridlines" aria-hidden="true" />
      {children}
    </div>
  );
};

export default StudentShell;
